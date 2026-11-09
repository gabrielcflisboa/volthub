import { Result } from '@/core/types/Result';
import { IFavoritesRepository } from '@/domain/repositories/IFavoritesRepository';
import { storage } from '../storage/storage';

const FAVORITES_KEY = '@volthub/favorite_stations_v1';

export class LocalStorageFavoritesRepository implements IFavoritesRepository {
  async getFavoriteIds(): Promise<Result<string[]>> {
    const res = await storage.getItem<string[]>(FAVORITES_KEY);
    if (!res.ok) return res;
    return Result.ok(res.value ?? []);
  }

  async addFavorite(stationId: string): Promise<Result<void>> {
    const currentRes = await this.getFavoriteIds();
    if (!currentRes.ok) return currentRes;

    const set = new Set(currentRes.value);
    set.add(stationId);
    return storage.setItem(FAVORITES_KEY, Array.from(set));
  }

  async removeFavorite(stationId: string): Promise<Result<void>> {
    const currentRes = await this.getFavoriteIds();
    if (!currentRes.ok) return currentRes;

    const set = new Set(currentRes.value);
    set.delete(stationId);
    return storage.setItem(FAVORITES_KEY, Array.from(set));
  }

  async isFavorite(stationId: string): Promise<Result<boolean>> {
    const currentRes = await this.getFavoriteIds();
    if (!currentRes.ok) return currentRes;
    return Result.ok(currentRes.value.includes(stationId));
  }
}
