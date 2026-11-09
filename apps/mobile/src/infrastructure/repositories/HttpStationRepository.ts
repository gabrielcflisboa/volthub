import { Result } from '@/core/types/Result';
import { NotFoundError } from '@/core/errors/AppError';
import { Station } from '@/domain/entities/Station';
import { IStationRepository, StationQueryFilter } from '@/domain/repositories/IStationRepository';
import { apiClient } from '../api/apiClient';
import { StationDto } from '../api/dtos/StationDto';
import { FALLBACK_STATIONS_SEED } from '../api/FallbackStationsSeed';
import { StationMapper } from '../mappers/StationMapper';

export class HttpStationRepository implements IStationRepository {
  lastSource: 'API' | 'FALLBACK' = 'API';

  async getAllStations(filter?: StationQueryFilter): Promise<Result<Station[]>> {
    const params = new URLSearchParams();
    if (filter?.connector) params.set('connector', filter.connector);
    if (filter?.status) params.set('status', filter.status);
    if (filter?.fastOnly) params.set('fastOnly', 'true');
    if (filter?.q) params.set('q', filter.q);

    const qs = params.toString();
    const path = qs ? `/api/v1/stations?${qs}` : '/api/v1/stations';

    const res = await apiClient.request<StationDto[]>(path, {
      timeoutMs: 3500,
      token: filter?.token,
    });
    if (res.ok) {
      try {
        this.lastSource = 'API';
        const stations = res.value.map(StationMapper.toDomain);
        return Result.ok(stations);
      } catch (err) {
        return Result.err(err as Error);
      }
    }

    // Degradação graciosa: se o BFF não estiver rodando localmente, usa o seed das 10 estações de BH
    try {
      this.lastSource = 'FALLBACK';
      const fallbackStations = FALLBACK_STATIONS_SEED.map(StationMapper.toDomain);
      return Result.ok(fallbackStations);
    } catch (err) {
      return Result.err(err as Error);
    }
  }

  async getStationById(id: string, token?: string): Promise<Result<Station>> {
    const res = await apiClient.request<StationDto>(`/api/v1/stations/${encodeURIComponent(id)}`, {
      timeoutMs: 3500,
      token,
    });
    if (res.ok) {
      try {
        this.lastSource = 'API';
        const station = StationMapper.toDomain(res.value);
        return Result.ok(station);
      } catch (err) {
        return Result.err(err as Error);
      }
    }

    const found = FALLBACK_STATIONS_SEED.find((s) => s.id === id);
    if (found) {
      this.lastSource = 'FALLBACK';
      return Result.ok(StationMapper.toDomain(found));
    }
    return Result.err(new NotFoundError(`Estação ${id} não encontrada`));
  }
}
