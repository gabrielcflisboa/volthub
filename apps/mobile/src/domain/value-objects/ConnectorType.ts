export type ConnectorTypeValue = 'CCS2' | 'TYPE2' | 'CHADEMO' | 'GBT';

export class ConnectorType {
  private static readonly VALID_TYPES = new Set<string>(['CCS2', 'TYPE2', 'CHADEMO', 'GBT']);

  readonly value: ConnectorTypeValue;

  constructor(value: string) {
    const normalized = value.toUpperCase();
    if (!ConnectorType.VALID_TYPES.has(normalized)) {
      this.value = 'TYPE2';
    } else {
      this.value = normalized as ConnectorTypeValue;
    }
  }

  get displayName(): string {
    switch (this.value) {
      case 'CCS2':
        return 'CCS 2 (Rápido DC)';
      case 'TYPE2':
        return 'Tipo 2 (AC)';
      case 'CHADEMO':
        return 'CHAdeMO (DC)';
      case 'GBT':
        return 'GB/T (DC)';
    }
  }

  get isDC(): boolean {
    return this.value !== 'TYPE2';
  }
}
