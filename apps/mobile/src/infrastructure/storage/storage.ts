import AsyncStorage from '@react-native-async-storage/async-storage';
import { Result } from '@/core/types/Result';
import { StorageError } from '@/core/errors/AppError';

export const storage = {
  async getItem<T>(key: string): Promise<Result<T | null>> {
    try {
      const val = await AsyncStorage.getItem(key);
      if (!val) return Result.ok(null);
      return Result.ok(JSON.parse(val) as T);
    } catch (err) {
      return Result.err(new StorageError(`Erro ao ler chave ${key}`, err));
    }
  },

  async setItem<T>(key: string, value: T): Promise<Result<void>> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return Result.ok(undefined);
    } catch (err) {
      return Result.err(new StorageError(`Erro ao salvar chave ${key}`, err));
    }
  },

  async removeItem(key: string): Promise<Result<void>> {
    try {
      await AsyncStorage.removeItem(key);
      return Result.ok(undefined);
    } catch (err) {
      return Result.err(new StorageError(`Erro ao remover chave ${key}`, err));
    }
  },
};
