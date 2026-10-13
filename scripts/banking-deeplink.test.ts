import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateBankingDeeplink,
  getBankByBinOrCode,
  VIETNAM_BANKS,
  isMobileBrowser,
} from '../apps/web/src/utils/banking.ts';

test('Banking Deeplink: generates standard VietQR Universal Link and specific bank deeplinks', () => {
  // 1. Mở app MB Bank cụ thể
  const mbLink = generateBankingDeeplink({
    app: 'mb',
    accountNumber: ' 038 3838 388 ',
    bankBinOrCode: '970422',
    amount: 50000,
    memo: 'KV-AB1234',
    accountName: 'BUI ANH HUY',
  });

  assert.ok(mbLink.startsWith('https://dl.vietqr.io/pay?'));
  const mbUrl = new URL(mbLink);
  assert.equal(mbUrl.searchParams.get('app'), 'mb');
  assert.equal(mbUrl.searchParams.get('ba'), '0383838388@970422');
  assert.equal(mbUrl.searchParams.get('am'), '50000');
  assert.equal(mbUrl.searchParams.get('tn'), 'KVAB1234');
  assert.equal(mbUrl.searchParams.get('bn'), 'BUI ANH HUY');

  // 2. Mở VietQR Smart Chooser khi không chỉ định app
  const smartLink = generateBankingDeeplink({
    accountNumber: '113366668888',
    bankBinOrCode: '970436',
    amount: 10000,
    memo: 'KV-TEST01',
    accountName: 'KET VONG WORKSHOP',
    returnUrl: 'https://ketvong.vn/thanh-toan/ket-qua',
  });

  const smartUrl = new URL(smartLink);
  assert.equal(smartUrl.searchParams.has('app'), false);
  assert.equal(smartUrl.searchParams.get('ba'), '113366668888@970436');
  assert.equal(smartUrl.searchParams.get('am'), '10000');
  assert.equal(smartUrl.searchParams.get('tn'), 'KVTEST01');
  assert.equal(smartUrl.searchParams.get('url'), 'https://ketvong.vn/thanh-toan/ket-qua');

  // 3. Mở ví MoMo (xử lý riêng deeplink momo:// tránh lỗi dl.vietqr.io "Bank App not found")
  const momoLink = generateBankingDeeplink({
    app: 'momo',
    accountNumber: '0383838388',
    bankBinOrCode: '970422',
    amount: 50000,
    memo: 'KV-AB1234',
    accountName: 'BUI ANH HUY',
  });
  assert.equal(momoLink, 'momo://');

  // 4. Mở ví MoMo khi bankBinOrCode là MOMO
  const momoByBin = generateBankingDeeplink({
    bankBinOrCode: 'MOMO',
    accountNumber: '0383838388',
    amount: 50000,
    memo: 'KV-MOMO99',
  });
  assert.equal(momoByBin, 'momo://');

  // 5. Mở ví MoMo với app = 'MoMo' (hoa thường bất kỳ)
  const momoCaseInsensitive = generateBankingDeeplink({
    app: 'MoMo',
    bankBinOrCode: '970422',
    accountNumber: '0383838388',
    amount: 10000,
    memo: 'KV-TEST',
  });
  assert.equal(momoCaseInsensitive, 'momo://');
});

test('Banking Registry: lookups by BIN, code, and appCode return valid bank records', () => {
  assert.ok(VIETNAM_BANKS.length >= 8);

  const mb = getBankByBinOrCode('970422');
  assert.equal(mb?.code, 'MB');
  assert.equal(mb?.appCode, 'mb');

  const vcb = getBankByBinOrCode('VCB');
  assert.equal(vcb?.bin, '970436');
  assert.equal(vcb?.appCode, 'vcb');

  const tcb = getBankByBinOrCode('tcb');
  assert.equal(tcb?.code, 'TCB');

  const momo = getBankByBinOrCode('momo');
  assert.equal(momo?.code, 'MOMO');
  assert.equal(momo?.appCode, 'momo');
  assert.equal(momo?.shortName, 'Ví MoMo');
  assert.equal(momo?.logo, '/images/banks/momo.png');

  const momoByCode = getBankByBinOrCode('MOMO');
  assert.equal(momoByCode?.appCode, 'momo');

  const unknown = getBankByBinOrCode('UNKNOWN');
  assert.equal(unknown, undefined);
});

test('isMobileBrowser: returns boolean in node environment', () => {
  const result = isMobileBrowser();
  assert.equal(typeof result, 'boolean');
});
