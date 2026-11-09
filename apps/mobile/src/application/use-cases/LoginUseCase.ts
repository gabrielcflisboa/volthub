import { Result } from '@/core/types/Result';
import { NetworkError } from '@/core/errors/AppError';
import { User } from '@/domain/entities/User';
import { IAuthRepository, LoginCredentials } from '@/domain/repositories/IAuthRepository';

export class LoginUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  /**
   * Autentica no BFF. Credenciais recusadas voltam como erro; se o servidor está inalcançável
   * (sem resposta HTTP), entra em sessão de demonstração offline, como o catálogo faz com o seed.
   */
  async execute(credentials?: LoginCredentials): Promise<Result<User>> {
    const res = await this.authRepository.login(credentials);
    if (!res.ok && res.error instanceof NetworkError && res.error.status === undefined) {
      return Result.ok(User.offlineDemo());
    }
    return res;
  }
}
