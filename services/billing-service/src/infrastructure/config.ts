const env = (name: string, fallback?: string): string => {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Variável de ambiente obrigatória: ${name}`);
  return v;
};

export const config = {
  port: Number(env('PORT', '8080')),
  databaseUrl: env('DATABASE_URL', 'postgres://billing_user:billing_pw@localhost:5432/volthub'),
  kafkaBrokers: env('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9094').split(','),
  stationServiceUrl: env('STATION_SERVICE_URL', 'http://localhost:8001'),
  oidc: {
    issuer: env('OIDC_ISSUER', 'http://localhost:8081/realms/volthub'),
    jwksUri: env('OIDC_JWKS_URI', 'http://localhost:8081/realms/volthub/protocol/openid-connect/certs'),
    tokenUri: env('OIDC_TOKEN_URI', 'http://localhost:8081/realms/volthub/protocol/openid-connect/token'),
    clientId: env('OIDC_CLIENT_ID', 'billing-service'),
    clientSecret: env('OIDC_CLIENT_SECRET', ''),
    audience: 'bff-web',
  },
};
