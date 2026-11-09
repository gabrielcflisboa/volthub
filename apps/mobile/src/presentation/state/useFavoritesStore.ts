import { create } from 'zustand';
import { LocalStorageFavoritesRepository } from '@/infrastructure/repositories/LocalStorageFavoritesRepository';
import { ToggleFavoriteStationUseCase } from '@/application/use-cases/ToggleFavoriteStationUseCase';
import { GetFavoriteStationIdsUseCase } from '@/application/use-cases/GetFavoriteStationIdsUseCase';

const favoritesRepository = new LocalStorageFavoritesRepository();
const toggleFavoriteUseCase = new ToggleFavoriteStationUseCase(favoritesRepository);
const getFavoriteIdsUseCase = new GetFavoriteStationIdsUseCase(favoritesRepository);

interface FavoritesState {
  favoriteIds: Set<string>;
  loading: boolean;

  // Actions
  loadFavorites: () => Promise<void>;
  toggleFavorite: (stationId: string) => Promise<boolean>;
  isFavorite: (stationId: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favoriteIds: new Set(),
  loading: false,

  loadFavorites: async () => {
    set({ loading: true });
    const res = await getFavoriteIdsUseCase.execute();
    if (res.ok) {
      set({ favoriteIds: new Set(res.value), loading: false });
    } else {
      set({ loading: false });
    }
  },

  toggleFavorite: async (stationId: string) => {
    const res = await toggleFavoriteUseCase.execute(stationId);
    if (res.ok) {
      const isFav = res.value;
      const current = new Set(get().favoriteIds);
      if (isFav) {
        current.add(stationId);
      } else {
        current.delete(stationId);
      }
      set({ favoriteIds: current });
      return isFav;
    }
    return get().isFavorite(stationId);
  },

  isFavorite: (stationId: string) => {
    return get().favoriteIds.has(stationId);
  },
}));
