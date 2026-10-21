import { Result } from '@/core/types/Result';

export interface ActiveReservation {
  id: string;
  chargerId: string;
  status: string;
}

export interface IReservationRepository {
  create(chargerId: string, token: string): Promise<Result<{ id: string }>>;
  findActive(token: string): Promise<Result<ActiveReservation | null>>;
  cancel(reservationId: string, token: string): Promise<Result<void>>;
  start(reservationId: string, token: string): Promise<Result<void>>;
}
