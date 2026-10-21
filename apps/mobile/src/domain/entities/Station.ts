import { Coordinates } from '../value-objects/Coordinates';
import { Money } from '../value-objects/Money';
import { Charger } from './Charger';

export interface StationProps {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  pricePerKwh: Money;
  imageUrl: string;
  rating: number;
  openHours: string;
  amenities: string[];
  chargers: Charger[];
}

export class Station {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly coordinates: Coordinates;
  readonly pricePerKwh: Money;
  readonly imageUrl: string;
  readonly rating: number;
  readonly openHours: string;
  readonly amenities: string[];
  readonly chargers: Charger[];

  constructor(props: StationProps) {
    this.id = props.id;
    this.name = props.name;
    this.address = props.address;
    this.coordinates = props.coordinates;
    this.pricePerKwh = props.pricePerKwh;
    this.imageUrl = props.imageUrl;
    this.rating = props.rating;
    this.openHours = props.openHours;
    this.amenities = props.amenities;
    this.chargers = props.chargers;
  }

  get totalChargers(): number {
    return this.chargers.length;
  }

  get availableChargersCount(): number {
    return this.chargers.filter((c) => c.isAvailable).length;
  }

  get hasAvailableChargers(): boolean {
    return this.availableChargersCount > 0;
  }

  get hasFastCharger(): boolean {
    return this.chargers.some((c) => c.isFastCharger);
  }

  get maxPowerKw(): number {
    if (this.chargers.length === 0) return 0;
    return Math.max(...this.chargers.map((c) => c.powerKw));
  }

  /**
   * Filtro de busca textual (cidade, bairro, nome)
   */
  matchesSearch(query: string): boolean {
    if (!query || query.trim() === '') return true;
    const q = query.toLowerCase().trim();
    return (
      this.name.toLowerCase().includes(q) ||
      this.address.toLowerCase().includes(q) ||
      this.amenities.some((a) => a.toLowerCase().includes(q))
    );
  }
}
