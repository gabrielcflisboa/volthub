import { Result } from '@/core/types/Result';
import { Station } from '../entities/Station';

export interface StationQueryFilter {
  connector?: string;
  status?: string;
  fastOnly?: boolean;
  q?: string;
  token?: string;
}

export interface IStationRepository {
  readonly lastSource?: 'API' | 'FALLBACK';
  getAllStations(filter?: StationQueryFilter): Promise<Result<Station[]>>;
  getStationById(id: string, token?: string): Promise<Result<Station>>;
}
