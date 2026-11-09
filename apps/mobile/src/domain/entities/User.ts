export interface UserProps {
  sub: string;
  name: string;
  roles: string[];
  token: string;
}

export class User {
  readonly sub: string;
  readonly name: string;
  readonly roles: string[];
  readonly token: string;

  constructor(props: UserProps) {
    this.sub = props.sub;
    this.name = props.name;
    this.roles = props.roles;
    this.token = props.token;
  }

  /** Sessão de demonstração usada quando o servidor de autenticação está inalcançável. */
  static offlineDemo(): User {
    return new User({ sub: 'offline-demo', name: 'Motorista Offline', roles: ['driver'], token: '' });
  }

  get isOffline(): boolean {
    return this.sub === 'offline-demo';
  }

  get isDriver(): boolean {
    return this.roles.includes('driver');
  }

  get isOperator(): boolean {
    return this.roles.includes('operator');
  }
}
