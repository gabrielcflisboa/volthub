export interface ChargerDto {
  chargerId: string;
  stationId: string;
  stationName: string;
  connector: string;
  powerKw: number;
  pricePerKwh: number;
  status: string;
  activeReservationId?: string | null;
}

export interface StationDto {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  pricePerKwh: number;
  imageUrl?: string;
  rating?: number;
  openHours?: string;
  amenities?: string[];
  availableChargers?: number;
  chargers: ChargerDto[];
}
