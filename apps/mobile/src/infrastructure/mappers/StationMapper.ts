import { Station } from '@/domain/entities/Station';
import { Charger } from '@/domain/entities/Charger';
import { Coordinates } from '@/domain/value-objects/Coordinates';
import { Money } from '@/domain/value-objects/Money';
import { ConnectorType } from '@/domain/value-objects/ConnectorType';
import { ChargerStatus } from '@/domain/value-objects/ChargerStatus';
import { StationDto, ChargerDto } from '../api/dtos/StationDto';

export class StationMapper {
  static toDomain(dto: StationDto): Station {
    const chargers = (dto.chargers || []).map(StationMapper.chargerToDomain);
    return new Station({
      id: dto.id,
      name: dto.name,
      address: dto.address,
      coordinates: new Coordinates(dto.latitude, dto.longitude),
      pricePerKwh: new Money(dto.pricePerKwh),
      imageUrl:
        dto.imageUrl ||
        'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80',
      rating: dto.rating ?? 4.8,
      openHours: dto.openHours || '24 horas',
      amenities: dto.amenities || ['WIFI', 'PARKING'],
      chargers,
    });
  }

  static chargerToDomain(dto: ChargerDto): Charger {
    return new Charger({
      id: dto.chargerId,
      stationId: dto.stationId,
      stationName: dto.stationName,
      connector: new ConnectorType(dto.connector),
      powerKw: dto.powerKw,
      pricePerKwh: new Money(dto.pricePerKwh),
      status: new ChargerStatus(dto.status),
      activeReservationId: dto.activeReservationId,
    });
  }
}
