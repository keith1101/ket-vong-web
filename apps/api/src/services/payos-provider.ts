import { config } from '../config.js';
import { signHmacSha256 } from '../utils/hmac.js';

export interface CreatePayOSPaymentInput {
  orderCode: number;
  amount: number;
  description: string;
  expiresAt: number;
}

export interface PayOSPaymentLink {
  orderCode: number;
  paymentLinkId: string;
  checkoutUrl: string;
  qrCode: string;
  status: string;
  expiresAt: string;
}

function createPaymentSignature(input: CreatePayOSPaymentInput): Promise<string> {
  const message = [
    ['amount', input.amount],
    ['cancelUrl', config.payos.cancelUrl],
    ['description', input.description],
    ['orderCode', input.orderCode],
    ['returnUrl', config.payos.returnUrl],
  ].map(([key, value]) => `${key}=${value}`).join('&');
  return signHmacSha256(message, config.payos.checksumKey);
}

function assertPayOSConfig(): void {
  if (!config.payos.clientId || !config.payos.apiKey || !config.payos.checksumKey) {
    throw new Error('PayOS chưa được cấu hình đầy đủ. Vui lòng kiểm tra PAYOS_CLIENT_ID, PAYOS_API_KEY và PAYOS_CHECKSUM_KEY.');
  }
}

export async function createPayOSPayment(input: CreatePayOSPaymentInput): Promise<PayOSPaymentLink> {
  assertPayOSConfig();
  const signature = await createPaymentSignature(input);
  const response = await fetch(`${config.payos.baseUrl}/v2/payment-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': config.payos.clientId,
      'x-api-key': config.payos.apiKey,
    },
    body: JSON.stringify({
      orderCode: input.orderCode,
      amount: input.amount,
      description: input.description,
      items: [{ name: input.description, quantity: 1, price: input.amount }],
      cancelUrl: config.payos.cancelUrl,
      returnUrl: config.payos.returnUrl,
      expiredAt: input.expiresAt,
      signature,
    }),
  });

  const body = await response.json().catch(() => null) as any;
  if (!response.ok || body?.code !== '00' || !body?.data) {
    console.error('[PayOS] Tạo payment link thất bại:', {
      httpStatus: response.status,
      providerCode: typeof body?.code === 'string' ? body.code.slice(0, 32) : null,
    });
    throw new Error('Không thể tạo liên kết ủng hộ PayOS lúc này. Vui lòng thử lại sau.');
  }

  return {
    orderCode: Number(body.data.orderCode),
    paymentLinkId: String(body.data.paymentLinkId),
    checkoutUrl: String(body.data.checkoutUrl),
    qrCode: String(body.data.qrCode || ''),
    status: String(body.data.status || 'PENDING'),
    expiresAt: new Date(input.expiresAt * 1000).toISOString(),
  };
}
