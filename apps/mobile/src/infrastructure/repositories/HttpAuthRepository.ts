import { Result } from '@/core/types/Result';
import { User } from '@/domain/entities/User';
import { IAuthRepository, LoginCredentials } from '@/domain/repositories/IAuthRepository';
import { apiClient } from '../api/apiClient';
import { storage } from '../storage/storage';

const USER_SESSION_KEY = '@volthub/user_session_v1';

interface LoginResponseDto {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  user: {
    sub: string;
    name: string;
    roles: string[];
  };
}

export class HttpAuthRepository implements IAuthRepository {
  async login(credentials?: LoginCredentials): Promise<Result<User>> {
    const res = await apiClient.request<LoginResponseDto>('/api/v1/auth/login', {
      method: 'POST',
      body: credentials ?? {},
    });

    if (!res.ok) return res;

    const u = res.value;
    const user = new User({
      sub: u.user.sub,
      name: u.user.name,
      roles: u.user.roles,
      token: u.accessToken,
    });

    await storage.setItem(USER_SESSION_KEY, {
      sub: user.sub,
      name: user.name,
      roles: user.roles,
      token: user.token,
    });

    return Result.ok(user);
  }

  async getStoredUser(): Promise<Result<User | null>> {
    const res = await storage.getItem<{ sub: string; name: string; roles: string[]; token: string }>(
      USER_SESSION_KEY
    );
    if (!res.ok) return res;
    if (!res.value) return Result.ok(null);

    return Result.ok(new User(res.value));
  }

  async logout(): Promise<Result<void>> {
    return storage.removeItem(USER_SESSION_KEY);
  }
}
