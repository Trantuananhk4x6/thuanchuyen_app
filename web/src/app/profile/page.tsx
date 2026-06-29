"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api/client";

interface UserProfile {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
  driverProfile?: {
    verificationStatus: string;
    vehicleType: string;
    vehiclePlate: string;
    rating: number;
    totalTrips: number;
  } | null;
}

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [profile, setProfile]   = useState<UserProfile | null>(null);
  const [editing, setEditing]   = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving,  setSaving]    = useState(false);
  const [saved,   setSaved]     = useState(false);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get<{ user: UserProfile }>("/me")
      .then((r) => {
        setProfile(r.data.user);
        setFullName(r.data.user.fullName ?? "");
        setAvatarUrl(r.data.user.avatarUrl ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setSaved(false);
    try {
      await api.patch("/me", { fullName: fullName.trim() || undefined, avatarUrl: avatarUrl.trim() || undefined });
      setProfile((p) => p ? { ...p, fullName: fullName.trim(), avatarUrl: avatarUrl.trim() } : p);
      await update();
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingScreen />;
  if (!profile) return null;

  const initial = (profile.fullName ?? profile.email ?? "U").charAt(0).toUpperCase();
  const roleLabel: Record<string, string> = { CUSTOMER: "Khách hàng", DRIVER: "Tài xế", ADMIN: "Quản trị viên" };
  const roleColor: Record<string, string> = { CUSTOMER: "#22d3ee", DRIVER: "#a78bfa", ADMIN: "#f472b6" };
  const color = roleColor[profile.role] ?? "#6366f1";

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 0" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24 }}>
        Tài khoản của tôi
      </h1>

      {saved && (
        <div style={{ marginBottom: 16, padding: "12px 16px", background: "var(--success-bg)", border: "1px solid var(--success-border)", borderRadius: 10, color: "var(--success)", fontSize: 13 }}>
          ✅ Đã cập nhật thông tin thành công
        </div>
      )}

      {/* Avatar + info card */}
      <div className="card mb-4">
        <div className="card-body">
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            {/* Avatar */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar"
                  style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: `3px solid ${color}` }} />
              ) : (
                <div style={{
                  width: 80, height: 80, borderRadius: "50%",
                  background: `linear-gradient(135deg,${color},${color}88)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 32, fontWeight: 800, color: "#fff",
                  border: `3px solid ${color}44`,
                  boxShadow: `0 0 20px ${color}33`,
                }}>
                  {initial}
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
                  {profile.fullName ?? "Chưa có tên"}
                </h2>
                <span style={{
                  padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                  background: `${color}18`, border: `1px solid ${color}44`, color,
                }}>
                  {roleLabel[profile.role] ?? profile.role}
                </span>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 4 }}>
                {profile.email ?? profile.phone ?? "—"}
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
                Tham gia: {new Date(profile.createdAt).toLocaleDateString("vi-VN", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>

            <button
              onClick={() => setEditing(!editing)}
              style={{
                padding: "8px 18px", borderRadius: 10, cursor: "pointer",
                background: editing ? "var(--bg-overlay)" : "var(--grad-primary)",
                border: editing ? "1px solid var(--border-subtle)" : "none",
                color: editing ? "var(--text-muted)" : "#fff",
                fontWeight: 600, fontSize: 13,
                boxShadow: editing ? "none" : "var(--glow-sm)",
              }}
            >
              {editing ? "Huỷ" : "✏️ Chỉnh sửa"}
            </button>
          </div>

          {/* Edit form */}
          {editing && (
            <form onSubmit={save} style={{ marginTop: 20, borderTop: "1px solid var(--border-subtle)", paddingTop: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Họ và tên</label>
                  <input className="form-input" value={fullName}
                    onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">URL ảnh đại diện</label>
                  <input className="form-input" value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." type="url" />
                </div>
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                <button type="submit" disabled={saving} style={{
                  padding: "10px 24px", background: "var(--grad-primary)", border: "none",
                  borderRadius: 10, color: "#fff", fontWeight: 600, cursor: "pointer",
                  boxShadow: "var(--glow-sm)", opacity: saving ? .7 : 1,
                }}>
                  {saving ? "Đang lưu..." : "💾 Lưu thay đổi"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard icon="🪑" label="Vai trò" value={roleLabel[profile.role] ?? profile.role} color={color} />
        {profile.driverProfile ? (
          <>
            <StatCard icon="⭐" label="Đánh giá" value={profile.driverProfile.rating.toFixed(1)} color="#fbbf24" />
            <StatCard icon="🗺️" label="Tổng chuyến" value={String(profile.driverProfile.totalTrips)} color="#34d399" />
            <StatCard icon="🚗" label="Xe" value={profile.driverProfile.vehiclePlate} color="#a78bfa" />
          </>
        ) : (
          <StatCard icon="🎫" label="Trạng thái" value="Khách hàng" color="#22d3ee" />
        )}
      </div>

      {/* Account details */}
      <div className="card mb-4">
        <div className="card-header">Thông tin tài khoản</div>
        <div className="card-body">
          <InfoRow label="Email" value={profile.email ?? "Chưa liên kết"} icon="📧" />
          <InfoRow label="Số điện thoại" value={profile.phone ?? "Chưa liên kết"} icon="📱" />
          <InfoRow label="ID tài khoản" value={profile.id.slice(-12)} icon="🔑" mono />
          {profile.driverProfile && (
            <>
              <InfoRow label="Loại xe" value={profile.driverProfile.vehicleType} icon="🚙" />
              <InfoRow label="Biển số" value={profile.driverProfile.vehiclePlate} icon="🪪" />
              <InfoRow label="Trạng thái KYC"
                value={profile.driverProfile.verificationStatus}
                icon={profile.driverProfile.verificationStatus === "APPROVED" ? "✅" : "⏳"} />
            </>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="card">
        <div className="card-header">Thao tác nhanh</div>
        <div style={{ padding: "8px 0" }}>
          {[
            { href: profile.role === "DRIVER" ? "/driver" : "/customer", icon: "🏠", label: "Về trang chủ" },
            ...(profile.role === "DRIVER"
              ? [{ href: "/driver/kyc", icon: "📄", label: "Hồ sơ KYC" }, { href: "/driver/wallet", icon: "💰", label: "Ví & Thu nhập" }]
              : [{ href: "/customer/trips", icon: "🗺️", label: "Lịch sử chuyến" }]),
            { href: "/guide", icon: "📖", label: "Hướng dẫn sử dụng" },
          ].map((link) => (
            <a key={link.href} href={link.href} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 20px", color: "var(--text-secondary)",
              transition: "background .15s", textDecoration: "none",
              borderBottom: "1px solid var(--border-subtle)",
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ fontSize: 18, width: 28 }}>{link.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{link.label}</span>
              <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 16 }}>›</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
      borderRadius: 12, padding: "16px", textAlign: "center",
      boxShadow: "var(--shadow-sm)",
    }}>
      <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, color, fontSize: 15 }}>{value}</div>
    </div>
  );
}

function InfoRow({ label, value, icon, mono }: { label: string; value: string; icon: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border-subtle)", gap: 12 }}>
      <span style={{ fontSize: 18, width: 28, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 12, color: "var(--text-muted)", width: 130, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--text-primary)", fontFamily: mono ? "monospace" : "inherit", fontWeight: mono ? 600 : 400 }}>
        {value}
      </span>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 12, color: "var(--text-muted)" }}>
      <div style={{ width: 24, height: 24, border: "3px solid rgba(99,102,241,.2)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      Đang tải...
    </div>
  );
}
