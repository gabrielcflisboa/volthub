import { Result } from '@/core/types/Result';
import { IFavoritesRepository } from '@/domain/repositories/IFavoritesRepository';

export class ToggleFavoriteStationUseCase {
  constructor(private readonly favoritesRepository: IFavoritesRepository) {}

  async execute(stationId: string): Promise<Result<boolean>> {
    const isFavResult = await this.favoritesRepository.isFavorite(stationId);
    if (!isFavResult.ok) return isFavResult;

    const currentlyFavorite = isFavResult.value;
    if (currentlyFavorite) {
      const removeResult = await this.favoritesRepository.removeFavorite(stationId);
      if (!removeResult.ok) return removeResult;
      return Result.ok(false);
    } else {
      const addResult = await this.favoritesRepository.addFavorite(stationId);
      if (!addResult.ok) return addResult;
      return Result.ok(true);
    }
  }
}
