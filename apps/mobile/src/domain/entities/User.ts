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

  get isDriver(): boolean {
    return this.roles.includes('driver');
  }

  get isOperator(): boolean {
    return this.roles.includes('operator');
  }
}
