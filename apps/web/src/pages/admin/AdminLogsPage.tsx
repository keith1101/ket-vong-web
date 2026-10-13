import React, { useState, useEffect } from 'react';
import { ShieldCheck, Mail, RefreshCw } from 'lucide-react';
import { API_BASE, apiFetch } from '../../api';

export const AdminLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<{ auditLogs: any[]; emailLogs: any[] }>({ auditLogs: [], emailLogs: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'audit' | 'email'>('audit');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/admin/logs`);
      const json = await res.json();
      setLogs(json.data || { auditLogs: [], emailLogs: [] });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resendEmail = async (id: string) => {
    const res = await apiFetch(`${API_BASE}/admin/emails/${id}/resend`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data?.error?.message || data?.message || 'Không thể gửi lại email.');
    await loadLogs();
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display font-bold text-2xl text-brand-text">
            Nhật ký hệ thống
          </h2>
          <p className="text-xs text-brand-textMuted mt-1">
            Lịch sử thao tác quản trị viên và nhật ký gửi email cảm ơn tự động.
          </p>
        </div>
        <button
          onClick={loadLogs}
          className="p-2 rounded-xl bg-brand-accent text-brand-orange hover:bg-brand-orange/20 transition-colors min-h-touch min-w-touch flex items-center justify-center"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex border-b border-brand-border">
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-5 py-2.5 font-bold text-xs border-b-2 transition-colors min-h-touch ${
            activeTab === 'audit' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-brand-textMuted'
          }`}
        >
          Nhật ký thao tác quản trị ({logs.auditLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('email')}
          className={`px-5 py-2.5 font-bold text-xs border-b-2 transition-colors min-h-touch ${
            activeTab === 'email' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-brand-textMuted'
          }`}
        >
          Nhật ký email ({logs.emailLogs.length})
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-brand-border shadow-sm">
        {loading ? (
          <div className="text-center py-10 text-xs text-brand-textMuted">Đang tải nhật ký...</div>
        ) : activeTab === 'audit' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-bg text-brand-text font-bold border-b border-brand-border">
                <tr>
                  <th className="py-2.5 px-3">Thời Gian</th>
                  <th className="py-2.5 px-3">Admin</th>
                  <th className="py-2.5 px-3">Hành Động</th>
                  <th className="py-2.5 px-3">Đối Tượng</th>
                  <th className="py-2.5 px-3">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {logs.auditLogs.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2.5 px-3 text-brand-textMuted">{new Date(l.created_at).toLocaleString('vi-VN')}</td>
                    <td className="py-2.5 px-3 font-semibold">{l.admin_name}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-brand-orange">{l.action}</td>
                    <td className="py-2.5 px-3 font-mono">{l.target}</td>
                    <td className="py-2.5 px-3 text-brand-textMuted">{l.details || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-bg text-brand-text font-bold border-b border-brand-border">
                <tr>
                  <th className="py-2.5 px-3">Thời Gian</th>
                  <th className="py-2.5 px-3">Người Nhận</th>
                  <th className="py-2.5 px-3">Tiêu Đề</th>
                  <th className="py-2.5 px-3">Trạng Thái</th>
                  <th className="py-2.5 px-3">Chi Tiết / Lỗi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {logs.emailLogs.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2.5 px-3 text-brand-textMuted">{new Date(l.sent_at).toLocaleString('vi-VN')}</td>
                    <td className="py-2.5 px-3 font-semibold">{l.recipient_email}</td>
                    <td className="py-2.5 px-3">{l.subject}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          l.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-brand-textMuted">
                      {l.error_message || l.message_id || '-'}
                      {l.status === 'failed' && <button onClick={() => resendEmail(l.id).catch((e) => alert(e.message))} className="ml-2 text-brand-orange font-bold hover:underline">Gửi lại</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

