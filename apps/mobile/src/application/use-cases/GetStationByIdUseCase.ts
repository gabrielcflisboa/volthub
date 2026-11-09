import { Result } from '@/core/types/Result';
import { Station } from '@/domain/entities/Station';
import { IStationRepository } from '@/domain/repositories/IStationRepository';

export class GetStationByIdUseCase {
  constructor(private readonly stationRepository: IStationRepository) {}

  async execute(id: string): Promise<Result<Station>> {
    return this.stationRepository.getStationById(id);
  }
}
