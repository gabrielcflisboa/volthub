import { Station } from '@/domain/entities/Station';

export interface StationFilterCriteria {
  query?: string;
  onlyAvailable?: boolean;
  onlyFast?: boolean;
  connector?: string;
  favoriteIds?: Set<string>;
  onlyFavorites?: boolean;
}

export class FilterStationsUseCase {
  execute(stations: Station[], criteria: StationFilterCriteria): Station[] {
    return stations.filter((station) => {
      // 1. Busca por texto (nome, endereço, comodidade)
      if (criteria.query && !station.matchesSearch(criteria.query)) {
        return false;
      }

      // 2. Filtro: Apenas com vagas disponíveis agora
      if (criteria.onlyAvailable && !station.hasAvailableChargers) {
        return false;
      }

      // 3. Filtro: Apenas com carregadores rápidos (> 50 kW)
      if (criteria.onlyFast && !station.hasFastCharger) {
        return false;
      }

      // 4. Filtro por tipo de conector específico (ex: CCS2, TYPE2)
      if (criteria.connector && criteria.connector !== 'ALL') {
        const hasConnector = station.chargers.some((c) => c.connector.value === criteria.connector);
        if (!hasConnector) return false;
      }

      // 5. Filtro: Apenas favoritos
      if (criteria.onlyFavorites && criteria.favoriteIds) {
        if (!criteria.favoriteIds.has(station.id)) return false;
      }

      return true;
    });
  }
}
