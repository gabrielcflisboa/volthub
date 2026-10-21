import { IReservationRepository } from '@/domain/repositories/IReservationRepository';

export class OpenChargingSessionUseCase {
  constructor(private readonly reservationRepository: IReservationRepository) {}

  /**
   * Cria (ou reaproveita) a reserva do carregador e inicia a sessão.
   * `isCancelled` é consultado após cada chamada de rede: se o motorista parou a recarga
   * nesse meio-tempo, a reserva recém-criada é cancelada para não ficar órfã no backend.
   * Retorna o id da reserva, ou null se não foi possível abrir (ou foi cancelada).
   */
  async execute(
    chargerId: string,
    token: string,
    isCancelled: () => boolean = () => false
  ): Promise<string | null> {
    let created = await this.reservationRepository.create(chargerId, token);

    // Se deu 409 Conflict (ex.: motorista já tinha uma reserva ativa anterior), limpa ou reaproveita a reserva ativa
    if (!created.ok) {
      if (isCancelled()) return null;
      const active = await this.reservationRepository.findActive(token);
      const reservation = active.ok ? active.value : null;
      if (reservation) {
        if (reservation.chargerId === chargerId) {
          created = { ok: true, value: { id: reservation.id } };
        } else if (reservation.status === 'CONFIRMED') {
          await this.reservationRepository.cancel(reservation.id, token);
          if (isCancelled()) return null;
          created = await this.reservationRepository.create(chargerId, token);
        }
      }
    }

    if (!created.ok || !created.value?.id) return null;
    const reservationId = created.value.id;

    if (isCancelled()) {
      await this.reservationRepository.cancel(reservationId, token);
      return null;
    }

    await this.reservationRepository.start(reservationId, token);

    if (isCancelled()) {
      await this.reservationRepository.cancel(reservationId, token);
      return null;
    }

    return reservationId;
  }
}
