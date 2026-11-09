import test from 'node:test';
import assert from 'node:assert/strict';
import { Result } from '../src/core/types/Result';
import { AuthenticationError, NetworkError } from '../src/core/errors/AppError';
import { User } from '../src/domain/entities/User';
import { IAuthRepository, LoginCredentials } from '../src/domain/repositories/IAuthRepository';
import { LoginUseCase } from '../src/application/use-cases/LoginUseCase';

class FakeAuthRepository implements IAuthRepository {
  received?: LoginCredentials;
  constructor(private readonly result: Result<User>) {}
  async login(credentials?: LoginCredentials) {
    this.received = credentials;
    return this.result;
  }
  async getStoredUser() {
    return Result.ok(null);
  }
  async logout() {
    return Result.ok(undefined);
  }
}

const driver = new User({ sub: 'u1', name: 'Motorista', roles: ['driver'], token: 'jwt' });

test('LoginUseCase repassa as credenciais e devolve o usuário autenticado', async () => {
  const repo = new FakeAuthRepository(Result.ok(driver));
  const res = await new LoginUseCase(repo).execute({ email: 'a@b.com', password: 'x' });

  assert.deepEqual(repo.received, { email: 'a@b.com', password: 'x' });
  assert.ok(res.ok && res.value.token === 'jwt' && !res.value.isOffline);
});

test('LoginUseCase mantém o erro quando as credenciais são recusadas', async () => {
  const repo = new FakeAuthRepository(Result.err(new AuthenticationError('E-mail ou senha inválidos')));
  const res = await new LoginUseCase(repo).execute({ email: 'a@b.com', password: 'errada' });

  assert.ok(!res.ok);
  assert.equal(res.error.message, 'E-mail ou senha inválidos');
});

test('LoginUseCase entra em modo offline quando o servidor não responde', async () => {
  const repo = new FakeAuthRepository(Result.err(new NetworkError('Falha na conexão com o servidor')));
  const res = await new LoginUseCase(repo).execute({ email: 'a@b.com', password: 'x' });

  assert.ok(res.ok);
  assert.equal(res.value.isOffline, true);
  assert.equal(res.value.token, '');
});

test('LoginUseCase não cai no offline quando o servidor responde com erro HTTP', async () => {
  const repo = new FakeAuthRepository(Result.err(new NetworkError('Bad gateway', undefined, 502)));
  const res = await new LoginUseCase(repo).execute();

  assert.ok(!res.ok);
});
