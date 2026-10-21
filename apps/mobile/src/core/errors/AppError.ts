export abstract class AppError extends Error {
  abstract readonly code: string;
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class DomainValidationError extends AppError {
  readonly code = 'DOMAIN_VALIDATION_ERROR';
}

export class NetworkError extends AppError {
  readonly code = 'NETWORK_ERROR';
}

export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND_ERROR';
}

export class AuthenticationError extends AppError {
  readonly code = 'AUTHENTICATION_ERROR';
}

export class StorageError extends AppError {
  readonly code = 'STORAGE_ERROR';
}
