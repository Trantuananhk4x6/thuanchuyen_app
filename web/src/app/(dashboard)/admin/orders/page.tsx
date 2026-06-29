"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api/client";
import {
  ClockIcon, MapPinIcon, UserIcon, PhoneIcon, SeatIcon,
  CheckCircleIcon, AlertTriangleIcon, XIcon, RouteIcon, CarIcon, StarIcon,
} from "@/components/ui/Icons";

interface Customer { id: string; fullName: string | null; phone: string | null; email: string | null }
interface DriverProfile {
  vehiclePlate: string; vehicleType: string; rating: number;
  user: { fullName: string | null; phone: string | null };
}
interface Match { id: string; status: string; driverProfileId?: string; driverProfile?: DriverProfile }
interface Order {
  id: string;
  passengerName: string; passengerPhone: string; note?: string | null;
  pickupAddress: string; dropoffAddress: string;
  departureTime: string; seats: number;
  quotedPrice: number; distanceKm: number; durationMin: number;
  status: string; bookingMode: string;
  createdAt: string; expiresAt: string;
  customer: Customer;
  matches: Match[];
}

const STATUS_COLOR: Record<string, string> = {
  PENDING:   "#fbbf24",
  MATCHED:   "#6366f1",
  CANCELLED: "#f87171",
  EXPIRED:   "#94a3b8",
};
const STATUS_LABEL: Record<string, string> = {
  PENDING:   "Chờ tài xế",
  MATCHED:   "Đã ghép",
  CANCELLED: "Đã huỷ",
  EXPIRED:   "Hết hạn",
};

export default function AdminOrdersPage() {
  const [orders,      setOrders]      = useState<Order[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState("PENDING");
  const [selected,    setSelected]    = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelling,  setCancelling]  = useState(false);
  const [error,       setError]       = useState("");

  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await api.get<{ items: Order[]; total: number }>(
        `/admin/orders?page=${page}&limit=${limit}&status=${filter}`
      );
      setOrders(r.data.items);
      setTotal(r.data.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { void load(); }, [load]);

  const openDetail = async (o: Order) => {
    setSelected(o);
    setDetailLoading(true);
    try {
      const r = await api.get<{ order: Order }>(`/admin/orders/${o.id}`);
      setSelected(r.data.order);
    } catch { /* giữ data cũ nếu fetch lỗi */ }
    finally { setDetailLoading(false); }
  };

  const cancelOrder = async (id: string) => {
    if (!confirm("Xác nhận huỷ đơn hàng này?")) return;
    setCancelling(true);
    try {
      await api.patch(`/admin/orders/${id}`, {});
      setSelected(null);
      void load();
    } catch (e) { alert((e as Error).message); }
    finally { setCancelling(false); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>
          Đơn hàng
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Tổng: <strong style={{ color: "var(--text-primary)" }}>{total}</strong> đơn · {filter === "PENDING" ? "Đang chờ tài xế nhận" : STATUS_LABEL[filter]}
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {(["PENDING", "MATCHED", "CANCELLED", "EXPIRED"] as const).map((s) => (
          <button key={s} onClick={() => { setFilter(s); setPage(1); }} style={{
            padding: "7px 16px", borderRadius: 99, cursor: "pointer",
            border: `1px solid ${filter === s ? STATUS_COLOR[s] : "var(--border-subtle)"}`,
            background: filter === s ? `${STATUS_COLOR[s]}18` : "var(--bg-overlay)",
            color: filter === s ? STATUS_COLOR[s] : "var(--text-muted)",
            fontWeight: filter === s ? 700 : 400, fontSize: 13,
            transition: "all .15s",
          }}>
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 16, background: "var(--danger-bg)", border: "1px solid var(--danger-border)", color: "var(--danger)", fontSize: 13 }}>
          <AlertTriangleIcon size={13} style={{ marginRight: 6, verticalAlign: "middle" }}/>{error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 16, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <span style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(99,102,241,.2)", borderTopColor: "#6366f1", animation: "spin .8s linear infinite", display: "inline-block" }}/>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <CheckCircleIcon size={36} color="var(--text-muted)" style={{ opacity: .3, marginBottom: 12 }}/>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Không có đơn nào</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg-elevated)" }}>
                  {["Hành khách", "Tuyến đường", "Giờ đi", "Ghế", "Giá", "Trạng thái", ""].map((h) => (
                    <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: .5, borderBottom: "1px solid var(--border-subtle)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background .1s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-overlay)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Passenger */}
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{o.passengerName}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                        <PhoneIcon size={10}/> {o.passengerPhone}
                      </div>
                      {o.customer.phone && o.customer.phone !== o.passengerPhone && (
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                          TK: {o.customer.fullName ?? o.customer.phone}
                        </div>
                      )}
                    </td>
                    {/* Route */}
                    <td style={{ padding: "12px 14px", maxWidth: 220 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22d3ee", marginTop: 4, flexShrink: 0 }}/>
                        <span style={{ color: "var(--text-secondary)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{o.pickupAddress}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: 1, background: "#f472b6", marginTop: 4, flexShrink: 0 }}/>
                        <span style={{ color: "var(--text-secondary)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{o.dropoffAddress}</span>
                      </div>
                    </td>
                    {/* Time */}
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      <div style={{ fontSize: 13, color: "var(--text-primary)" }}>
                        {new Date(o.departureTime).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                        ~{o.durationMin} phút · {o.distanceKm.toFixed(0)} km
                      </div>
                    </td>
                    {/* Seats */}
                    <td style={{ padding: "12px 14px", textAlign: "center" }}>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{o.seats}</span>
                    </td>
                    {/* Price */}
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                      <span style={{ fontWeight: 700, color: "#34d399" }}>{o.quotedPrice.toLocaleString("vi-VN")}đ</span>
                    </td>
                    {/* Status */}
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                        background: `${STATUS_COLOR[o.status] ?? "#94a3b8"}18`,
                        border: `1px solid ${STATUS_COLOR[o.status] ?? "#94a3b8"}40`,
                        color: STATUS_COLOR[o.status] ?? "#94a3b8",
                      }}>
                        {STATUS_LABEL[o.status] ?? o.status}
                      </span>
                      {o.matches[0]?.driverProfile && (
                        <div style={{ fontSize: 10, color: "#22d3ee", marginTop: 3, display: "flex", alignItems: "center", gap: 3 }}>
                          <CarIcon size={9} color="#22d3ee"/>
                          {o.matches[0].driverProfile.user.fullName ?? o.matches[0].driverProfile.vehiclePlate}
                        </div>
                      )}
                    </td>
                    {/* Action */}
                    <td style={{ padding: "12px 14px" }}>
                      <button onClick={() => openDetail(o)} style={{
                        padding: "5px 12px", borderRadius: 7, cursor: "pointer",
                        background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
                        color: "var(--text-secondary)", fontSize: 12, fontWeight: 600,
                        transition: "all .15s",
                      }}>
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 20 }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "6px 14px", borderRadius: 8, cursor: page === 1 ? "not-allowed" : "pointer", background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)", color: page === 1 ? "var(--text-muted)" : "var(--text-primary)", fontSize: 13 }}>← Trước</button>
          <span style={{ padding: "6px 16px", fontSize: 13, color: "var(--text-secondary)" }}>{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: "6px 14px", borderRadius: 8, cursor: page === totalPages ? "not-allowed" : "pointer", background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)", color: page === totalPages ? "var(--text-muted)" : "var(--text-primary)", fontSize: 13 }}>Sau →</button>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
        >
          <div style={{ background: "var(--bg-surface)", borderRadius: 20, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,.4)" }}>
            {/* Modal header */}
            <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>Chi tiết đơn hàng</h3>
                <code style={{ fontSize: 11, color: "var(--text-muted)" }}>{selected.id}</code>
              </div>
              <button onClick={() => setSelected(null)} style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)", cursor: "pointer", color: "var(--text-muted)" }}>
                <XIcon size={14}/>
              </button>
            </div>

            <div style={{ padding: 20 }}>
              {/* Status badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <span style={{ padding: "5px 14px", borderRadius: 99, fontWeight: 700, fontSize: 13, background: `${STATUS_COLOR[selected.status] ?? "#94a3b8"}20`, color: STATUS_COLOR[selected.status] ?? "#94a3b8", border: `1px solid ${STATUS_COLOR[selected.status] ?? "#94a3b8"}40` }}>
                  {STATUS_LABEL[selected.status] ?? selected.status}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {new Date(selected.createdAt).toLocaleString("vi-VN")}
                </span>
              </div>

              {/* Passenger */}
              <Section title="Thông tin hành khách" icon={<UserIcon size={13} color="#6366f1"/>}>
                <Row label="Tên" value={selected.passengerName}/>
                <Row label="SĐT hành khách" value={selected.passengerPhone}/>
                {selected.note && <Row label="Ghi chú" value={selected.note}/>}
                <div style={{ height: 1, background: "var(--border-subtle)", margin: "10px 0" }}/>
                <Row label="Tài khoản" value={selected.customer.fullName ?? "—"}/>
                <Row label="SĐT tài khoản" value={selected.customer.phone ?? "—"}/>
                {selected.customer.email && <Row label="Email" value={selected.customer.email}/>}
              </Section>

              {/* Route */}
              <Section title="Tuyến đường" icon={<RouteIcon size={13} color="#22d3ee"/>}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22d3ee", marginTop: 4, flexShrink: 0 }}/>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Điểm đón</div>
                      <div style={{ fontSize: 13, color: "var(--text-primary)" }}>{selected.pickupAddress}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: "#f472b6", marginTop: 4, flexShrink: 0 }}/>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Điểm trả</div>
                      <div style={{ fontSize: 13, color: "var(--text-primary)" }}>{selected.dropoffAddress}</div>
                    </div>
                  </div>
                </div>
                <Row label="Giờ khởi hành" value={new Date(selected.departureTime).toLocaleString("vi-VN")}/>
                <Row label="Số ghế" value={`${selected.seats} ghế`}/>
                <Row label="Khoảng cách" value={`${selected.distanceKm.toFixed(1)} km · ~${selected.durationMin} phút`}/>
                <Row label="Giá ước tính" value={`${selected.quotedPrice.toLocaleString("vi-VN")}đ`} highlight/>
              </Section>

              {/* Driver info */}
              {detailLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(99,102,241,.2)", borderTopColor: "#6366f1", animation: "spin .8s linear infinite", display: "inline-block" }}/>
                </div>
              ) : selected.matches.length > 0 && (
                <Section title="Tài xế nhận đơn" icon={<CarIcon size={13} color="#22d3ee"/>}>
                  {selected.matches.map((m) => {
                    const dp = m.driverProfile;
                    return (
                      <div key={m.id}>
                        {dp ? (
                          <>
                            <Row label="Tên tài xế"  value={dp.user.fullName ?? "—"}/>
                            <Row label="SĐT tài xế"  value={dp.user.phone    ?? "—"}/>
                            <Row label="Biển số xe"   value={dp.vehiclePlate}/>
                            <Row label="Loại xe"      value={dp.vehicleType}/>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Đánh giá</span>
                              <span style={{ fontSize: 13, fontWeight: 500, color: "#fbbf24", display: "flex", alignItems: "center", gap: 4 }}>
                                <StarIcon size={12} color="#fbbf24"/> {dp.rating.toFixed(1)}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "6px 0" }}>Không có thông tin tài xế</div>
                        )}
                      </div>
                    );
                  })}
                </Section>
              )}

              {/* Admin actions */}
              {selected.status === "PENDING" && (
                <button onClick={() => cancelOrder(selected.id)} disabled={cancelling} style={{
                  width: "100%", padding: "11px",
                  background: "var(--danger-bg)", border: "1px solid var(--danger-border)",
                  borderRadius: 10, cursor: "pointer", color: "var(--danger)",
                  fontWeight: 600, fontSize: 14, marginTop: 8,
                }}>
                  {cancelling ? "Đang huỷ..." : "Huỷ đơn này"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg-overlay)", borderRadius: 12, padding: 14, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12, fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: .5 }}>
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--border-subtle)" }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: highlight ? 700 : 500, color: highlight ? "#34d399" : "var(--text-primary)" }}>{value}</span>
    </div>
  );
}
