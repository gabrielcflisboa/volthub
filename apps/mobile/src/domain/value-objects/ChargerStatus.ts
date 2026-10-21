export type ChargerStatusValue =
  | 'AVAILABLE'
  | 'CHARGING'
  | 'RESERVED'
  | 'FAULTED'
  | 'OFFLINE';

export class ChargerStatus {
  readonly value: ChargerStatusValue;

  constructor(value: string) {
    const valid: ChargerStatusValue[] = ['AVAILABLE', 'CHARGING', 'RESERVED', 'FAULTED', 'OFFLINE'];
    if (valid.includes(value as ChargerStatusValue)) {
      this.value = value as ChargerStatusValue;
    } else {
      this.value = 'OFFLINE';
    }
  }

  get isAvailable(): boolean {
    return this.value === 'AVAILABLE';
  }

  get label(): string {
    switch (this.value) {
      case 'AVAILABLE':
        return 'Livre';
      case 'CHARGING':
        return 'Carregando';
      case 'RESERVED':
        return 'Reservado';
      case 'FAULTED':
        return 'Em Manutenção';
      case 'OFFLINE':
        return 'Indisponível';
    }
  }

  get color(): string {
    switch (this.value) {
      case 'AVAILABLE':
        return '#00F59B'; // Neon Green
      case 'CHARGING':
        return '#00D2FF'; // Cyber Blue
      case 'RESERVED':
        return '#FFB800'; // Amber
      case 'FAULTED':
      case 'OFFLINE':
        return '#FF4757'; // Red
    }
  }
}
