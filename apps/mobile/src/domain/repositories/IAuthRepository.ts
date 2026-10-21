import { Result } from '@/core/types/Result';
import { User } from '../entities/User';

export interface LoginCredentials {
  email?: string;
  password?: string;
}

export interface IAuthRepository {
  login(credentials?: LoginCredentials): Promise<Result<User>>;
  getStoredUser(): Promise<Result<User | null>>;
  logout(): Promise<Result<void>>;
}
