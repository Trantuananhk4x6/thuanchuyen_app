"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";

interface Report {
  id: string;
  reason: string;
  description: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  reporter: { fullName: string | null; phone: string };
  reportedUser: { fullName: string | null; phone: string };
}

const STATUS_BADGE: Record<string, string> = {
  OPEN: "badge-red", INVESTIGATING: "badge-amber",
  RESOLVED: "badge-green", DISMISSED: "badge-gray",
};

export default function AdminReportsPage() {
  const [items, setItems] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("OPEN");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Report | null>(null);
  const [newStatus, setNewStatus] = useState("INVESTIGATING");
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = (p = page, s = status) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p), limit: "20", ...(s ? { status: s } : {}) });
    api.get<{ items: Report[]; total: number }>(`/admin/reports?${q}`)
      .then((r) => { setItems(r.data.items); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.patch(`/admin/reports/${selected.id}`, { status: newStatus, adminNote });
      setSelected(null);
      load();
    } catch (e) { alert((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <h1 className="font-semibold mb-6" style={{ fontSize: 22 }}>Xử lý báo cáo</h1>

      <div className="card mb-4">
        <div className="card-body flex gap-4">
          {["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"].map((s) => (
            <button
              key={s}
              className={`btn ${status === s ? "btn-primary" : "btn-outline"} btn-sm`}
              onClick={() => { setStatus(s); setPage(1); load(1, s); }}
            >
              {s === "OPEN" ? "Mới" : s === "INVESTIGATING" ? "Đang xử lý" : s === "RESOLVED" ? "Đã giải quyết" : "Bỏ qua"}
              {s === status && ` (${total})`}
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="card mb-4" style={{ borderColor: "#3b82f6" }}>
          <div className="card-header">Xử lý báo cáo #{selected.id.slice(-8)}</div>
          <div className="card-body">
            <p className="mb-3"><strong>Người báo cáo:</strong> {selected.reporter.fullName ?? selected.reporter.phone}</p>
            <p className="mb-3"><strong>Bị báo cáo:</strong> {selected.reportedUser.fullName ?? selected.reportedUser.phone}</p>
            <p className="mb-3"><strong>Lý do:</strong> {selected.reason}</p>
            <p className="mb-4 text-sm text-gray">{selected.description}</p>
            <div className="form-group">
              <label className="form-label">Chuyển trạng thái</label>
              <select className="form-input" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                <option value="INVESTIGATING">Đang xử lý</option>
                <option value="RESOLVED">Đã giải quyết</option>
                <option value="DISMISSED">Bỏ qua</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ghi chú admin</label>
              <input className="form-input" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Ghi chú nội bộ..." />
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>Lưu</button>
              <button className="btn btn-outline" onClick={() => setSelected(null)}>Huỷ</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Người báo cáo</th><th>Bị báo cáo</th><th>Lý do</th><th>Trạng thái</th><th>Ngày tạo</th><th></th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 24 }}>Đang tải...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#9ca3af" }}>Không có báo cáo nào</td></tr>
              ) : items.map((r) => (
                <tr key={r.id}>
                  <td>{r.reporter.fullName ?? r.reporter.phone}</td>
                  <td>{r.reportedUser.fullName ?? r.reportedUser.phone}</td>
                  <td style={{ maxWidth: 200 }}>{r.reason}</td>
                  <td><span className={`badge ${STATUS_BADGE[r.status] ?? "badge-gray"}`}>{r.status}</span></td>
                  <td style={{ fontSize: 12 }}>{new Date(r.createdAt).toLocaleDateString("vi-VN")}</td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => { setSelected(r); setNewStatus("INVESTIGATING"); setAdminNote(r.adminNote ?? ""); }}>
                      Xử lý
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 20 && (
          <div className="card-body flex gap-2 items-center">
            <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => { setPage(page - 1); load(page - 1); }}>← Trước</button>
            <span className="text-sm text-gray">Trang {page} / {Math.ceil(total / 20)}</span>
            <button className="btn btn-outline btn-sm" disabled={page >= Math.ceil(total / 20)} onClick={() => { setPage(page + 1); load(page + 1); }}>Sau →</button>
          </div>
        )}
      </div>
    </div>
  );
}
