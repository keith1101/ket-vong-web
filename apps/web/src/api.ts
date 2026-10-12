import type { FundSummary, PublicDonationItem, AdminUser, Donation, DailyReport } from './types';

export const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api/v1`;
let csrfToken: string | null = null;

export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers || {});
  if (csrfToken && method !== 'GET' && method !== 'HEAD' && String(input).includes('/admin/')) {
    headers.set('X-CSRF-Token', csrfToken);
  }
  return fetch(input, { ...init, headers, credentials: 'include' });
}

export async function fetchFundSummary(): Promise<FundSummary> {
  const res = await apiFetch(`${API_BASE}/fund/summary`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể tải thông tin quỹ');
  return data.data;
}

export async function submitDonation(payload: {
  quantity: number;
  displayName: string;
  title: string;
  email?: string;
  phone?: string;
  publicMessage?: string;
  isAnonymous?: boolean;
  consent: boolean;
}) {
  const res = await apiFetch(`${API_BASE}/donations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể gửi yêu cầu ủng hộ');
  return data.data;
}

export async function fetchDonationStatus(code: string): Promise<{ code: string; status: string; approved_at: string | null; checkout_url?: string | null }> {
  const res = await apiFetch(`${API_BASE}/donations/${encodeURIComponent(code)}/status`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể kiểm tra trạng thái quyên góp');
  return data.data;
}

export async function fetchPaymentStatus(orderCode: string): Promise<{ code: string; status: string; approved_at: string | null }> {
  const statusToken = window.localStorage.getItem(`ketvong:payment-status:${orderCode}`);
  if (!statusToken) throw new Error('Không tìm thấy mã bảo mật để kiểm tra trạng thái ủng hộ.');
  const res = await apiFetch(`${API_BASE}/donations/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderCode: Number(orderCode), statusToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể kiểm tra trạng thái ủng hộ');
  return data.data;
}

export async function fetchPublicDonations(page = 1, limit = 20): Promise<{
  items: PublicDonationItem[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
}> {
  const res = await apiFetch(`${API_BASE}/donations/public?page=${page}&limit=${limit}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể tải danh sách minh bạch');
  return data.data;
}

export async function verifyReceipt(code: string, token: string) {
  const res = await apiFetch(`${API_BASE}/receipts/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, token }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không tìm thấy biên nhận');
  return data.data;
}

export async function fetchDailyReports(): Promise<DailyReport[]> {
  const res = await apiFetch(`${API_BASE}/fund/reports`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể tải danh sách báo cáo');
  return data.data;
}

export async function adminGetReports(): Promise<DailyReport[]> {
  const res = await apiFetch(`${API_BASE}/admin/reports`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể tải báo cáo quản trị');
  return data.data;
}

// -----------------------------------------------------------------------------
// ADMIN API
// -----------------------------------------------------------------------------

export async function adminLogin(email: string, password: string): Promise<{ admin: AdminUser }> {
  const res = await apiFetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Đăng nhập không thành công');
  csrfToken = data.data?.csrfToken || null;
  return data.data;
}

export async function adminLogout(): Promise<void> {
  await apiFetch(`${API_BASE}/admin/logout`, { method: 'POST' });
}

export async function adminGetMe(): Promise<AdminUser | null> {
  const res = await apiFetch(`${API_BASE}/admin/me`);
  if (!res.ok) return null;
  const data = await res.json();
  csrfToken = data.data?.csrfToken || csrfToken;
  return data.data;
}

export async function adminChangePassword(newPassword: string) {
  const res = await apiFetch(`${API_BASE}/admin/change-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể đổi mật khẩu');
  return data;
}

export async function adminGetDonations(params: { status?: string; search?: string; page?: number; limit?: number }) {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.search) query.append('search', params.search);
  if (params.page) query.append('page', params.page.toString());
  if (params.limit) query.append('limit', params.limit.toString());

  const res = await apiFetch(`${API_BASE}/admin/donations?${query.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể tải danh sách ủng hộ');
  return data.data;
}

export async function adminApproveDonation(id: string, actualAmount?: number) {
  const res = await apiFetch(`${API_BASE}/admin/donations/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actualAmount }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể duyệt bản ghi');
  return data;
}

export async function adminRejectDonation(id: string, reason: string) {
  const res = await apiFetch(`${API_BASE}/admin/donations/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể từ chối');
  return data;
}

export async function adminAssignDonation(id: string, targetCode: string) {
  const res = await apiFetch(`${API_BASE}/admin/donations/${id}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetCode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể gán');
  return data;
}

export async function adminEraseDonorData(id: string) {
  const res = await apiFetch(`${API_BASE}/admin/donations/${id}/donor-data`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể xóa dữ liệu');
  return data;
}

export async function adminDeleteDonation(id: string) {
  const res = await apiFetch(`${API_BASE}/admin/donations/${id}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể xóa bản ghi ủng hộ');
  return data;
}

export async function adminGetSettings() {
  const res = await apiFetch(`${API_BASE}/admin/settings`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể tải cài đặt');
  return data.data;
}

export async function adminUpdateSettings(settings: Record<string, any>) {
  const res = await apiFetch(`${API_BASE}/admin/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể lưu cài đặt');
  return data;
}
