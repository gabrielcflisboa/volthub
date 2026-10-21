import { Result } from '@/core/types/Result';
import { ActiveReservation, IReservationRepository } from '@/domain/repositories/IReservationRepository';
import { apiClient } from '../api/apiClient';

export class HttpReservationRepository implements IReservationRepository {
  create(chargerId: string, token: string): Promise<Result<{ id: string }>> {
    return apiClient.request<{ id: string }>('/api/v1/reservations', {
      method: 'POST',
      token,
      body: { chargerId },
      timeoutMs: 3000,
    });
  }

  async findActive(token: string): Promise<Result<ActiveReservation | null>> {
    const res = await apiClient.request<{ activeReservation?: ActiveReservation | null }>(
      '/api/v1/dashboard',
      { token, timeoutMs: 3000 }
    );
    if (!res.ok) return res;
    return Result.ok(res.value?.activeReservation ?? null);
  }

  async cancel(reservationId: string, token: string): Promise<Result<void>> {
    const res = await apiClient.request(`/api/v1/reservations/${encodeURIComponent(reservationId)}/cancel`, {
      method: 'POST',
      token,
      timeoutMs: 3000,
    });
    return res.ok ? Result.ok(undefined) : res;
  }

  async start(reservationId: string, token: string): Promise<Result<void>> {
    const res = await apiClient.request(`/api/v1/reservations/${encodeURIComponent(reservationId)}/start`, {
      method: 'POST',
      token,
      timeoutMs: 3000,
    });
    return res.ok ? Result.ok(undefined) : res;
  }
}
