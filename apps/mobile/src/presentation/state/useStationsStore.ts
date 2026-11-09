import { create } from 'zustand';
import { Station } from '@/domain/entities/Station';
import { HttpStationRepository } from '@/infrastructure/repositories/HttpStationRepository';
import { GetStationsUseCase } from '@/application/use-cases/GetStationsUseCase';
import { GetStationByIdUseCase } from '@/application/use-cases/GetStationByIdUseCase';
import { FilterStationsUseCase } from '@/application/use-cases/FilterStationsUseCase';
import { useAuthStore } from './useAuthStore';

const stationRepository = new HttpStationRepository();
const getStationsUseCase = new GetStationsUseCase(stationRepository);
const getStationByIdUseCase = new GetStationByIdUseCase(stationRepository);
const filterStationsUseCase = new FilterStationsUseCase();

interface StationsState {
  stations: Station[];
  filteredStations: Station[];
  selectedStation: Station | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  searchQuery: string;
  activeFilter: 'ALL' | 'AVAILABLE' | 'FAST' | 'CCS2' | 'TYPE2';
  dataSource: 'API' | 'FALLBACK';

  // Actions
  fetchStations: (refresh?: boolean) => Promise<void>;
  fetchStationById: (id: string) => Promise<Station | null>;
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: 'ALL' | 'AVAILABLE' | 'FAST' | 'CCS2' | 'TYPE2') => void;
  setSelectedStation: (station: Station | null) => void;
}

export const useStationsStore = create<StationsState>((set, get) => ({
  stations: [],
  filteredStations: [],
  selectedStation: null,
  loading: false,
  refreshing: false,
  error: null,
  searchQuery: '',
  activeFilter: 'ALL',
  dataSource: 'API',

  fetchStations: async (refresh = false) => {
    set({ loading: !refresh, refreshing: refresh, error: null });
    const token = useAuthStore.getState().user?.token || undefined;
    const res = await getStationsUseCase.execute({ token });
    if (res.ok) {
      const stations = res.value;
      const { searchQuery, activeFilter } = get();
      const filtered = filterStationsUseCase.execute(stations, {
        query: searchQuery,
        onlyAvailable: activeFilter === 'AVAILABLE',
        onlyFast: activeFilter === 'FAST',
        connector: activeFilter === 'CCS2' || activeFilter === 'TYPE2' ? activeFilter : undefined,
      });
      set({
        stations,
        filteredStations: filtered,
        dataSource: stationRepository.lastSource,
        loading: false,
        refreshing: false,
        selectedStation: get().selectedStation ? stations.find(s => s.id === get().selectedStation!.id) ?? stations[0] : stations[0] ?? null,
      });
    } else {
      set({
        loading: false,
        refreshing: false,
        error: res.error.message,
      });
    }
  },

  fetchStationById: async (id: string) => {
    const res = await getStationByIdUseCase.execute(id);
    if (res.ok) {
      set({ selectedStation: res.value });
      return res.value;
    }
    return null;
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    const { stations, activeFilter } = get();
    const filtered = filterStationsUseCase.execute(stations, {
      query,
      onlyAvailable: activeFilter === 'AVAILABLE',
      onlyFast: activeFilter === 'FAST',
      connector: activeFilter === 'CCS2' || activeFilter === 'TYPE2' ? activeFilter : undefined,
    });
    set({ filteredStations: filtered });
  },

  setActiveFilter: (filter) => {
    set({ activeFilter: filter });
    const { stations, searchQuery } = get();
    const filtered = filterStationsUseCase.execute(stations, {
      query: searchQuery,
      onlyAvailable: filter === 'AVAILABLE',
      onlyFast: filter === 'FAST',
      connector: filter === 'CCS2' || filter === 'TYPE2' ? filter : undefined,
    });
    set({ filteredStations: filtered });

    // Refina a lista via parâmetro real da API (Feature 4)
    getStationsUseCase
      .execute({
        status: filter === 'AVAILABLE' ? 'AVAILABLE' : undefined,
        fastOnly: filter === 'FAST' ? true : undefined,
        connector: filter === 'CCS2' || filter === 'TYPE2' ? filter : undefined,
      })
      .then((res) => {
        if (res.ok && get().activeFilter === filter) {
          const apiFiltered = filterStationsUseCase.execute(res.value, {
            query: get().searchQuery,
            onlyAvailable: filter === 'AVAILABLE',
            onlyFast: filter === 'FAST',
            connector: filter === 'CCS2' || filter === 'TYPE2' ? filter : undefined,
          });
          set({ filteredStations: apiFiltered });
        }
      });
  },

  setSelectedStation: (station) => {
    set({ selectedStation: station });
  },
}));
