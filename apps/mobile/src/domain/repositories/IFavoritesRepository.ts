import { Result } from '@/core/types/Result';

export interface IFavoritesRepository {
  getFavoriteIds(): Promise<Result<string[]>>;
  addFavorite(stationId: string): Promise<Result<void>>;
  removeFavorite(stationId: string): Promise<Result<void>>;
  isFavorite(stationId: string): Promise<Result<boolean>>;
}
