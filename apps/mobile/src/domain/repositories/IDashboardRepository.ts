import { Result } from '@/core/types/Result';
import { Invoice } from '../entities/Invoice';

export interface DriverDashboardData {
  userName: string;
  invoices: Invoice[];
  degradedServices: string[];
  activeReservation: {
    id: string;
    chargerId: string;
    stationId: string;
    status: string;
  } | null;
}

export interface IDashboardRepository {
  getDriverDashboard(token: string): Promise<Result<DriverDashboardData>>;
}
