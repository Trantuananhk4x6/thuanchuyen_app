"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";

interface Driver {
  id: string;
  vehiclePlate: string;
  vehicleType: string;
  verificationStatus: string;
  rejectReason: string | null;
  createdAt: string;
  user: { phone: string; fullName: string | null };
}

const statusBadge = (s: string) => {
  if (s === "APPROVED") return <span className="badge badge-green">Đã duyệt</span>;
  if (s === "PENDING")  return <span className="badge badge-amber">Chờ duyệt</span>;
  if (s === "REJECTED") return <span className="badge badge-red">Từ chối</span>;
  return <span className="badge badge-gray">{s}</span>;
};

export default function AdminDriversPage() {
  const [items, setItems] = useState<Driver[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true); setError("");
    api.get<{ items: Driver[]; total: number }>(`/admin/drivers?status=${status}&limit=50`)
      .then((r) => { setItems(r.data.items); setTotal(r.data.total); })
      .catch(() => setError("Không tải được danh sách tài xế"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [status]);

  const approve = async (id: string) => {
    setActionLoading(id);
    try {
      await api.post(`/admin/drivers/${id}/approve`, {});
      load();
    } finally { setActionLoading(null); }
  };

  const reject = async (id: string) => {
    if (!rejectReason.trim()) return;
    setActionLoading(id);
    try {
      await api.post(`/admin/drivers/${id}/reject`, { reason: rejectReason });
      setRejectTarget(null);
      setRejectReason("");
      load();
    } finally { setActionLoading(null); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-semibold" style={{ fontSize: 22 }}>
          Tài xế & KYC ({total})
        </h1>
        <select
          className="form-input"
          style={{ width: "auto" }}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="PENDING">Chờ duyệt</option>
          <option value="APPROVED">Đã duyệt</option>
          <option value="REJECTED">Từ chối</option>
        </select>
      </div>

      {error && (
        <div className="alert alert-error mb-4">{error}</div>
      )}

      {rejectTarget && (
        <div className="card mb-4">
          <div className="card-body">
            <p className="mb-4 font-semibold">Nhập lý do từ chối:</p>
            <input
              className="form-input mb-4"
              placeholder="Ảnh CCCD không rõ / Biển số không khớp..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-2">
              <button className="btn btn-danger" onClick={() => reject(rejectTarget)}>
                Xác nhận từ chối
              </button>
              <button className="btn btn-outline" onClick={() => setRejectTarget(null)}>
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-wrapper">
          {loading ? (
            <p style={{ padding: 20 }}>Đang tải...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Tài xế</th>
                  <th>SĐT</th>
                  <th>Biển số</th>
                  <th>Loại xe</th>
                  <th>Trạng thái</th>
                  <th>Ngày gửi</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id}>
                    <td>{d.user.fullName ?? "—"}</td>
                    <td>{d.user.phone}</td>
                    <td style={{ fontWeight: 600 }}>{d.vehiclePlate}</td>
                    <td>{d.vehicleType}</td>
                    <td>{statusBadge(d.verificationStatus)}</td>
                    <td className="text-gray text-sm">
                      {new Date(d.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td>
                      {d.verificationStatus === "PENDING" && (
                        <div className="flex gap-2">
                          <button
                            className="btn btn-success btn-sm"
                            disabled={actionLoading === d.id}
                            onClick={() => approve(d.id)}
                          >
                            Duyệt
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => { setRejectTarget(d.id); setRejectReason(""); }}
                          >
                            Từ chối
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 20, textAlign: "center", color: "#9ca3af" }}>Không có dữ liệu</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
