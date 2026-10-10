import type { FundSummary, PublicDonationItem, AdminUser, Donation, DailyReport } from './types';

const API_BASE = '/api/v1';

export async function fetchFundSummary(): Promise<FundSummary> {
  const res = await fetch(`${API_BASE}/fund/summary`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể tải thông tin quỹ');
  return data.data;
}

export async function submitDonation(payload: {
  quantity: number;
  displayName: string;
  title: string;
  email: string;
  phone?: string;
  publicMessage?: string;
  isAnonymous?: boolean;
  consent: boolean;
}) {
  const res = await fetch(`${API_BASE}/donations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể gửi yêu cầu ủng hộ');
  return data.data;
}

export async function fetchDonationTransfer(code: string) {
  const res = await fetch(`${API_BASE}/donations/${encodeURIComponent(code)}/transfer`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể tải thông tin chuyển khoản');
  return data.data;
}

export async function fetchPublicDonations(page = 1, limit = 20): Promise<{
  items: PublicDonationItem[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
}> {
  const res = await fetch(`${API_BASE}/donations/public?page=${page}&limit=${limit}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể tải danh sách minh bạch');
  return data.data;
}

export async function verifyReceipt(code: string, token: string) {
  const res = await fetch(`${API_BASE}/receipts/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, token }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không tìm thấy biên nhận');
  return data.data;
}

export async function fetchDailyReports(): Promise<DailyReport[]> {
  const res = await fetch(`${API_BASE}/fund/reports`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể tải danh sách báo cáo');
  return data.data;
}

export async function adminGetReports(): Promise<DailyReport[]> {
  const res = await fetch(`${API_BASE}/admin/reports`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể tải báo cáo quản trị');
  return data.data;
}

// -----------------------------------------------------------------------------
// ADMIN API
// -----------------------------------------------------------------------------

export async function adminLogin(email: string, password: string): Promise<{ admin: AdminUser }> {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Đăng nhập không thành công');
  return data.data;
}

export async function adminLogout(): Promise<void> {
  await fetch(`${API_BASE}/admin/logout`, { method: 'POST' });
}

export async function adminGetMe(): Promise<AdminUser | null> {
  const res = await fetch(`${API_BASE}/admin/me`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.data;
}

export async function adminChangePassword(newPassword: string) {
  const res = await fetch(`${API_BASE}/admin/change-password`, {
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

  const res = await fetch(`${API_BASE}/admin/donations?${query.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể tải danh sách ủng hộ');
  return data.data;
}

export async function adminApproveDonation(id: string, actualAmount?: number) {
  const res = await fetch(`${API_BASE}/admin/donations/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actualAmount }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể duyệt bản ghi');
  return data;
}

export async function adminRejectDonation(id: string, reason: string) {
  const res = await fetch(`${API_BASE}/admin/donations/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể từ chối');
  return data;
}

export async function adminAssignDonation(id: string, targetCode: string) {
  const res = await fetch(`${API_BASE}/admin/donations/${id}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetCode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể gán');
  return data;
}

export async function adminEraseDonorData(id: string) {
  const res = await fetch(`${API_BASE}/admin/donations/${id}/donor-data`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể xóa dữ liệu');
  return data;
}

export async function adminGetSettings() {
  const res = await fetch(`${API_BASE}/admin/settings`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể tải cài đặt');
  return data.data;
}

export async function adminUpdateSettings(settings: Record<string, any>) {
  const res = await fetch(`${API_BASE}/admin/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Không thể lưu cài đặt');
  return data;
}

export async function adminGetSepayUsage() {
  const res = await fetch(`${API_BASE}/admin/sepay-usage`);
  const data = await res.json();
  if (!res.ok) return { used: 0, limit: 50, isNearLimit: false, isOverLimit: false };
  return data.data;
}

