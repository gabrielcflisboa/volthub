import { DomainValidationError } from '@/core/errors/AppError';

export class Coordinates {
  readonly latitude: number;
  readonly longitude: number;

  constructor(latitude: number, longitude: number) {
    if (latitude < -90 || latitude > 90) {
      throw new DomainValidationError(`Latitude inválida: ${latitude}`);
    }
    if (longitude < -180 || longitude > 180) {
      throw new DomainValidationError(`Longitude inválida: ${longitude}`);
    }
    this.latitude = latitude;
    this.longitude = longitude;
  }

  /**
   * Calcula distância em km usando fórmula de Haversine
   */
  distanceTo(other: Coordinates): number {
    const R = 6371; // Raio da Terra em km
    const dLat = this.deg2rad(other.latitude - this.latitude);
    const dLon = this.deg2rad(other.longitude - this.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(this.latitude)) *
        Math.cos(this.deg2rad(other.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  formatDistanceTo(other: Coordinates): string {
    const d = this.distanceTo(other);
    if (d < 1) {
      return `${Math.round(d * 1000)} m`;
    }
    return `${d.toFixed(1)} km`;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
