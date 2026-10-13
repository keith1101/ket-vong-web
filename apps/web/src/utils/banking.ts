export interface BankInfo {
  bin: string;
  code: string;
  shortName: string;
  fullName: string;
  appCode: string;
  color: string;
  bgLight: string;
  logo: string;
}

export const VIETNAM_BANKS: BankInfo[] = [
  {
    bin: '970422',
    code: 'MB',
    shortName: 'MB Bank',
    fullName: 'Ngân hàng TMCP Quân Đội',
    appCode: 'mb',
    color: '#1428a0',
    bgLight: '#eef2ff',
    logo: '/images/banks/mb.png',
  },
  {
    bin: 'MOMO',
    code: 'MOMO',
    shortName: 'Ví MoMo',
    fullName: 'Ví điện tử MoMo',
    appCode: 'momo',
    color: '#a50064',
    bgLight: '#fdf2f8',
    logo: '/images/banks/momo.png',
  },
  {
    bin: '970436',
    code: 'VCB',
    shortName: 'Vietcombank',
    fullName: 'Ngân hàng TMCP Ngoại Thương VN',
    appCode: 'vcb',
    color: '#006241',
    bgLight: '#e6f4ea',
    logo: '/images/banks/vcb.png',
  },
  {
    bin: '970407',
    code: 'TCB',
    shortName: 'Techcombank',
    fullName: 'Ngân hàng TMCP Kỹ Thương VN',
    appCode: 'tcb',
    color: '#e21a22',
    bgLight: '#fde8e8',
    logo: '/images/banks/tcb.png',
  },
  {
    bin: '970418',
    code: 'BIDV',
    shortName: 'BIDV',
    fullName: 'Ngân hàng TMCP Đầu tư và Phát triển VN',
    appCode: 'bidv',
    color: '#0d6b52',
    bgLight: '#e6f4ea',
    logo: '/images/banks/bidv.png',
  },
  {
    bin: '970415',
    code: 'CTG',
    shortName: 'VietinBank',
    fullName: 'Ngân hàng TMCP Công Thương VN',
    appCode: 'icb',
    color: '#005b94',
    bgLight: '#e0f2fe',
    logo: '/images/banks/icb.png',
  },
  {
    bin: '970423',
    code: 'TPB',
    shortName: 'TPBank',
    fullName: 'Ngân hàng TMCP Tiên Phong',
    appCode: 'tpb',
    color: '#7b2cbf',
    bgLight: '#f3e8ff',
    logo: '/images/banks/tpb.png',
  },
  {
    bin: '970432',
    code: 'VPB',
    shortName: 'VPBank',
    fullName: 'Ngân hàng TMCP Việt Nam Thịnh Vượng',
    appCode: 'vpb',
    color: '#00a651',
    bgLight: '#ecfdf5',
    logo: '/images/banks/vpb.png',
  },
  {
    bin: '970416',
    code: 'ACB',
    shortName: 'ACB',
    fullName: 'Ngân hàng TMCP Á Châu',
    appCode: 'acb',
    color: '#0066b2',
    bgLight: '#e0f2fe',
    logo: '/images/banks/acb.png',
  },
  {
    bin: '970405',
    code: 'VBA',
    shortName: 'Agribank',
    fullName: 'Ngân hàng Nông nghiệp & PTNT VN',
    appCode: 'vba',
    color: '#9e1c23',
    bgLight: '#fdf2f2',
    logo: '/images/banks/vba.png',
  },
  {
    bin: '970448',
    code: 'OCB',
    shortName: 'OCB',
    fullName: 'Ngân hàng TMCP Phương Đông',
    appCode: 'ocb',
    color: '#008542',
    bgLight: '#ecfdf5',
    logo: '/images/banks/ocb.png',
  },
  {
    bin: '970441',
    code: 'VIB',
    shortName: 'VIB',
    fullName: 'Ngân hàng TMCP Quốc Tế VN',
    appCode: 'vib',
    color: '#005ba6',
    bgLight: '#e0f2fe',
    logo: '/images/banks/vib.png',
  },
  {
    bin: '970437',
    code: 'HDB',
    shortName: 'HDBank',
    fullName: 'Ngân hàng TMCP Phát triển TP.HCM',
    appCode: 'hdb',
    color: '#df1b27',
    bgLight: '#fef2f2',
    logo: '/images/banks/hdb.png',
  },
];

export interface GenerateDeeplinkParams {
  app?: string;
  accountNumber: string;
  bankBinOrCode: string;
  amount: number;
  memo: string;
  accountName?: string;
  returnUrl?: string;
}

/**
 * Sinh đường dẫn VietQR QuickLink (Napas 247 DeepLink)
 * Format chuẩn quốc gia: https://dl.vietqr.io/pay?app=...&ba=STK@BIN&am=...&tn=...
 */
export function generateBankingDeeplink(params: GenerateDeeplinkParams): string {
  const { app, accountNumber, bankBinOrCode, amount, memo, accountName, returnUrl } = params;

  // Xử lý riêng cho ví MoMo: Mở trực tiếp app MoMo (momo://)
  // để tránh lỗi của dl.vietqr.io ("Bank App not found onios/onandroid")
  const isMomo =
    (Boolean(app) && app!.trim().toLowerCase() === 'momo') ||
    (Boolean(bankBinOrCode) && bankBinOrCode!.trim().toUpperCase() === 'MOMO');

  if (isMomo) {
    return 'momo://';
  }

  const baseUrl = 'https://dl.vietqr.io/pay';
  const queryParams = new URLSearchParams();

  if (app && app.trim()) {
    queryParams.set('app', app.trim().toLowerCase());
  }

  const cleanAccount = (accountNumber || '').replace(/\s+/g, '');
  const cleanBank = (bankBinOrCode || '').trim();
  queryParams.set('ba', `${cleanAccount}@${cleanBank}`);

  if (amount > 0) {
    queryParams.set('am', String(Math.round(amount)));
  }

  if (memo && memo.trim()) {
    // Chuẩn Napas 247 và Core Banking các ngân hàng (MB, BIDV, VCB, VietinBank...)
    // nghiêm ngặt cấm ký tự đặc biệt như '-'. Loại bỏ ký tự đặc biệt để tránh lỗi 'invalid transaction note!'
    const cleanMemo = memo.trim().replace(/[^a-zA-Z0-9]/g, '');
    queryParams.set('tn', cleanMemo);
  }

  if (accountName && accountName.trim()) {
    queryParams.set('bn', accountName.trim());
  }

  if (returnUrl && returnUrl.trim()) {
    queryParams.set('url', returnUrl.trim());
  }

  return `${baseUrl}?${queryParams.toString()}`;
}

/**
 * Kiểm tra xem người dùng có đang duyệt web bằng thiết bị di động hay không
 */
export function isMobileBrowser(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isTouch = navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || (isTouch && isSmallScreen);
}

/**
 * Tìm thông tin ngân hàng qua mã BIN hoặc mã code (ví dụ 970422 -> MB Bank)
 */
export function getBankByBinOrCode(identifier?: string | null): BankInfo | undefined {
  if (!identifier) return undefined;
  const clean = identifier.trim().toUpperCase();
  return VIETNAM_BANKS.find(
    (b) => b.bin.toUpperCase() === clean || b.code.toUpperCase() === clean || b.appCode.toUpperCase() === clean
  );
}
