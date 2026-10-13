/**
 * Tiện ích định dạng ngày giờ cho toàn bộ hệ thống Kết Vòng.
 * Đảm bảo hiển thị đầy đủ cả giờ:phút:giây và ngày/tháng/năm
 * đồng nhất trên mọi trình duyệt và hệ điều hành.
 */

export function formatDateTime(
  dateInput: string | number | Date | null | undefined,
  includeSeconds = true
): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return typeof dateInput === 'string' ? dateInput : '-';

  const pad = (n: number) => n.toString().padStart(2, '0');
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();

  return includeSeconds
    ? `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`
    : `${hours}:${minutes} ${day}/${month}/${year}`;
}

export function formatDate(
  dateInput: string | number | Date | null | undefined
): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return typeof dateInput === 'string' ? dateInput : '-';

  const pad = (n: number) => n.toString().padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}
