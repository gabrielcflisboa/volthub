import { Result } from '@/core/types/Result';
import { IFavoritesRepository } from '@/domain/repositories/IFavoritesRepository';

export class GetFavoriteStationIdsUseCase {
  constructor(private readonly favoritesRepository: IFavoritesRepository) {}

  async execute(): Promise<Result<string[]>> {
    return this.favoritesRepository.getFavoriteIds();
  }
}
