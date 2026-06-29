"use client";
import { useState, useEffect } from "react";
import type { NavItem } from "@/types/landing";

interface Props {
  brand: string;
  items: NavItem[];
}

export default function LandingNav({ brand, items }: Props) {
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else            document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleNav = (href: string, external: boolean) => {
    setMobileOpen(false);
    if (external) { window.open(href, "_blank", "noopener"); return; }
    if (href.startsWith("#")) {
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = href;
    }
  };

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: 60,
        background: scrolled
          ? "rgba(8,14,26,.92)"
          : "rgba(8,14,26,.0)",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled
          ? "1px solid rgba(99,102,241,.15)"
          : "1px solid transparent",
        transition: "background .3s,border-color .3s,backdrop-filter .3s",
        display: "flex", alignItems: "center",
        padding: "0 max(24px, calc((100vw - 1200px)/2))",
      }}>
        {/* Brand */}
        <div style={{
          display: "flex", alignItems: "center", gap: 9,
          marginRight: "auto", cursor: "pointer",
        }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <img src="/logo.png" alt={brand}
            style={{ width: 30, height: 30, borderRadius: 8, objectFit: "cover",
              filter: "drop-shadow(0 0 8px rgba(99,102,241,.5))" }} />
          <span style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9", letterSpacing: -.2 }}>
            {brand}
          </span>
        </div>

        {/* Desktop nav items */}
        <div className="nav-links" style={{ display: "flex", gap: 2, alignItems: "center" }}>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.href, item.external)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "6px 14px", borderRadius: 8,
                fontSize: 13, fontWeight: 500, color: "#94a3b8",
                display: "flex", alignItems: "center", gap: 5,
                transition: "color .15s, background .15s",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#f1f5f9";
                e.currentTarget.style.background = "rgba(255,255,255,.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#94a3b8";
                e.currentTarget.style.background = "none";
              }}
            >
              {item.label}
              {item.badge && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: "1px 5px",
                  borderRadius: 99, background: "#6366f1",
                  color: "#fff", lineHeight: 1.4,
                }}>
                  {item.badge}
                </span>
              )}
              {item.external && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" style={{ opacity: .5 }}>
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* CTA + hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 16 }}>
          <button
            onClick={() => document.getElementById("login-card")?.scrollIntoView({ behavior: "smooth" })}
            className="nav-cta"
            style={{
              padding: "7px 18px", borderRadius: 10,
              background: "linear-gradient(135deg,#6366f1,#4f46e5)",
              border: "none", color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: "pointer", transition: "all .2s",
              boxShadow: "0 2px 12px rgba(99,102,241,.4)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(99,102,241,.6)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 2px 12px rgba(99,102,241,.4)"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            Đăng nhập
          </button>

          <button
            className="nav-hamburger"
            onClick={() => setMobileOpen(true)}
            style={{
              display: "none", width: 36, height: 36, borderRadius: 8,
              background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)",
              cursor: "pointer", alignItems: "center", justifyContent: "center",
              color: "#94a3b8",
            }}
            aria-label="Menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          display: "flex",
        }}>
          {/* Backdrop */}
          <div
            onClick={() => setMobileOpen(false)}
            style={{ flex: 1, background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)" }}
          />
          {/* Drawer */}
          <div style={{
            width: 280, height: "100%",
            background: "rgba(8,14,26,.97)", backdropFilter: "blur(20px)",
            borderLeft: "1px solid rgba(99,102,241,.15)",
            display: "flex", flexDirection: "column",
            padding: 20,
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <img src="/logo.png" alt={brand}
                  style={{ width: 28, height: 28, borderRadius: 7, objectFit: "cover" }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>{brand}</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                style={{
                  width: 30, height: 30, borderRadius: 7,
                  background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#64748b",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Nav links */}
            <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.href, item.external)}
                  style={{
                    background: "none", border: "1px solid transparent",
                    cursor: "pointer", padding: "12px 14px", borderRadius: 10,
                    textAlign: "left", fontSize: 14, fontWeight: 500, color: "#94a3b8",
                    display: "flex", alignItems: "center", gap: 8, transition: "all .15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#f1f5f9";
                    e.currentTarget.style.background = "rgba(99,102,241,.08)";
                    e.currentTarget.style.borderColor = "rgba(99,102,241,.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#94a3b8";
                    e.currentTarget.style.background = "none";
                    e.currentTarget.style.borderColor = "transparent";
                  }}
                >
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "1px 6px",
                      borderRadius: 99, background: "#6366f1", color: "#fff",
                    }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            <button
              onClick={() => { setMobileOpen(false); document.getElementById("login-card")?.scrollIntoView({ behavior: "smooth" }); }}
              style={{
                width: "100%", padding: "12px",
                background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                border: "none", borderRadius: 12, color: "#fff",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
                boxShadow: "0 4px 20px rgba(99,102,241,.4)",
              }}
            >
              Đăng nhập ngay
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-links { display: none !important; }
          .nav-hamburger { display: flex !important; }
          .nav-cta { display: none !important; }
        }
      `}</style>
    </>
  );
}
