import { Result } from '@/core/types/Result';
import { DriverDashboardData, IDashboardRepository } from '@/domain/repositories/IDashboardRepository';

export class GetDriverDashboardUseCase {
  constructor(private readonly dashboardRepository: IDashboardRepository) {}

  async execute(token: string): Promise<Result<DriverDashboardData>> {
    return this.dashboardRepository.getDriverDashboard(token);
  }
}
