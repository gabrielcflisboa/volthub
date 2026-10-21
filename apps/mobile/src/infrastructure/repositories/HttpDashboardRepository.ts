import { Result } from '@/core/types/Result';
import { Invoice } from '@/domain/entities/Invoice';
import { DriverDashboardData, IDashboardRepository } from '@/domain/repositories/IDashboardRepository';
import { Money } from '@/domain/value-objects/Money';
import { apiClient } from '../api/apiClient';

interface InvoiceDto {
  id?: string;
  sessionId?: string;
  chargerId: string;
  energyKwh: number;
  pricePerKwh: number;
  amount: number;
  issuedAt: string;
}

interface DashboardResponseDto {
  user?: { name: string; roles: string[] };
  activeReservation?: {
    id: string;
    chargerId: string;
    stationId: string;
    status: string;
  } | null;
  invoices?: InvoiceDto[];
  degraded?: string[];
}

export class HttpDashboardRepository implements IDashboardRepository {
  async getDriverDashboard(token: string): Promise<Result<DriverDashboardData>> {
    const res = await apiClient.request<DashboardResponseDto>('/api/v1/dashboard', {
      token,
      timeoutMs: 4000,
    });

    if (!res.ok) return res;

    try {
      const dto = res.value;
      const invoices = (dto.invoices ?? []).map(
        (inv, idx) =>
          new Invoice({
            id: inv.id ?? inv.sessionId ?? `inv-${idx}`,
            sessionId: inv.sessionId ?? `sess-${idx}`,
            chargerId: inv.chargerId,
            energyKwh: Number(inv.energyKwh ?? 0),
            pricePerKwh: new Money(Number(inv.pricePerKwh ?? 0)),
            amount: new Money(Number(inv.amount ?? 0)),
            issuedAt: inv.issuedAt ?? new Date().toISOString(),
          })
      );

      return Result.ok({
        userName: dto.user?.name ?? 'Motorista',
        invoices,
        degradedServices: dto.degraded ?? [],
        activeReservation: dto.activeReservation ?? null,
      });
    } catch (err) {
      return Result.err(err as Error);
    }
  }
}
