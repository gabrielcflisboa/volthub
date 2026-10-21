import { env } from '@/core/config/env';
import { NetworkError } from '@/core/errors/AppError';
import { Result } from '@/core/types/Result';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  token?: string;
  timeoutMs?: number;
}

export const apiClient = {
  async request<T>(path: string, options: RequestOptions = {}): Promise<Result<T>> {
    const url = `${env.apiUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const method = options.method ?? 'GET';
    const timeoutMs = options.timeoutMs ?? 8000;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...options.headers,
    };

    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const text = await response.text();
      const data = text ? JSON.parse(text) : null;

      if (!response.ok) {
        return Result.err(
          new NetworkError(
            data?.title || data?.message || `Requisição falhou com status ${response.status}`,
            data,
            response.status
          )
        );
      }

      return Result.ok(data as T);
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isAbort = (err as { name?: string })?.name === 'AbortError';
      const msg = isAbort ? `Tempo limite de requisição excedido (${timeoutMs}ms)` : 'Falha na conexão com o servidor';
      return Result.err(new NetworkError(msg, err));
    }
  },
};
