import type { TariffProvider } from '../application/ports.js';

/**
 * Busca a tarifa no station-service usando OAuth2 Client Credentials (M2M).
 * client_id/secret vêm de variável de ambiente; o token é guardado em memória até perto de vencer.
 */
export class StationTariffClient implements TariffProvider {
  private token: string | null = null;
  private expiresAt = 0;
  private readonly cache = new Map<string, { stationId: string; pricePerKwh: number; at: number }>();

  constructor(
    private readonly baseUrl: string,
    private readonly tokenUri: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  private async serviceToken(): Promise<string> {
    if (this.token && Date.now() < this.expiresAt - 30_000) return this.token;
    const res = await fetch(this.tokenUri, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`Keycloak recusou client_credentials: ${res.status}`);
    const body = (await res.json()) as { access_token: string; expires_in: number };
    this.token = body.access_token;
    this.expiresAt = Date.now() + body.expires_in * 1000;
    return this.token;
  }

  async tariffFor(chargerId: string): Promise<{ stationId: string; pricePerKwh: number }> {
    let lastError: unknown;
    // Retry com backoff exponencial: GET é idempotente, pode repetir sem efeito colateral.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`${this.baseUrl}/v1/chargers/${encodeURIComponent(chargerId)}`, {
          headers: { authorization: `Bearer ${await this.serviceToken()}` },
          signal: AbortSignal.timeout(2000),
        });
        if (!res.ok) throw new Error(`station-service respondeu ${res.status}`);
        const body = (await res.json()) as { stationId: string; pricePerKwh: number };
        const tariff = { stationId: body.stationId, pricePerKwh: Number(body.pricePerKwh) };
        this.cache.set(chargerId, { ...tariff, at: Date.now() });
        return tariff;
      } catch (e) {
        lastError = e;
        await new Promise((r) => setTimeout(r, 200 * 2 ** attempt));
      }
    }
    // Fallback: última tarifa conhecida (degradação graciosa) — melhor cobrar o preço de minutos atrás do que perder a sessão.
    const cached = this.cache.get(chargerId);
    if (cached) return { stationId: cached.stationId, pricePerKwh: cached.pricePerKwh };
    throw lastError;
  }
}
