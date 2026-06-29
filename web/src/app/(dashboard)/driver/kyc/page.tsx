"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import {
  UserIcon, CarIcon, DocumentIcon, CheckCircleIcon, AlertTriangleIcon,
  ShieldIcon, TruckIcon, PackageIcon, ZapIcon,
} from "@/components/ui/Icons";

interface KycData {
  verificationStatus: string;
  rejectReason: string | null;
  vehicleType: string;
  vehiclePlate: string;
  seats: number;
  cccdNumber: string;
  address: string;
  allowCargo: boolean;
  cargoCapacityKg: number | null;
  documents: Array<{ id: string; type: string; url: string }>;
}

type Step = 1 | 2 | 3;

const STATUS_CONFIG = {
  NONE:     { color: "#94a3b8", bg: "rgba(148,163,184,.12)", label: "Chưa gửi",   icon: "○" },
  PENDING:  { color: "#fbbf24", bg: "rgba(251,191,36,.12)",  label: "Đang duyệt", icon: "⟳" },
  APPROVED: { color: "#34d399", bg: "rgba(52,211,153,.12)",  label: "Đã duyệt",   icon: "✓" },
  REJECTED: { color: "#f87171", bg: "rgba(248,113,113,.12)", label: "Bị từ chối", icon: "✗" },
};

const STEPS = [
  { n: 1 as Step, label: "Cá nhân",  Icon: UserIcon     },
  { n: 2 as Step, label: "Xe",       Icon: CarIcon      },
  { n: 3 as Step, label: "Giấy tờ", Icon: DocumentIcon  },
];

const DOC_TYPES = [
  { value: "CCCD_FRONT",          label: "CCCD mặt trước"  },
  { value: "CCCD_BACK",           label: "CCCD mặt sau"    },
  { value: "DRIVER_LICENSE",      label: "Bằng lái xe"     },
  { value: "VEHICLE_REGISTRATION",label: "Đăng ký xe"      },
  { value: "SELFIE",              label: "Ảnh selfie"      },
];

export default function DriverKycPage() {
  const [kyc,     setKyc]     = useState<KycData | null>(null);
  const [loading, setLoading] = useState(true);
  const [step,    setStep]    = useState<Step>(1);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [docUrl,  setDocUrl]  = useState("");
  const [docType, setDocType] = useState("CCCD_FRONT");
  const [addingDoc, setAddingDoc] = useState(false);

  const [form, setForm] = useState({
    vehicleType: "CAR",
    vehiclePlate: "",
    seats: 4,
    cccdNumber: "",
    address: "",
    allowCargo: false,
    cargoCapacityKg: "",
  });

  const load = async () => {
    try {
      const r = await api.get<KycData>("/driver/kyc");
      setKyc(r.data);
      setForm({
        vehicleType:  r.data.vehicleType,
        vehiclePlate: r.data.vehiclePlate,
        seats:        r.data.seats,
        cccdNumber:   r.data.cccdNumber,
        address:      r.data.address,
        allowCargo:   r.data.allowCargo,
        cargoCapacityKg: String(r.data.cargoCapacityKg ?? ""),
      });
    } catch { /* first-time driver */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const status = kyc?.verificationStatus ?? "NONE";
  const cfg    = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.NONE;
  const canEdit = status === "NONE" || status === "REJECTED";

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      await api.post("/driver/kyc", {
        ...form,
        seats: Number(form.seats),
        cargoCapacityKg: form.cargoCapacityKg ? Number(form.cargoCapacityKg) : undefined,
      });
      await load();
      if (step < 3) setStep((s) => (s + 1) as Step);
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const addDoc = async () => {
    if (!docUrl.trim()) return;
    setAddingDoc(true);
    try {
      await api.post("/driver/kyc/documents", { type: docType, url: docUrl.trim() });
      setDocUrl("");
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setAddingDoc(false); }
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
      <span style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(99,102,241,.2)", borderTopColor: "#6366f1", animation: "spin .8s linear infinite", display: "inline-block" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>

      {/* ── Page title ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: 22, fontWeight: 800, color: "var(--text-primary)",
          display: "flex", alignItems: "center", gap: 10, marginBottom: 6,
        }}>
          <ShieldIcon size={22} color="#6366f1"/> Hồ sơ KYC tài xế
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Hoàn thành 3 bước để được duyệt và bắt đầu nhận chuyến.
        </p>
      </div>

      {/* ── Status banner ──────────────────────────────────────── */}
      <div style={{
        padding: "14px 18px", borderRadius: 14, marginBottom: 24,
        background: cfg.bg, border: `1px solid ${cfg.color}35`,
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
          background: `${cfg.color}20`, border: `2px solid ${cfg.color}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 800, color: cfg.color,
        }}>{cfg.icon}</div>
        <div>
          <div style={{ fontWeight: 700, color: cfg.color, marginBottom: 2, fontSize: 14 }}>
            {cfg.label}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {status === "NONE"     && "Điền đầy đủ 3 bước bên dưới và gửi hồ sơ để được duyệt."}
            {status === "PENDING"  && "Hồ sơ đang chờ admin xem xét. Thường trong 24–48 giờ."}
            {status === "APPROVED" && "Bạn đã được phê duyệt! Hãy đăng tuyến và bắt đầu nhận chuyến."}
            {status === "REJECTED" && (kyc?.rejectReason ? `Lý do từ chối: ${kyc.rejectReason}` : "Hồ sơ bị từ chối. Cập nhật và gửi lại.")}
          </div>
        </div>
        {status === "APPROVED" && (
          <CheckCircleIcon size={22} color="#34d399" style={{ marginLeft: "auto", flexShrink: 0 }}/>
        )}
      </div>

      {/* ── Step indicator ─────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24 }}>
        {STEPS.map(({ n, label, Icon }, i) => {
          const done   = n < step || status === "APPROVED";
          const active = n === step;
          return (
            <div key={n} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
              {/* Connector line */}
              {i > 0 && (
                <div style={{
                  position: "absolute", top: 18, left: "-50%", width: "100%", height: 2,
                  background: done ? "#6366f1" : "var(--border-subtle)",
                  transition: "background .3s",
                }}/>
              )}
              {/* Circle */}
              <button
                onClick={() => setStep(n)}
                style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: done || active ? "var(--grad-primary)" : "var(--bg-overlay)",
                  border: `2px solid ${done || active ? "#6366f1" : "var(--border-subtle)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", position: "relative", zIndex: 1,
                  boxShadow: active ? "var(--glow-sm)" : "none",
                  transition: "all .2s",
                }}
              >
                {done && !active
                  ? <CheckCircleIcon size={14} color="#fff"/>
                  : <Icon size={14} color={active || done ? "#fff" : "var(--text-muted)"}/>
                }
              </button>
              <div style={{
                fontSize: 11, marginTop: 6, fontWeight: active ? 700 : 400,
                color: active ? "var(--brand-primary)" : "var(--text-muted)",
              }}>{label}</div>
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{
          display: "flex", gap: 8, padding: "10px 14px", borderRadius: 10, marginBottom: 16,
          background: "var(--danger-bg)", border: "1px solid var(--danger-border)",
          color: "var(--danger)", fontSize: 13,
        }}>
          <AlertTriangleIcon size={14} style={{ flexShrink: 0, marginTop: 1 }}/> {error}
        </div>
      )}

      {/* ── Step 1: Personal info ────────────────────────────────── */}
      {step === 1 && (
        <form onSubmit={save}>
          <StepCard title="Thông tin cá nhân" icon={<UserIcon size={18} color="#6366f1"/>}>
            <Field label="Số CCCD (12 chữ số)">
              <input
                style={inputStyle} placeholder="012345678901"
                value={form.cccdNumber} disabled={!canEdit} required maxLength={12}
                onChange={(e) => setForm({ ...form, cccdNumber: e.target.value.replace(/\D/g, "") })}
              />
            </Field>
            <Field label="Địa chỉ thường trú">
              <input
                style={inputStyle} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                value={form.address} disabled={!canEdit} required
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </Field>
          </StepCard>
          {canEdit && <StepActions saving={saving} isLast={false}/>}
          {!canEdit && <ViewOnlyNote/>}
        </form>
      )}

      {/* ── Step 2: Vehicle info ─────────────────────────────────── */}
      {step === 2 && (
        <form onSubmit={save}>
          <StepCard title="Thông tin xe" icon={<CarIcon size={18} color="#22d3ee"/>}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Loại xe">
                <select style={inputStyle} value={form.vehicleType} disabled={!canEdit}
                  onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
                  <option value="CAR">Ô tô (4–9 chỗ)</option>
                  <option value="VAN">Xe van</option>
                  <option value="TRUCK">Xe tải</option>
                </select>
              </Field>
              <Field label="Biển số xe">
                <input style={inputStyle} placeholder="51A-12345"
                  value={form.vehiclePlate} disabled={!canEdit} required
                  onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value.toUpperCase() })}/>
              </Field>
              <Field label="Số ghế hành khách">
                <input style={inputStyle} type="number" min={1} max={45}
                  value={form.seats} disabled={!canEdit} required
                  onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })}/>
              </Field>
            </div>

            {/* Cargo toggle */}
            <div style={{
              marginTop: 16, padding: "14px 16px", borderRadius: 12,
              background: form.allowCargo ? "rgba(34,211,238,.08)" : "var(--bg-overlay)",
              border: `1px solid ${form.allowCargo ? "rgba(34,211,238,.3)" : "var(--border-subtle)"}`,
              transition: "all .2s",
            }}>
              <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: canEdit ? "pointer" : "default" }}>
                <div style={{
                  width: 40, height: 22, borderRadius: 11, flexShrink: 0,
                  background: form.allowCargo ? "#22d3ee" : "var(--border-subtle)",
                  position: "relative", transition: "background .2s",
                  cursor: canEdit ? "pointer" : "default",
                }}
                  onClick={() => canEdit && setForm({ ...form, allowCargo: !form.allowCargo })}
                >
                  <div style={{
                    position: "absolute", top: 2, left: form.allowCargo ? 20 : 2,
                    width: 18, height: 18, borderRadius: "50%", background: "#fff",
                    transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,.3)",
                  }}/>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: form.allowCargo ? "#22d3ee" : "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                    <PackageIcon size={14}/> Chấp nhận ghép hàng hoá
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                    Tăng thu nhập mỗi chuyến bằng cách nhận thêm hàng gửi
                  </div>
                </div>
              </label>
              {form.allowCargo && (
                <Field label="Tải trọng tối đa (kg)" style={{ marginTop: 12 }}>
                  <input style={inputStyle} type="number" min={0} placeholder="50"
                    value={form.cargoCapacityKg} disabled={!canEdit}
                    onChange={(e) => setForm({ ...form, cargoCapacityKg: e.target.value })}/>
                </Field>
              )}
            </div>
          </StepCard>
          {canEdit && <StepActions saving={saving} isLast={false}/>}
          {!canEdit && <ViewOnlyNote/>}
        </form>
      )}

      {/* ── Step 3: Documents ───────────────────────────────────── */}
      {step === 3 && (
        <div>
          <StepCard title="Tài liệu đính kèm" icon={<DocumentIcon size={18} color="#f472b6"/>}>
            {/* Progress */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                Cần tối thiểu 3 giấy tờ: CCCD (2 mặt) + Bằng lái xe
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {DOC_TYPES.map((dt) => {
                  const uploaded = kyc?.documents.some((d) => d.type === dt.value);
                  return (
                    <div key={dt.value} style={{
                      padding: "4px 10px", borderRadius: 6, fontSize: 11,
                      background: uploaded ? "rgba(52,211,153,.1)" : "var(--bg-overlay)",
                      border: `1px solid ${uploaded ? "rgba(52,211,153,.3)" : "var(--border-subtle)"}`,
                      color: uploaded ? "#34d399" : "var(--text-muted)",
                      display: "flex", alignItems: "center", gap: 5,
                    }}>
                      {uploaded ? <CheckCircleIcon size={11}/> : <DocumentIcon size={11}/>}
                      {dt.label}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Existing docs */}
            {kyc?.documents && kyc.documents.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {kyc.documents.map((d) => (
                  <div key={d.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", borderRadius: 10, marginBottom: 6,
                    background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircleIcon size={14} color="#34d399"/>
                      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        {DOC_TYPES.find((t) => t.value === d.type)?.label ?? d.type}
                      </span>
                    </div>
                    <a href={d.url} target="_blank" rel="noreferrer" style={{
                      fontSize: 11, color: "#6366f1", textDecoration: "none",
                      padding: "3px 8px", borderRadius: 6, background: "rgba(99,102,241,.1)",
                      border: "1px solid rgba(99,102,241,.2)",
                    }}>Xem ảnh</a>
                  </div>
                ))}
              </div>
            )}

            {/* Add doc form */}
            <div style={{
              background: "var(--bg-elevated)", borderRadius: 12, padding: 14,
              border: "1px solid var(--border-subtle)",
            }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
                Upload ảnh lên Supabase Storage rồi dán URL vào đây
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select style={{ ...inputStyle, flex: "0 0 160px" }} value={docType}
                  onChange={(e) => setDocType(e.target.value)}>
                  {DOC_TYPES.map((dt) => (
                    <option key={dt.value} value={dt.value}>{dt.label}</option>
                  ))}
                </select>
                <input style={{ ...inputStyle, flex: "1 1 200px" }}
                  placeholder="https://..." value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}/>
                <button type="button" onClick={addDoc} disabled={addingDoc || !docUrl.trim()}
                  style={btnStyle}>
                  {addingDoc ? "..." : "Thêm"}
                </button>
              </div>
            </div>
          </StepCard>

          {/* Final submit */}
          {canEdit && (kyc?.documents?.length ?? 0) >= 2 && (
            <button
              onClick={save}
              disabled={saving}
              style={{
                ...btnStyle, width: "100%", padding: 14, fontSize: 15, fontWeight: 700,
                borderRadius: 12, marginTop: 16, background: "var(--grad-primary)",
                boxShadow: "var(--glow-primary)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              }}
            >
              {saving ? (
                <><span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", animation: "spin .7s linear infinite", display: "inline-block" }}/> Đang gửi...</>
              ) : (
                <><ZapIcon size={16}/> Gửi hồ sơ KYC</>
              )}
            </button>
          )}
          {(kyc?.documents?.length ?? 0) < 2 && canEdit && (
            <div style={{
              padding: "10px 14px", borderRadius: 10, marginTop: 12, fontSize: 12,
              background: "var(--warning-bg)", border: "1px solid var(--warning-border)",
              color: "var(--warning)",
            }}>
              Cần thêm ít nhất {2 - (kyc?.documents?.length ?? 0)} giấy tờ nữa để gửi hồ sơ.
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── Sub components ─────────────────────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px",
  background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
  borderRadius: 10, color: "var(--text-primary)", fontSize: 13, outline: "none",
};

const btnStyle: React.CSSProperties = {
  padding: "10px 18px", background: "var(--grad-primary)", border: "none",
  borderRadius: 10, color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer",
  boxShadow: "var(--glow-sm)", transition: "opacity .15s",
};

function StepCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
      borderRadius: 16, padding: 20, marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        {icon}
        <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ marginBottom: 12, ...style }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: .5, display: "block", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function StepActions({ saving, isLast }: { saving: boolean; isLast: boolean }) {
  return (
    <button type="submit" disabled={saving} style={{ ...btnStyle, width: "100%", padding: 12, fontSize: 14 }}>
      {saving
        ? <span style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}><span style={{ width:14,height:14,borderRadius:"50%",border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",animation:"spin .7s linear infinite",display:"inline-block" }}/> Đang lưu...</span>
        : isLast ? "Gửi hồ sơ KYC" : "Lưu & tiếp tục →"
      }
    </button>
  );
}

function ViewOnlyNote() {
  return (
    <div style={{
      padding: "10px 14px", borderRadius: 10, fontSize: 12,
      background: "var(--info-bg)", border: "1px solid var(--info-border)",
      color: "var(--info)", display: "flex", alignItems: "center", gap: 8,
    }}>
      <ShieldIcon size={13}/> Hồ sơ đang được xét duyệt — không thể chỉnh sửa.
    </div>
  );
}
