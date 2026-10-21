import { create } from 'zustand';
import { User } from '@/domain/entities/User';
import { HttpAuthRepository } from '@/infrastructure/repositories/HttpAuthRepository';
import { LoginUseCase } from '@/application/use-cases/LoginUseCase';

const authRepository = new HttpAuthRepository();
const loginUseCase = new LoginUseCase(authRepository);

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email?: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,

  initialize: async () => {
    set({ loading: true });
    const res = await authRepository.getStoredUser();
    if (res.ok && res.value) {
      set({ user: res.value, loading: false });
    } else {
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    const res = await loginUseCase.execute({ email, password });
    if (res.ok) {
      set({ user: res.value, loading: false });
      return true;
    } else {
      set({ error: res.error.message, loading: false });
      return false;
    }
  },

  logout: async () => {
    await authRepository.logout();
    set({ user: null });
  },
}));
