import test from 'node:test';
import assert from 'node:assert/strict';
import { generateThankYouLetterSvg } from '../services/letter-service.js';

test('generateThankYouLetterSvg produces high-resolution SVG matching new design', async () => {
  const svg = await generateThankYouLetterSvg({
    code: 'KV-TEST88',
    title: 'Bạn',
    displayName: 'Bùi Anh Huy',
    amount: 10000,
    quantity: 1,
    approvedAt: '2026-10-24T10:00:00Z',
    receiptToken: 'abc123token',
  });

  assert.ok(svg.includes('<svg'), 'Phải chứa thẻ mở svg');
  assert.ok(svg.includes('viewBox="0 0 723 1024"'), 'Phải có tỷ lệ chuẩn 723 x 1024');
  assert.ok(svg.includes('Bùi Anh Huy'), 'Phải chứa tên người hảo tâm Bùi Anh Huy');
  assert.ok(svg.includes('10.000đ'), 'Phải chứa số tiền định dạng 10.000đ');
  assert.ok(svg.includes('1'), 'Phải chứa số lượng 1 chiếc vòng');
  assert.ok(svg.includes('KV-TEST88'), 'Phải chứa mã ủng hộ');
  assert.ok(svg.includes('#DE833A'), 'Phải chứa mã màu cam thương hiệu #DE833A');
});
