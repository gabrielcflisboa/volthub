import { Result } from '@/core/types/Result';
import { Station } from '@/domain/entities/Station';
import { IStationRepository, StationQueryFilter } from '@/domain/repositories/IStationRepository';

export class GetStationsUseCase {
  constructor(private readonly stationRepository: IStationRepository) {}

  async execute(filter?: StationQueryFilter): Promise<Result<Station[]>> {
    return this.stationRepository.getAllStations(filter);
  }
}
