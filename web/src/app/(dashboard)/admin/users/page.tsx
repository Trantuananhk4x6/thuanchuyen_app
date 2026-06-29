"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";

interface User {
  id: string;
  phone: string;
  fullName: string | null;
  role: string;
  isBlocked: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [items, setItems] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = (p = page, f = filter) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p), limit: "20", ...(f ? { status: f } : {}) });
    api.get<{ items: User[]; total: number }>(`/admin/users?${q}`)
      .then((r) => { setItems(r.data.items); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleBlock = async (user: User) => {
    const action = user.isBlocked ? "mở khóa" : "khóa";
    if (!confirm(`Bạn có chắc muốn ${action} tài khoản ${user.phone}?`)) return;
    try {
      await api.patch(`/admin/users/${user.id}`, { isBlocked: !user.isBlocked });
      load();
    } catch (e) { alert((e as Error).message); }
  };

  const ROLE_BADGE: Record<string, string> = {
    CUSTOMER: "badge-blue", DRIVER: "badge-green", ADMIN: "badge-red",
  };
  const ROLE_LABEL: Record<string, string> = {
    CUSTOMER: "Khách", DRIVER: "Tài xế", ADMIN: "Admin",
  };

  return (
    <div>
      <h1 className="font-semibold mb-6" style={{ fontSize: 22 }}>Quản lý người dùng</h1>

      <div className="card mb-4">
        <div className="card-body flex gap-4">
          <select
            className="form-input"
            style={{ width: 180 }}
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1); load(1, e.target.value); }}
          >
            <option value="">Tất cả</option>
            <option value="blocked">Đã bị khóa</option>
          </select>
          <span className="text-sm text-gray" style={{ lineHeight: "38px" }}>
            Tổng: {total} người dùng
          </span>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Số điện thoại</th><th>Họ tên</th><th>Vai trò</th><th>Trạng thái</th><th>Ngày tạo</th><th></th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 24 }}>Đang tải...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#9ca3af" }}>Không có dữ liệu</td></tr>
              ) : items.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.phone}</td>
                  <td>{u.fullName ?? <span className="text-gray">—</span>}</td>
                  <td><span className={`badge ${ROLE_BADGE[u.role] ?? "badge-gray"}`}>{ROLE_LABEL[u.role] ?? u.role}</span></td>
                  <td>
                    {u.isBlocked
                      ? <span className="badge badge-red">Đã khóa</span>
                      : <span className="badge badge-green">Hoạt động</span>}
                  </td>
                  <td style={{ fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString("vi-VN")}</td>
                  <td>
                    <button
                      className={`btn btn-sm ${u.isBlocked ? "btn-success" : "btn-danger"}`}
                      onClick={() => toggleBlock(u)}
                    >
                      {u.isBlocked ? "Mở khóa" : "Khóa"}
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
