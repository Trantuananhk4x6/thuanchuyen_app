"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api/client";
import {
  TicketIcon, ImageIcon, CalendarIcon, PlusIcon, TrashIcon, EditIcon,
  CheckCircleIcon, XIcon, ZapIcon, GiftIcon, MegaphoneIcon,
} from "@/components/ui/Icons";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type VoucherType = "PERCENT" | "FIXED_AMOUNT" | "FREE_TRIP";
type VoucherStatus = "ACTIVE" | "PAUSED" | "EXPIRED" | "EXHAUSTED";
type BannerPosition = "HOME_TOP" | "HOME_BOTTOM" | "TRIP_LISTING" | "BOOKING_CONFIRM";
type EventStatus = "DRAFT" | "ACTIVE" | "ENDED";
type EventType = "CASHBACK" | "DOUBLE_POINT" | "DISCOUNT" | "FREE_RIDE" | "STREAK_BONUS" | "REFERRAL";
type Audience = "ALL" | "NEW_USER" | "DRIVER" | "CUSTOMER";

interface Voucher {
  id: string; code: string; name: string; description?: string;
  type: VoucherType; value: number; minOrderValue: number; maxDiscount?: number;
  usageLimit?: number; usedCount: number; userLimit: number;
  startsAt: string; expiresAt: string; status: VoucherStatus; targetRole?: string;
  createdAt: string;
}

interface Banner {
  id: string; title: string; imageUrl: string; linkUrl?: string;
  position: BannerPosition; sortOrder: number; active: boolean;
  startsAt?: string; expiresAt?: string; clickCount: number; viewCount: number;
  createdAt: string;
}

interface PromotionEvent {
  id: string; name: string; description: string; imageUrl?: string;
  type: EventType; config: Record<string, unknown>; targetAudience?: string;
  status: EventStatus; startsAt: string; endsAt: string;
  budget?: number; usedBudget: number; createdAt: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const fmtDate = (d: string) => new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
const fmtMoney = (n: number) => n.toLocaleString("vi-VN") + " VND";
const fmtPct = (n: number) => n + "%";

const VOUCHER_TYPE_LABEL: Record<VoucherType, string> = {
  PERCENT: "Giảm %", FIXED_AMOUNT: "Giảm tiền cố định", FREE_TRIP: "Chuyến miễn phí",
};
const VOUCHER_STATUS_COLOR: Record<VoucherStatus, string> = {
  ACTIVE: "#22d3ee", PAUSED: "#fbbf24", EXPIRED: "#6b7280", EXHAUSTED: "#ef4444",
};
const VOUCHER_STATUS_LABEL: Record<VoucherStatus, string> = {
  ACTIVE: "Đang chạy", PAUSED: "Tạm dừng", EXPIRED: "Hết hạn", EXHAUSTED: "Hết lượt",
};
const BANNER_POSITION_LABEL: Record<BannerPosition, string> = {
  HOME_TOP: "Trang chủ - Trên cùng", HOME_BOTTOM: "Trang chủ - Cuối",
  TRIP_LISTING: "Danh sách chuyến", BOOKING_CONFIRM: "Xác nhận đặt",
};
const EVENT_TYPE_LABEL: Record<EventType, string> = {
  CASHBACK: "Hoàn tiền", DOUBLE_POINT: "Điểm đôi", DISCOUNT: "Giảm giá",
  FREE_RIDE: "Chuyến miễn phí", STREAK_BONUS: "Thưởng Streak", REFERRAL: "Giới thiệu",
};
const EVENT_STATUS_COLOR: Record<EventStatus, string> = {
  DRAFT: "#6b7280", ACTIVE: "#22d3ee", ENDED: "#6366f1",
};
const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  DRAFT: "Nháp", ACTIVE: "Đang chạy", ENDED: "Đã kết thúc",
};

const TAB_LIST = [
  { id: "vouchers", label: "Voucher",  Icon: TicketIcon,  color: "#22d3ee" },
  { id: "banners",  label: "Banner",   Icon: ImageIcon,   color: "#a78bfa" },
  { id: "events",   label: "Sự kiện",  Icon: CalendarIcon, color: "#f97316" },
];

function Badge({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color, background: color + "20", border: `1px solid ${color}50`, borderRadius: 99, padding: "2px 8px" }}>
      {label}
    </span>
  );
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", zIndex: 1, background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 14, width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "auto", boxShadow: "0 25px 60px rgba(0,0,0,.4)" }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, borderRadius: 6, display: "flex" }}>
            <XIcon size={16} />
          </button>
        </div>
        <div style={{ padding: "20px" }}>{children}</div>
      </div>
    </div>
  );
}

function FormRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

/* ─── Voucher tab ─────────────────────────────────────────────────────────── */
function VouchersTab() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<string>("ALL");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: "", name: "", description: "", type: "PERCENT" as VoucherType,
    value: 10, minOrderValue: 0, maxDiscount: "" as string | number,
    usageLimit: "" as string | number, userLimit: 1,
    startsAt: "", expiresAt: "", targetRole: "",
  });

  const load = useCallback(() => {
    setLoading(true);
    api.get<{ vouchers: Voucher[] }>("/admin/vouchers")
      .then(r => setVouchers(r.data.vouchers ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const createVoucher = async () => {
    if (!form.code || !form.name || !form.startsAt || !form.expiresAt) return;
    setSaving(true);
    try {
      await api.post("/admin/vouchers", {
        ...form,
        maxDiscount: form.maxDiscount === "" ? undefined : Number(form.maxDiscount),
        usageLimit: form.usageLimit === "" ? undefined : Number(form.usageLimit),
        targetRole: form.targetRole || undefined,
        startsAt: new Date(form.startsAt).toISOString(),
        expiresAt: new Date(form.expiresAt).toISOString(),
      });
      setShowCreate(false);
      load();
    } finally { setSaving(false); }
  };

  const toggleStatus = async (v: Voucher) => {
    const newStatus = v.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    await api.put(`/admin/vouchers/${v.id}`, { status: newStatus });
    load();
  };

  const deleteVoucher = async (id: string) => {
    if (!confirm("Xóa voucher này?")) return;
    await api.del(`/admin/vouchers/${id}`);
    load();
  };

  const filtered = filter === "ALL" ? vouchers : vouchers.filter(v => v.status === filter);

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Tổng voucher", value: vouchers.length, color: "#6366f1" },
          { label: "Đang chạy", value: vouchers.filter(v => v.status === "ACTIVE").length, color: "#22d3ee" },
          { label: "Tạm dừng", value: vouchers.filter(v => v.status === "PAUSED").length, color: "#fbbf24" },
          { label: "Lượt dùng hôm nay", value: vouchers.reduce((s, v) => s + v.usedCount, 0), color: "#22d3ee" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: "14px 18px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        {["ALL", "ACTIVE", "PAUSED", "EXPIRED", "EXHAUSTED"].map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={filter === f ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"}
            style={{ fontSize: 12, padding: "5px 12px" }}>
            {f === "ALL" ? "Tất cả" : VOUCHER_STATUS_LABEL[f as VoucherStatus]}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <PlusIcon size={14} /> Tạo Voucher
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Mã</th><th>Tên</th><th>Loại</th><th>Giá trị</th>
                <th>Đã dùng / Giới hạn</th><th>Hiệu lực</th><th>Trạng thái</th><th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Đang tải...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Không có voucher nào</td></tr>
              ) : filtered.map(v => (
                <tr key={v.id}>
                  <td><code style={{ fontSize: 12, background: "var(--bg-overlay)", padding: "2px 8px", borderRadius: 4, fontWeight: 700, color: "#22d3ee" }}>{v.code}</code></td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{v.name}</div>
                    {v.description && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{v.description}</div>}
                  </td>
                  <td><span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{VOUCHER_TYPE_LABEL[v.type]}</span></td>
                  <td>
                    <strong style={{ color: "#22d3ee" }}>
                      {v.type === "PERCENT" ? fmtPct(v.value) : v.type === "FIXED_AMOUNT" ? fmtMoney(v.value) : "Miễn phí"}
                    </strong>
                    {v.maxDiscount && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>tối đa {fmtMoney(v.maxDiscount)}</div>}
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ flex: 1, maxWidth: 80, height: 6, borderRadius: 3, background: "var(--bg-overlay)", overflow: "hidden" }}>
                        <div style={{ height: "100%", background: "#22d3ee", width: `${Math.min(100, v.usageLimit ? v.usedCount / v.usageLimit * 100 : 0)}%` }} />
                      </div>
                      <span style={{ fontSize: 12 }}>{v.usedCount}{v.usageLimit ? ` / ${v.usageLimit}` : " / ∞"}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12 }}>{fmtDate(v.startsAt)}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>→ {fmtDate(v.expiresAt)}</div>
                  </td>
                  <td><Badge color={VOUCHER_STATUS_COLOR[v.status]} label={VOUCHER_STATUS_LABEL[v.status]} /></td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      {(v.status === "ACTIVE" || v.status === "PAUSED") && (
                        <button type="button" onClick={() => toggleStatus(v)}
                          style={{ background: "none", border: "1px solid var(--border-subtle)", borderRadius: 6, cursor: "pointer", padding: "4px 8px", fontSize: 11, color: v.status === "ACTIVE" ? "#fbbf24" : "#22d3ee" }}>
                          {v.status === "ACTIVE" ? "Tạm dừng" : "Bật lại"}
                        </button>
                      )}
                      <button type="button" onClick={() => deleteVoucher(v.id)}
                        style={{ background: "none", border: "1px solid var(--border-subtle)", borderRadius: 6, cursor: "pointer", padding: "4px 6px", color: "var(--danger)", display: "flex", alignItems: "center" }}>
                        <TrashIcon size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Tạo Voucher mới">
        <FormRow label="Mã voucher" required>
          <input className="form-input" value={form.code} placeholder="VD: SUMMER20"
            onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
        </FormRow>
        <FormRow label="Tên mô tả" required>
          <input className="form-input" value={form.name} placeholder="Giảm 20% mùa hè"
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </FormRow>
        <FormRow label="Mô tả chi tiết">
          <textarea className="form-input" value={form.description} rows={2} placeholder="Áp dụng cho..."
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            style={{ resize: "vertical" }} />
        </FormRow>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormRow label="Loại khuyến mãi" required>
            <select className="form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as VoucherType }))}>
              <option value="PERCENT">Giảm %</option>
              <option value="FIXED_AMOUNT">Giảm tiền</option>
              <option value="FREE_TRIP">Chuyến miễn phí</option>
            </select>
          </FormRow>
          <FormRow label={form.type === "PERCENT" ? "Phần trăm (%)" : "Số tiền (VND)"} required>
            <input className="form-input" type="number" min={0} value={form.value}
              onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))} />
          </FormRow>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormRow label="Đơn tối thiểu (VND)">
            <input className="form-input" type="number" min={0} value={form.minOrderValue}
              onChange={e => setForm(f => ({ ...f, minOrderValue: Number(e.target.value) }))} />
          </FormRow>
          {form.type === "PERCENT" && (
            <FormRow label="Giảm tối đa (VND)">
              <input className="form-input" type="number" min={0} value={form.maxDiscount}
                placeholder="Không giới hạn"
                onChange={e => setForm(f => ({ ...f, maxDiscount: e.target.value }))} />
            </FormRow>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormRow label="Tổng lượt dùng">
            <input className="form-input" type="number" min={1} value={form.usageLimit}
              placeholder="Không giới hạn"
              onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))} />
          </FormRow>
          <FormRow label="Lượt / người">
            <input className="form-input" type="number" min={1} value={form.userLimit}
              onChange={e => setForm(f => ({ ...f, userLimit: Number(e.target.value) }))} />
          </FormRow>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormRow label="Ngày bắt đầu" required>
            <input className="form-input" type="datetime-local" value={form.startsAt}
              onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} />
          </FormRow>
          <FormRow label="Ngày hết hạn" required>
            <input className="form-input" type="datetime-local" value={form.expiresAt}
              onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
          </FormRow>
        </div>
        <FormRow label="Đối tượng áp dụng">
          <select className="form-input" value={form.targetRole} onChange={e => setForm(f => ({ ...f, targetRole: e.target.value }))}>
            <option value="">Tất cả</option>
            <option value="CUSTOMER">Khách hàng</option>
            <option value="DRIVER">Tài xế</option>
          </select>
        </FormRow>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Hủy</button>
          <button className="btn btn-primary" onClick={createVoucher} disabled={saving}>
            {saving ? "Đang tạo..." : "Tạo Voucher"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Banner tab ─────────────────────────────────────────────────────────── */
function BannersTab() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [posFilter, setPosFilter] = useState("ALL");
  const [form, setForm] = useState({
    title: "", imageUrl: "", linkUrl: "",
    position: "HOME_TOP" as BannerPosition,
    sortOrder: 0, active: true, startsAt: "", expiresAt: "",
  });

  const load = useCallback(() => {
    setLoading(true);
    api.get<{ banners: Banner[] }>("/admin/banners")
      .then(r => setBanners(r.data.banners ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const createBanner = async () => {
    if (!form.title || !form.imageUrl) return;
    setSaving(true);
    try {
      await api.post("/admin/banners", {
        ...form,
        linkUrl: form.linkUrl || undefined,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      });
      setShowCreate(false);
      load();
    } finally { setSaving(false); }
  };

  const toggleBanner = async (b: Banner) => {
    await api.put(`/admin/banners/${b.id}`, { active: !b.active });
    load();
  };

  const deleteBanner = async (id: string) => {
    if (!confirm("Xóa banner này?")) return;
    await api.del(`/admin/banners/${id}`);
    load();
  };

  const positions = ["HOME_TOP", "HOME_BOTTOM", "TRIP_LISTING", "BOOKING_CONFIRM"] as BannerPosition[];
  const filtered = posFilter === "ALL" ? banners : banners.filter(b => b.position === posFilter);

  return (
    <div>
      {/* Stats by position */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {positions.map(pos => {
          const count = banners.filter(b => b.position === pos).length;
          const active = banners.filter(b => b.position === pos && b.active).length;
          return (
            <div key={pos} className="card" style={{ padding: "12px 16px", cursor: "pointer", border: posFilter === pos ? "1px solid #a78bfa" : undefined }}
              onClick={() => setPosFilter(posFilter === pos ? "ALL" : pos)}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                {BANNER_POSITION_LABEL[pos]}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#a78bfa" }}>{count}</div>
              <div style={{ fontSize: 11, color: "#22d3ee" }}>{active} đang hiển thị</div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button type="button" onClick={() => setPosFilter("ALL")}
          style={{ fontSize: 12, color: posFilter === "ALL" ? "#a78bfa" : "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          {posFilter !== "ALL" && "← "} Tất cả vị trí ({banners.length})
        </button>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <PlusIcon size={14} /> Thêm Banner
        </button>
      </div>

      {/* Banner cards */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Đang tải...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {filtered.map(b => (
            <div key={b.id} className="card" style={{ overflow: "hidden", opacity: b.active ? 1 : 0.6 }}>
              {/* Image preview */}
              <div style={{ width: "100%", height: 140, background: "var(--bg-overlay)", position: "relative", overflow: "hidden" }}>
                <img src={b.imageUrl} alt={b.title} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div style={{ position: "absolute", top: 8, left: 8 }}>
                  <Badge color="#a78bfa" label={BANNER_POSITION_LABEL[b.position]} />
                </div>
                <div style={{ position: "absolute", top: 8, right: 8 }}>
                  <Badge color={b.active ? "#22d3ee" : "#6b7280"} label={b.active ? "Hiển thị" : "Ẩn"} />
                </div>
              </div>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{b.title}</div>
                {b.linkUrl && <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.linkUrl}</div>}
                <div style={{ display: "flex", gap: 6, fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
                  <span>👁 {b.viewCount.toLocaleString()}</span>
                  <span>·</span>
                  <span>🖱 {b.clickCount.toLocaleString()}</span>
                  <span>·</span>
                  <span>Thứ tự: {b.sortOrder}</span>
                </div>
                {(b.startsAt || b.expiresAt) && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
                    {b.startsAt && <span>{fmtDate(b.startsAt)} </span>}
                    {b.expiresAt && <span>→ {fmtDate(b.expiresAt)}</span>}
                  </div>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" onClick={() => toggleBanner(b)}
                    className={b.active ? "btn btn-outline btn-sm" : "btn btn-primary btn-sm"}
                    style={{ flex: 1, fontSize: 12 }}>
                    {b.active ? "Ẩn banner" : "Hiển thị"}
                  </button>
                  <button type="button" onClick={() => deleteBanner(b.id)}
                    style={{ background: "none", border: "1px solid var(--border-subtle)", borderRadius: 6, cursor: "pointer", padding: "4px 8px", color: "var(--danger)", display: "flex", alignItems: "center" }}>
                    <TrashIcon size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
              Chưa có banner nào
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Thêm Banner mới">
        <FormRow label="Tiêu đề banner" required>
          <input className="form-input" value={form.title} placeholder="Ưu đãi mùa hè 2026"
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </FormRow>
        <FormRow label="URL hình ảnh" required>
          <input className="form-input" value={form.imageUrl} placeholder="https://..."
            onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} />
          {form.imageUrl && (
            <div style={{ marginTop: 8, borderRadius: 8, overflow: "hidden", height: 100, background: "var(--bg-overlay)" }}>
              <img src={form.imageUrl} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
          )}
        </FormRow>
        <FormRow label="Link khi click">
          <input className="form-input" value={form.linkUrl} placeholder="https://..."
            onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))} />
        </FormRow>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormRow label="Vị trí" required>
            <select className="form-input" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value as BannerPosition }))}>
              {positions.map(p => <option key={p} value={p}>{BANNER_POSITION_LABEL[p]}</option>)}
            </select>
          </FormRow>
          <FormRow label="Thứ tự hiển thị">
            <input className="form-input" type="number" min={0} value={form.sortOrder}
              onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
          </FormRow>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormRow label="Ngày bắt đầu">
            <input className="form-input" type="datetime-local" value={form.startsAt}
              onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} />
          </FormRow>
          <FormRow label="Ngày hết hạn">
            <input className="form-input" type="datetime-local" value={form.expiresAt}
              onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
          </FormRow>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Hủy</button>
          <button className="btn btn-primary" onClick={createBanner} disabled={saving}>
            {saving ? "Đang lưu..." : "Thêm Banner"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Events tab ─────────────────────────────────────────────────────────── */
const EVENT_TYPE_CONFIG: Record<EventType, { label: string; fields: Array<{ key: string; label: string; type: string; placeholder?: string }> }> = {
  CASHBACK:      { label: "Hoàn tiền", fields: [{ key: "cashbackPct", label: "% hoàn tiền", type: "number", placeholder: "10" }, { key: "maxCashback", label: "Tối đa (VND)", type: "number", placeholder: "50000" }] },
  DOUBLE_POINT:  { label: "Điểm đôi", fields: [{ key: "multiplier", label: "Hệ số nhân", type: "number", placeholder: "2" }] },
  DISCOUNT:      { label: "Giảm giá", fields: [{ key: "discountPct", label: "% giảm", type: "number", placeholder: "15" }, { key: "maxDiscount", label: "Tối đa (VND)", type: "number", placeholder: "30000" }] },
  FREE_RIDE:     { label: "Chuyến miễn phí", fields: [{ key: "maxFare", label: "Cước tối đa (VND)", type: "number", placeholder: "100000" }, { key: "tripsPerUser", label: "Số chuyến / người", type: "number", placeholder: "1" }] },
  STREAK_BONUS:  { label: "Thưởng Streak", fields: [{ key: "streakTarget", label: "Số chuyến cần đạt", type: "number", placeholder: "7" }, { key: "bonusAmount", label: "Thưởng (VND)", type: "number", placeholder: "50000" }] },
  REFERRAL:      { label: "Giới thiệu", fields: [{ key: "referrerBonus", label: "Thưởng người giới thiệu (VND)", type: "number", placeholder: "30000" }, { key: "refereeBonus", label: "Thưởng người được giới thiệu (VND)", type: "number", placeholder: "20000" }] },
};

function EventsTab() {
  const [events, setEvents] = useState<PromotionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [form, setForm] = useState({
    name: "", description: "", imageUrl: "",
    type: "CASHBACK" as EventType,
    targetAudience: "ALL" as Audience,
    startsAt: "", endsAt: "", budget: "" as string | number,
    config: {} as Record<string, unknown>,
  });

  const load = useCallback(() => {
    setLoading(true);
    api.get<{ events: PromotionEvent[] }>("/admin/events")
      .then(r => setEvents(r.data.events ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const createEvent = async () => {
    if (!form.name || !form.startsAt || !form.endsAt) return;
    setSaving(true);
    try {
      await api.post("/admin/events", {
        name: form.name, description: form.description, imageUrl: form.imageUrl || undefined,
        type: form.type, targetAudience: form.targetAudience,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        budget: form.budget === "" ? undefined : Number(form.budget),
        config: form.config,
      });
      setShowCreate(false);
      load();
    } finally { setSaving(false); }
  };

  const changeStatus = async (e: PromotionEvent, status: EventStatus) => {
    await api.put(`/admin/events/${e.id}`, { status });
    load();
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Xóa sự kiện này?")) return;
    await api.del(`/admin/events/${id}`);
    load();
  };

  const setConfigField = (key: string, val: unknown) =>
    setForm(f => ({ ...f, config: { ...f.config, [key]: val } }));

  const filtered = statusFilter === "ALL" ? events : events.filter(e => e.status === statusFilter);

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Tổng sự kiện", value: events.length, color: "#6366f1" },
          { label: "Đang chạy", value: events.filter(e => e.status === "ACTIVE").length, color: "#22d3ee" },
          { label: "Nháp", value: events.filter(e => e.status === "DRAFT").length, color: "#fbbf24" },
          { label: "Đã kết thúc", value: events.filter(e => e.status === "ENDED").length, color: "#6b7280" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: "14px 18px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        {["ALL", "DRAFT", "ACTIVE", "ENDED"].map(f => (
          <button key={f} type="button" onClick={() => setStatusFilter(f)}
            className={statusFilter === f ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"}
            style={{ fontSize: 12, padding: "5px 12px" }}>
            {f === "ALL" ? "Tất cả" : EVENT_STATUS_LABEL[f as EventStatus]}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <PlusIcon size={14} /> Tạo Sự kiện
        </button>
      </div>

      {/* Event cards */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Đang tải...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(ev => {
            const now = new Date();
            const starts = new Date(ev.startsAt);
            const ends = new Date(ev.endsAt);
            const daysLeft = Math.max(0, Math.ceil((ends.getTime() - now.getTime()) / 86400000));
            const budgetUsedPct = ev.budget ? Math.min(100, ev.usedBudget / ev.budget * 100) : 0;

            return (
              <div key={ev.id} className="card" style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "center" }}>
                {/* Image or type icon */}
                {ev.imageUrl ? (
                  <div style={{ width: 72, height: 52, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
                    <img src={ev.imageUrl} alt={ev.name} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }} />
                  </div>
                ) : (
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: `${EVENT_STATUS_COLOR[ev.status]}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {ev.type === "STREAK_BONUS" ? <ZapIcon size={22} color={EVENT_STATUS_COLOR[ev.status]} /> :
                     ev.type === "REFERRAL" ? <GiftIcon size={22} color={EVENT_STATUS_COLOR[ev.status]} /> :
                     <MegaphoneIcon size={22} color={EVENT_STATUS_COLOR[ev.status]} />}
                  </div>
                )}

                {/* Info */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{ev.name}</span>
                    <Badge color={EVENT_STATUS_COLOR[ev.status]} label={EVENT_STATUS_LABEL[ev.status]} />
                    <span style={{ fontSize: 11, background: "var(--bg-overlay)", padding: "2px 8px", borderRadius: 4, color: "var(--text-muted)" }}>{EVENT_TYPE_LABEL[ev.type]}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>{ev.description}</div>
                  <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-secondary)", flexWrap: "wrap" }}>
                    <span>📅 {fmtDate(ev.startsAt)} → {fmtDate(ev.endsAt)}</span>
                    {ev.status === "ACTIVE" && <span style={{ color: daysLeft <= 3 ? "#ef4444" : "#22d3ee" }}>⏱ Còn {daysLeft} ngày</span>}
                    <span>👥 {ev.targetAudience ?? "ALL"}</span>
                    {ev.budget && <span>💰 Ngân sách: {fmtMoney(ev.budget)}</span>}
                  </div>
                  {ev.budget && (
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, maxWidth: 200, height: 4, borderRadius: 2, background: "var(--bg-overlay)" }}>
                        <div style={{ height: "100%", background: budgetUsedPct > 80 ? "#ef4444" : "#22d3ee", width: `${budgetUsedPct}%`, borderRadius: 2, transition: "width .3s" }} />
                      </div>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{Math.round(budgetUsedPct)}% ngân sách</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
                  {ev.status === "DRAFT" && (
                    <button type="button" onClick={() => changeStatus(ev, "ACTIVE")} className="btn btn-primary btn-sm" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                      <CheckCircleIcon size={12} style={{ marginRight: 4 }} /> Kích hoạt
                    </button>
                  )}
                  {ev.status === "ACTIVE" && (
                    <button type="button" onClick={() => changeStatus(ev, "ENDED")} className="btn btn-outline btn-sm" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                      Kết thúc sớm
                    </button>
                  )}
                  <button type="button" onClick={() => deleteEvent(ev.id)}
                    style={{ background: "none", border: "1px solid var(--border-subtle)", borderRadius: 6, cursor: "pointer", padding: "4px 8px", color: "var(--danger)", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                    <TrashIcon size={12} /> Xóa
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Chưa có sự kiện nào</div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Tạo Sự kiện mới">
        <FormRow label="Tên sự kiện" required>
          <input className="form-input" value={form.name} placeholder="Hè sôi động 2026"
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </FormRow>
        <FormRow label="Mô tả" required>
          <textarea className="form-input" value={form.description} rows={3}
            placeholder="Mô tả chi tiết sự kiện..."
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            style={{ resize: "vertical" }} />
        </FormRow>
        <FormRow label="URL ảnh sự kiện">
          <input className="form-input" value={form.imageUrl} placeholder="https://..."
            onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} />
          {form.imageUrl && (
            <div style={{ marginTop: 8, borderRadius: 8, overflow: "hidden", height: 120, background: "var(--bg-overlay)" }}>
              <img src={form.imageUrl} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
          )}
        </FormRow>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormRow label="Loại sự kiện" required>
            <select className="form-input" value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as EventType, config: {} }))}>
              {Object.entries(EVENT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FormRow>
          <FormRow label="Đối tượng">
            <select className="form-input" value={form.targetAudience}
              onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value as Audience }))}>
              <option value="ALL">Tất cả</option>
              <option value="CUSTOMER">Khách hàng</option>
              <option value="DRIVER">Tài xế</option>
              <option value="NEW_USER">Người dùng mới</option>
            </select>
          </FormRow>
        </div>

        {/* Dynamic config fields */}
        {EVENT_TYPE_CONFIG[form.type].fields.length > 0 && (
          <div style={{ background: "var(--bg-overlay)", borderRadius: 8, padding: "14px", marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
              Cấu hình {EVENT_TYPE_CONFIG[form.type].label}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {EVENT_TYPE_CONFIG[form.type].fields.map(f => (
                <FormRow key={f.key} label={f.label}>
                  <input className="form-input" type={f.type} placeholder={f.placeholder}
                    value={(form.config[f.key] as string | number) ?? ""}
                    onChange={e => setConfigField(f.key, f.type === "number" ? Number(e.target.value) : e.target.value)} />
                </FormRow>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormRow label="Ngày bắt đầu" required>
            <input className="form-input" type="datetime-local" value={form.startsAt}
              onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} />
          </FormRow>
          <FormRow label="Ngày kết thúc" required>
            <input className="form-input" type="datetime-local" value={form.endsAt}
              onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} />
          </FormRow>
        </div>
        <FormRow label="Ngân sách tối đa (VND)">
          <input className="form-input" type="number" min={0} value={form.budget}
            placeholder="Không giới hạn"
            onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
        </FormRow>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Hủy</button>
          <button className="btn btn-primary" onClick={createEvent} disabled={saving}>
            {saving ? "Đang tạo..." : "Tạo Sự kiện"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function AdminRewardsPage() {
  const [tab, setTab] = useState("vouchers");

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Khuyến mãi & Phần thưởng</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Quản lý voucher, banner quảng cáo và chiến dịch marketing</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--border-subtle)" }}>
        {TAB_LIST.map(({ id, label, Icon, color }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} type="button"
              style={{
                display: "flex", alignItems: "center", gap: 7, padding: "10px 16px",
                borderRadius: "8px 8px 0 0", border: "1px solid transparent",
                borderBottom: active ? "2px solid " + color : "1px solid transparent",
                background: active ? `${color}12` : "transparent",
                color: active ? color : "var(--text-muted)",
                fontWeight: active ? 600 : 400, fontSize: 13, cursor: "pointer", transition: "all .15s",
              }}>
              <Icon size={15} color={active ? color : "currentColor"} />
              {label}
            </button>
          );
        })}
      </div>

      {tab === "vouchers" && <VouchersTab />}
      {tab === "banners"  && <BannersTab />}
      {tab === "events"   && <EventsTab />}
    </div>
  );
}
