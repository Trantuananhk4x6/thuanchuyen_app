"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";

interface Withdrawal {
  id: string;
  amount: number;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
  status: string;
  createdAt: string;
  driverProfile: { user: { phone: string; fullName: string | null } };
}

const statusBadge = (s: string) => {
  if (s === "APPROVED")  return <span className="badge badge-green">Đã duyệt</span>;
  if (s === "PENDING")   return <span className="badge badge-amber">Chờ duyệt</span>;
  if (s === "REJECTED")  return <span className="badge badge-red">Từ chối</span>;
  if (s === "DONE")      return <span className="badge badge-green">Hoàn tất</span>;
  return <span className="badge badge-gray">{s}</span>;
};

export default function AdminWithdrawalsPage() {
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [status, setStatus] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true); setError("");
    api.get<{ items: Withdrawal[] }>(`/admin/withdrawals?status=${status}&limit=50`)
      .then((r) => setItems(r.data.items))
      .catch(() => setError("Không tải được dữ liệu rút tiền"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [status]);

  const approve = async (id: string) => {
    setActionId(id);
    try { await api.post(`/admin/withdrawals/${id}/approve`, {}); load(); }
    finally { setActionId(null); }
  };

  const reject = async (id: string) => {
    if (!rejectNote.trim()) return;
    setActionId(id);
    try {
      await api.post(`/admin/withdrawals/${id}/reject`, { note: rejectNote });
      setRejectTarget(null);
      setRejectNote("");
      load();
    } finally { setActionId(null); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-semibold" style={{ fontSize: 22 }}>Yêu cầu rút tiền</h1>
        <select className="form-input" style={{ width: "auto" }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="PENDING">Chờ duyệt</option>
          <option value="APPROVED">Đã duyệt</option>
          <option value="REJECTED">Từ chối</option>
          <option value="DONE">Hoàn tất</option>
        </select>
      </div>

      {error && (
        <div className="alert alert-error mb-4">{error}</div>
      )}

      {rejectTarget && (
        <div className="card mb-4">
          <div className="card-body">
            <p className="mb-4 font-semibold">Lý do từ chối:</p>
            <input className="form-input mb-4" placeholder="Lý do..." value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
            <div className="flex gap-2">
              <button className="btn btn-danger" onClick={() => reject(rejectTarget)}>Từ chối</button>
              <button className="btn btn-outline" onClick={() => setRejectTarget(null)}>Huỷ</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-wrapper">
          {loading ? <p style={{ padding: 20 }}>Đang tải...</p> : (
            <table>
              <thead>
                <tr>
                  <th>Tài xế</th><th>SĐT</th><th>Số tiền</th><th>Ngân hàng</th><th>Số TK</th><th>Trạng thái</th><th>Ngày</th><th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {items.map((w) => (
                  <tr key={w.id}>
                    <td>{w.driverProfile.user.fullName ?? "—"}</td>
                    <td>{w.driverProfile.user.phone}</td>
                    <td style={{ fontWeight: 600 }}>{w.amount.toLocaleString()}đ</td>
                    <td>{w.bankName}</td>
                    <td className="text-sm">{w.bankAccountName} — {w.bankAccountNo}</td>
                    <td>{statusBadge(w.status)}</td>
                    <td className="text-gray text-sm">{new Date(w.createdAt).toLocaleDateString("vi-VN")}</td>
                    <td>
                      {w.status === "PENDING" && (
                        <div className="flex gap-2">
                          <button className="btn btn-success btn-sm" disabled={actionId === w.id} onClick={() => approve(w.id)}>Duyệt</button>
                          <button className="btn btn-danger btn-sm" onClick={() => { setRejectTarget(w.id); setRejectNote(""); }}>Từ chối</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && <tr><td colSpan={8} style={{ padding: 20, textAlign: "center", color: "#9ca3af" }}>Không có dữ liệu</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
