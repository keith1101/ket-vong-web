export interface AppConfig {
  port: number;
  dbPath: string;
  deploymentEnv: 'local' | 'staging' | 'production';
  invoiceImageAllowedHosts: string[];
  sessionSecret: string;
  publicBaseUrl: string;
  payos: {
    clientId: string;
    apiKey: string;
    checksumKey: string;
    baseUrl: string;
    returnUrl: string;
    cancelUrl: string;
  };
  gmail: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    senderEmail: string;
  };
  sendCheckoutEmail: boolean;
  bypassPayment: boolean;
}

type RuntimeEnv = Record<string, unknown>;

function readString(env: RuntimeEnv, key: string, fallback = ''): string {
  const value = env[key];
  return typeof value === 'string' ? value : fallback;
}

function readBoolean(env: RuntimeEnv, key: string): boolean {
  return readString(env, key).toLowerCase() === 'true';
}

function readDeploymentEnv(env: RuntimeEnv): AppConfig['deploymentEnv'] {
  const defaultValue = env.DB ? 'production' : 'local';
  const value = readString(env, 'DEPLOYMENT_ENV', defaultValue).toLowerCase();
  if (value === 'staging' || value === 'production') return value;
  return 'local';
}

export function createConfig(env: RuntimeEnv = {}): AppConfig {
  const publicBaseUrl = readString(env, 'PUBLIC_BASE_URL', 'http://localhost:3000');
  const deploymentEnv = readDeploymentEnv(env);
  const bypassPayment = readBoolean(env, 'BYPASS_PAYMENT');
  const hasExplicitDeploymentEnv = typeof env.DEPLOYMENT_ENV === 'string' && Boolean(env.DEPLOYMENT_ENV.trim());
  if (bypassPayment && !hasExplicitDeploymentEnv) {
    throw new Error('BYPASS_PAYMENT cần DEPLOYMENT_ENV=local rõ ràng; không được suy đoán môi trường.');
  }
  const invoiceImageAllowedHosts = readString(env, 'INVOICE_IMAGE_ALLOWED_HOSTS')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (bypassPayment && deploymentEnv !== 'local') {
    throw new Error('BYPASS_PAYMENT chỉ được phép bật trong môi trường local/test.');
  }
  const sessionSecret = readString(env, 'SESSION_SECRET');
  const payosClientId = readString(env, 'PAYOS_CLIENT_ID');
  const payosApiKey = readString(env, 'PAYOS_API_KEY');
  const payosChecksumKey = readString(env, 'PAYOS_CHECKSUM_KEY');
  if (deploymentEnv !== 'local' && (!sessionSecret || !payosClientId || !payosApiKey || !payosChecksumKey)) {
    throw new Error('Môi trường từ xa phải có SESSION_SECRET và đầy đủ thông tin xác thực PayOS.');
  }
  return {
    port: Number.parseInt(readString(env, 'PORT', '3001'), 10) || 3001,
    dbPath: readString(env, 'DATABASE_PATH', './data/ketvong-payos.db'),
    deploymentEnv,
    invoiceImageAllowedHosts,
    sessionSecret,
    publicBaseUrl,
    payos: {
      clientId: payosClientId,
      apiKey: payosApiKey,
      checksumKey: payosChecksumKey,
      baseUrl: readString(env, 'PAYOS_BASE_URL', 'https://api-merchant.payos.vn'),
      returnUrl: readString(env, 'PAYOS_RETURN_URL', `${publicBaseUrl}/thanh-toan/ket-qua`),
      cancelUrl: readString(env, 'PAYOS_CANCEL_URL', `${publicBaseUrl}/thanh-toan/da-huy`),
    },
    gmail: {
      clientId: readString(env, 'GMAIL_CLIENT_ID'),
      clientSecret: readString(env, 'GMAIL_CLIENT_SECRET'),
      refreshToken: readString(env, 'GMAIL_REFRESH_TOKEN'),
      senderEmail: readString(env, 'GMAIL_SENDER_EMAIL'),
    },
    sendCheckoutEmail: readBoolean(env, 'SEND_CHECKOUT_EMAIL'),
    bypassPayment,
  };
}

const nodeProcess = (globalThis as { process?: { env?: RuntimeEnv } }).process;
export const config: AppConfig = createConfig(nodeProcess?.env || {});

export function configureConfig(env: RuntimeEnv): AppConfig {
  const next = createConfig(env);
  Object.assign(config, next);
  return config;
}

