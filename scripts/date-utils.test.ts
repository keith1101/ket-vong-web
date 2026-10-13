import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDateTime, formatDate } from '../apps/web/src/utils/date.ts';

test('Date Utils: formatDateTime includes hour, minute, second and date', () => {
  // Chuỗi ISO hợp lệ
  const testIso = '2026-10-13T14:30:45.000Z';
  const result = formatDateTime(testIso);
  const d = new Date(testIso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const expected = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  assert.equal(result, expected);

  // Không kèm giây
  const resultNoSec = formatDateTime(testIso, false);
  const expectedNoSec = `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  assert.equal(resultNoSec, expectedNoSec);

  // Giá trị rỗng / null / undefined / sai định dạng
  assert.equal(formatDateTime(null), '-');
  assert.equal(formatDateTime(undefined), '-');
  assert.equal(formatDateTime(''), '-');
  assert.equal(formatDateTime('invalid-date'), 'invalid-date');
});

test('Date Utils: formatDate formats day/month/year', () => {
  const testIso = '2026-10-13T14:30:45.000Z';
  const result = formatDate(testIso);
  const d = new Date(testIso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const expected = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  assert.equal(result, expected);

  assert.equal(formatDate(null), '-');
  assert.equal(formatDate(undefined), '-');
});

