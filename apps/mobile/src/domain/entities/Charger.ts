import { ConnectorType } from '../value-objects/ConnectorType';
import { ChargerStatus } from '../value-objects/ChargerStatus';
import { Money } from '../value-objects/Money';

export interface ChargerProps {
  id: string;
  stationId: string;
  stationName: string;
  connector: ConnectorType;
  powerKw: number;
  pricePerKwh: Money;
  status: ChargerStatus;
  activeReservationId?: string | null;
}

export class Charger {
  readonly id: string;
  readonly stationId: string;
  readonly stationName: string;
  readonly connector: ConnectorType;
  readonly powerKw: number;
  readonly pricePerKwh: Money;
  readonly status: ChargerStatus;
  readonly activeReservationId: string | null;

  constructor(props: ChargerProps) {
    this.id = props.id;
    this.stationId = props.stationId;
    this.stationName = props.stationName;
    this.connector = props.connector;
    this.powerKw = props.powerKw;
    this.pricePerKwh = props.pricePerKwh;
    this.status = props.status;
    this.activeReservationId = props.activeReservationId ?? null;
  }

  get isFastCharger(): boolean {
    return this.powerKw >= 50;
  }

  get isUltraFast(): boolean {
    return this.powerKw >= 100;
  }

  get isAvailable(): boolean {
    return this.status.isAvailable;
  }
}
