import CircuitBreaker from 'opossum';

/**
 * Cliente HTTP resiliente para os serviços internos:
 *  - Timeout em toda chamada
 *  - Retry com backoff exponencial SOMENTE em GET (idempotente). POST nunca é repetido:
 *    se a 1ª tentativa criou a reserva e a resposta se perdeu, repetir criaria outra.
 *  - Circuit Breaker por serviço: depois de muitas falhas, para de tentar e falha na hora.
 */
export class UpstreamError extends Error {
  constructor(
    public readonly service: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`${service} respondeu ${status}`);
  }
}

export class ServiceUnavailableError extends Error {
  constructor(public readonly service: string, reason: string) {
    super(`${service} indisponível: ${reason}`);
  }
}

interface CallOptions {
  method?: 'GET' | 'POST' | 'PUT';
  path: string;
  token?: string;
  body?: unknown;
}

export class Downstream {
  readonly breaker: CircuitBreaker<[CallOptions], unknown>;

  constructor(
    public readonly name: string,
    private readonly baseUrl: string,
    private readonly timeoutMs = 2500,
  ) {
    this.breaker = new CircuitBreaker((o: CallOptions) => this.attempt(o), {
      timeout: false, // o timeout é por tentativa, no fetch
      errorThresholdPercentage: 50,
      volumeThreshold: 5,
      resetTimeout: 15_000,
      // Erro 4xx é resposta legítima do serviço (ex.: 409 regra de negócio), não sinal de que ele está doente.
      errorFilter: (err: unknown) => err instanceof UpstreamError && err.status < 500,
    });
  }

  async call<T>(o: CallOptions): Promise<T> {
    try {
      return (await this.breaker.fire(o)) as T;
    } catch (err) {
      if (err instanceof UpstreamError) throw err;
      if (this.breaker.opened) throw new ServiceUnavailableError(this.name, 'circuito aberto');
      throw new ServiceUnavailableError(this.name, (err as Error).message);
    }
  }

  private async attempt(o: CallOptions): Promise<unknown> {
    const method = o.method ?? 'GET';
    const maxAttempts = method === 'GET' ? 3 : 1;
    let lastErr: unknown;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await fetch(this.baseUrl + o.path, {
          method,
          headers: {
            ...(o.token ? { authorization: `Bearer ${o.token}` } : {}),
            ...(o.body !== undefined ? { 'content-type': 'application/json' } : {}),
          },
          body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        const text = await res.text();
        const parsed = text ? safeJson(text) : null;
        if (!res.ok) {
          const err = new UpstreamError(this.name, res.status, parsed);
          if (res.status < 500) throw err; // 4xx: não adianta repetir
          lastErr = err;
        } else {
          return parsed;
        }
      } catch (err) {
        if (err instanceof UpstreamError && err.status < 500) throw err;
        lastErr = err;
      }
      if (i < maxAttempts - 1) await new Promise((r) => setTimeout(r, 150 * 2 ** i));
    }
    throw lastErr;
  }

  state() {
    return { service: this.name, state: this.breaker.opened ? 'OPEN' : this.breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED', stats: { failures: this.breaker.stats.failures, successes: this.breaker.stats.successes, rejects: this.breaker.stats.rejects } };
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
