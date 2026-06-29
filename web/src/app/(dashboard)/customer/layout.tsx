"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useRef, useCallback } from "react";
import { ThemeToggle } from "@/components/ThemeProvider";
import NotificationBell from "@/components/NotificationBell";
import { api } from "@/lib/api/client";
import {
  MapIcon, PackageIcon, HistoryIcon, LogOutIcon, TicketIcon, ChatIcon,
} from "@/components/ui/Icons";

const NAV = [
  { href: "/customer",           Icon: MapIcon,      label: "Đặt chuyến",    color: "#6366f1" },
  { href: "/customer/cargo",     Icon: PackageIcon,  label: "Gửi hàng",      color: "#22d3ee" },
  { href: "/customer/trips",     Icon: HistoryIcon,  label: "Chuyến của tôi", color: "#34d399" },
  { href: "/customer/messages",  Icon: ChatIcon,     label: "Tin nhắn",       color: "#a78bfa" },
  { href: "/customer/vouchers",  Icon: TicketIcon,   label: "Voucher",        color: "#f97316" },
];

interface Banner {
  id: string; title: string; imageUrl: string; linkUrl?: string;
  position: string; sortOrder: number;
}

function BannerSlider() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.get<{ banners: Banner[] }>("/customer/banners?position=HOME_TOP")
      .then(r => { setBanners(r.data.banners ?? []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  const next = useCallback(() => setIdx(i => (i + 1) % Math.max(1, banners.length)), [banners.length]);
  const prev = useCallback(() => setIdx(i => (i - 1 + banners.length) % Math.max(1, banners.length)), [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;
    timer.current = setInterval(next, 5000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [banners.length, next]);

  if (!loaded || banners.length === 0) return null;

  const banner = banners[idx];

  return (
    <div style={{
      position: "relative", width: "100%", overflow: "hidden",
      borderBottom: "1px solid var(--border-subtle)",
    }}>
      {/* Slide */}
      <div
        style={{
          height: 64, display: "flex", alignItems: "center",
          background: `linear-gradient(90deg, rgba(9,18,38,.9) 0%, transparent 40%), url(${banner.imageUrl}) center/cover no-repeat`,
          cursor: banner.linkUrl ? "pointer" : "default",
          transition: "all .4s",
        }}
        onClick={() => { if (banner.linkUrl) window.open(banner.linkUrl, "_blank"); }}
      >
        <div style={{ padding: "0 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f97316", boxShadow: "0 0 6px #f97316", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>{banner.title}</div>
            {banner.linkUrl && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>Nhấn để xem chi tiết →</div>
            )}
          </div>
        </div>
      </div>

      {/* Dots + arrows */}
      {banners.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); prev(); }} style={{
            position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
            background: "rgba(0,0,0,.5)", border: "none", borderRadius: "50%",
            width: 24, height: 24, cursor: "pointer", color: "#fff", fontSize: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>‹</button>
          <button onClick={(e) => { e.stopPropagation(); next(); }} style={{
            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
            background: "rgba(0,0,0,.5)", border: "none", borderRadius: "50%",
            width: 24, height: 24, cursor: "pointer", color: "#fff", fontSize: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>›</button>
          <div style={{ position: "absolute", bottom: 6, right: 16, display: "flex", gap: 4 }}>
            {banners.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                style={{
                  width: i === idx ? 16 : 6, height: 6,
                  borderRadius: 3, border: "none", cursor: "pointer",
                  background: i === idx ? "#f97316" : "rgba(255,255,255,.4)",
                  transition: "all .3s", padding: 0,
                }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) window.location.href = "/login";
  }, [user, loading]);

  if (loading) return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 12,
      background: "var(--bg-base)",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        border: "3px solid rgba(99,102,241,.2)", borderTopColor: "#6366f1",
        animation: "spin .8s linear infinite",
      }}/>
      <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Đang tải...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!user) return null;

  const initial = (user.fullName ?? user.email ?? "U").charAt(0).toUpperCase();
  const isActive = (href: string) =>
    href === "/customer" ? pathname === href : pathname.startsWith(href);

  // Banner only shows on booking home + vouchers page
  const showBanner = pathname === "/customer" || pathname.startsWith("/customer/vouchers");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>

      {/* ── Top header ─────────────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 30,
        background: "rgba(9,18,38,.92)", backdropFilter: "blur(20px)",
        borderBottom: showBanner ? "none" : "1px solid var(--border-subtle)",
      }}>
        <div style={{ height: 60, display: "flex", alignItems: "center", padding: "0 24px", gap: 24 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <img src="/logo.png" alt="Thuận Chuyến" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover" }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>Thuận Chuyến</span>
          </div>

          {/* Desktop nav */}
          <nav style={{ display: "flex", gap: 4, flex: 1 }} className="desktop-nav">
            {NAV.map(({ href, Icon, label, color }) => {
              const active = isActive(href);
              return (
                <Link key={href} href={href} style={{ textDecoration: "none" }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "6px 14px", borderRadius: 8, fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    color: active ? color : "var(--text-secondary)",
                    background: active ? `${color}15` : "transparent",
                    border: `1px solid ${active ? `${color}30` : "transparent"}`,
                    transition: "all .15s", cursor: "pointer",
                  }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--bg-overlay)"; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                  >
                    <Icon size={14} color={active ? color : "currentColor"}/>
                    {label}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Right: user + actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto", flexShrink: 0 }}>
            <NotificationBell />
            <ThemeToggle />
            <a href="/profile" style={{
              display: "flex", alignItems: "center", gap: 7, padding: "5px 12px",
              borderRadius: 8, textDecoration: "none",
              background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
              transition: "all .15s",
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                background: "var(--grad-primary)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, color: "#fff",
              }}>{initial}</div>
              <span style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} className="user-name-header">
                {user.fullName ?? user.email}
              </span>
            </a>
            <button
              onClick={logout}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 12px", borderRadius: 8,
                background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
                color: "var(--text-muted)", fontSize: 12, cursor: "pointer",
                transition: "all .15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--danger-border)"; e.currentTarget.style.color = "var(--danger)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              <LogOutIcon size={13}/> <span className="logout-label">Đăng xuất</span>
            </button>
          </div>
        </div>

        {/* Banner slider — only on relevant pages */}
        {showBanner && <BannerSlider />}
      </header>

      {/* ── Main ───────────────────────────────────────────────── */}
      <main style={{ padding: "24px 24px 90px" }} className="customer-main">
        {children}
      </main>

      {/* ── Mobile bottom nav ──────────────────────────────────── */}
      <nav style={{
        display: "none", position: "fixed", bottom: 0, left: 0, right: 0,
        height: 64, background: "rgba(9,18,38,.95)",
        backdropFilter: "blur(20px)", borderTop: "1px solid var(--border-subtle)",
        zIndex: 40,
      }} className="bottom-nav">
        {NAV.map(({ href, Icon, label, color }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 3,
              textDecoration: "none",
              color: active ? color : "var(--text-muted)",
              padding: "8px 4px",
              position: "relative",
            }}>
              {active && (
                <span style={{
                  position: "absolute", top: 0, left: "25%", right: "25%", height: 2,
                  background: color, borderRadius: "0 0 4px 4px",
                }}/>
              )}
              <Icon size={20} color={active ? color : "currentColor"}/>
              <span style={{ fontSize: 9, fontWeight: active ? 700 : 400, letterSpacing: .3, textTransform: "uppercase" }}>
                {label.split(" ")[0]}
              </span>
            </Link>
          );
        })}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px 4px", flex: 1 }}>
          <ThemeToggle />
        </div>
      </nav>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .bottom-nav { display: flex !important; }
          .desktop-nav { display: none !important; }
          .user-name-header { display: none; }
          .logout-label { display: none; }
          .customer-main { padding: 12px 12px 80px !important; }
        }
      `}</style>
    </div>
  );
}
