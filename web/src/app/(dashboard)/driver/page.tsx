"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import dynamic from "next/dynamic";
import {
  WalletIcon, CoinIcon, ClockIcon, CheckCircleIcon, AlertTriangleIcon,
  MapPinIcon, ZapIcon, ShieldIcon, CarIcon, RouteIcon,
  ToggleRightIcon, ToggleLeftIcon, DocumentIcon,
} from "@/components/ui/Icons";

const GeoIcon = dynamic(() => import("@/components/ui/GeoIcon"), { ssr: false });

interface KycStatus { verificationStatus: string; rejectReason: string | null; }
interface WalletData { withdrawableBalance: number; pendingBalance: number; }
interface ActiveTrip {
  id: string; status: string; currentStopIndex: number;
  stops: Array<{ id: string; type: string; address: string; status: string; order: number }>;
  passengers: Array<{ id: string; customerId: string; legStatus: string; pickupOrder: number }>;
}

const KYC_STATUS = {
  NONE:     { color:"#94a3b8", bg:"rgba(148,163,184,.1)", label:"Chưa gửi KYC",       cta:"Gửi ngay →",      href:"/driver/kyc" },
  PENDING:  { color:"#fbbf24", bg:"rgba(251,191,36,.1)",  label:"KYC đang chờ duyệt", cta:null,              href:null },
  APPROVED: { color:"#34d399", bg:"rgba(52,211,153,.1)",  label:"KYC đã được duyệt",  cta:null,              href:null },
  REJECTED: { color:"#f87171", bg:"rgba(248,113,113,.1)", label:"KYC bị từ chối",      cta:"Gửi lại →",      href:"/driver/kyc" },
};

export default function DriverHome() {
  const [kyc,        setKyc]        = useState<KycStatus | null>(null);
  const [wallet,     setWallet]     = useState<WalletData | null>(null);
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [online,     setOnline]     = useState(false);
  const [toggling,   setToggling]   = useState(false);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<KycStatus>("/driver/kyc").then((r) => setKyc(r.data)).catch(() => null),
      api.get<WalletData>("/driver/wallet").then((r) => setWallet(r.data)).catch(() => null),
      api.get<{ trip: ActiveTrip | null }>("/driver/trips/active").then((r) => setActiveTrip(r.data.trip)).catch(() => null),
    ]).finally(() => setLoading(false));
  }, []);

  const toggleOnline = async () => {
    setToggling(true);
    try {
      const res = await api.post<{ isOnline: boolean }>("/driver/availability", { online: !online });
      setOnline(res.data.isOnline);
    } finally { setToggling(false); }
  };

  const startTrip    = async (id: string) => { await api.post(`/driver/trips/${id}/start`, {}); window.location.reload(); };
  const completeStop = async (id: string, stopId: string) => { await api.post(`/driver/trips/${id}/stops/${stopId}/complete`, {}); window.location.reload(); };
  const completeTrip = async (id: string) => { await api.post(`/driver/trips/${id}/complete`, {}); window.location.reload(); };

  const kycStatus = kyc?.verificationStatus ?? "NONE";
  const kycCfg    = KYC_STATUS[kycStatus as keyof typeof KYC_STATUS] ?? KYC_STATUS.NONE;
  const approved  = kycStatus === "APPROVED";

  const currentStop = activeTrip?.stops.find((s) => s.order === activeTrip.currentStopIndex + 1 && s.status === "PENDING");
  const allDone     = activeTrip?.stops.every((s) => s.status !== "PENDING");

  if (loading) return (
    <div style={{ display:"flex", justifyContent:"center", padding:48 }}>
      <div style={{ width:32, height:32, borderRadius:"50%", border:"3px solid rgba(99,102,241,.2)", borderTopColor:"#6366f1", animation:"spin .8s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: 800 }}>

      {/* ── KYC banner ────────────────────────────────────────── */}
      {kycStatus !== "APPROVED" && (
        <div style={{
          display:"flex", alignItems:"center", gap:12, padding:"12px 16px",
          borderRadius:12, marginBottom:20,
          background:kycCfg.bg, border:`1px solid ${kycCfg.color}35`,
        }}>
          <DocumentIcon size={16} color={kycCfg.color} style={{ flexShrink:0 }}/>
          <span style={{ flex:1, fontSize:13, color:kycCfg.color, fontWeight:500 }}>
            {kycCfg.label}
            {kycStatus === "REJECTED" && kyc?.rejectReason && `: ${kyc.rejectReason}`}
          </span>
          {kycCfg.cta && kycCfg.href && (
            <a href={kycCfg.href} style={{ fontSize:12, fontWeight:700, color:kycCfg.color, textDecoration:"none", background:`${kycCfg.color}20`, padding:"4px 12px", borderRadius:99, border:`1px solid ${kycCfg.color}40` }}>
              {kycCfg.cta}
            </a>
          )}
        </div>
      )}

      {/* ── Title ─────────────────────────────────────────────── */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:"var(--text-primary)", display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
          <CarIcon size={22} color="#6366f1"/> Bảng điều khiển
        </h1>
      </div>

      {/* ── Online toggle + wallet ─────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:24 }} className="driver-stats">

        {/* Online toggle */}
        <div style={{
          background:"var(--bg-surface)", border:`2px solid ${online?"rgba(52,211,153,.4)":"var(--border-subtle)"}`,
          borderRadius:16, padding:18, gridColumn:"span 1",
          boxShadow: online ? "0 0 24px rgba(52,211,153,.15)" : "none",
          transition:"all .3s",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <GeoIcon type="realtime" size={36}/>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:.5 }}>Trạng thái</div>
              <div style={{ fontSize:13, fontWeight:700, color: online ? "#34d399" : "#94a3b8" }}>
                {online ? "Đang nhận" : "Nghỉ ngơi"}
              </div>
            </div>
          </div>
          <button
            onClick={toggleOnline}
            disabled={toggling || !approved}
            style={{
              width:"100%", padding:"9px",
              background: online ? "rgba(52,211,153,.15)" : "var(--bg-overlay)",
              border: `1px solid ${online ? "rgba(52,211,153,.4)" : "var(--border-subtle)"}`,
              borderRadius:10, cursor: approved ? "pointer" : "not-allowed",
              color: online ? "#34d399" : "var(--text-muted)",
              fontWeight:600, fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              opacity: !approved ? .5 : 1, transition:"all .2s",
            }}
          >
            {online ? <ToggleRightIcon size={16}/> : <ToggleLeftIcon size={16}/>}
            {toggling ? "Đang đổi..." : online ? "Tắt nhận chuyến" : "Bật nhận chuyến"}
          </button>
          {!approved && <div style={{ fontSize:10, color:"var(--text-muted)", textAlign:"center", marginTop:6 }}>Cần KYC được duyệt</div>}
        </div>

        {/* Withdrawable */}
        <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:16, padding:18 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
            <GeoIcon type="payment" size={36}/>
            <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:.5 }}>Có thể rút</div>
          </div>
          <div style={{ fontSize:22, fontWeight:800, color:"#34d399", letterSpacing:-.5, marginBottom:4 }}>
            {(wallet?.withdrawableBalance ?? 0).toLocaleString("vi-VN")}đ
          </div>
          <a href="/driver/wallet" style={{ fontSize:11, color:"#6366f1", textDecoration:"none", display:"flex", alignItems:"center", gap:4 }}>
            <WalletIcon size={10}/> Xem ví →
          </a>
        </div>

        {/* Pending */}
        <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:16, padding:18 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
            <GeoIcon type="ai" size={36}/>
            <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:.5 }}>Đang giữ</div>
          </div>
          <div style={{ fontSize:22, fontWeight:800, color:"#fbbf24", letterSpacing:-.5, marginBottom:4 }}>
            {(wallet?.pendingBalance ?? 0).toLocaleString("vi-VN")}đ
          </div>
          <div style={{ fontSize:11, color:"var(--text-muted)" }}>Giải phóng sau 3 ngày</div>
        </div>
      </div>

      {/* ── Active trip ───────────────────────────────────────── */}
      {activeTrip ? (
        <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:16, overflow:"hidden", marginBottom:20 }}>
          {/* Header */}
          <div style={{
            padding:"14px 20px", borderBottom:"1px solid var(--border-subtle)",
            display:"flex", alignItems:"center", justifyContent:"space-between",
            background: activeTrip.status === "ONGOING" ? "rgba(52,211,153,.06)" : "transparent",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <RouteIcon size={16} color="#6366f1"/>
              <span style={{ fontWeight:700, fontSize:15, color:"var(--text-primary)" }}>Chuyến đang chạy</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {activeTrip.status === "ONGOING" && (
                <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#34d399", fontWeight:600 }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:"#34d399", animation:"pulse2 1.5s infinite", display:"inline-block" }}/>
                  LIVE
                </span>
              )}
              <span style={{
                padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:600,
                background:"rgba(99,102,241,.15)", color:"#6366f1", border:"1px solid rgba(99,102,241,.3)",
              }}>
                {activeTrip.status}
              </span>
            </div>
          </div>

          <div style={{ padding:20 }}>
            <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:14 }}>
              Mốc {activeTrip.currentStopIndex + 1}/{activeTrip.stops.length} · {activeTrip.passengers.length} hành khách
            </div>

            {activeTrip.status === "ACTIVE" && (
              <button onClick={() => startTrip(activeTrip.id)} style={{
                padding:"10px 20px", background:"var(--grad-primary)", border:"none",
                borderRadius:10, color:"#fff", fontWeight:600, fontSize:14, cursor:"pointer",
                marginBottom:14, display:"flex", alignItems:"center", gap:8,
                boxShadow:"var(--glow-sm)",
              }}>
                <ZapIcon size={14}/> Bắt đầu chuyến
              </button>
            )}

            {currentStop && (
              <div style={{
                padding:"14px 16px", borderRadius:12, marginBottom:14,
                background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.25)",
              }}>
                <div style={{ fontSize:11, color:"var(--brand-primary)", fontWeight:700, textTransform:"uppercase", letterSpacing:.5, marginBottom:8 }}>
                  Điểm dừng tiếp theo #{currentStop.order}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <MapPinIcon size={15} color={currentStop.type === "PICKUP" ? "#22d3ee" : "#f472b6"}/>
                  <div>
                    <div style={{ fontWeight:600, color:"var(--text-primary)", fontSize:13 }}>{currentStop.address}</div>
                    <div style={{ fontSize:11, color: currentStop.type === "PICKUP" ? "#22d3ee" : "#f472b6" }}>
                      {currentStop.type === "PICKUP" ? "Điểm đón" : "Điểm trả"}
                    </div>
                  </div>
                </div>
                <button onClick={() => completeStop(activeTrip.id, currentStop.id)} style={{
                  padding:"8px 18px", background:"var(--grad-primary)", border:"none",
                  borderRadius:8, color:"#fff", fontWeight:600, fontSize:13, cursor:"pointer",
                  display:"flex", alignItems:"center", gap:6,
                }}>
                  <CheckCircleIcon size={13}/> Hoàn tất mốc #{currentStop.order}
                </button>
              </div>
            )}

            {allDone && activeTrip.status === "ONGOING" && (
              <button onClick={() => completeTrip(activeTrip.id)} style={{
                padding:"11px 24px", background:"linear-gradient(135deg,#34d399,#059669)", border:"none",
                borderRadius:10, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer",
                display:"flex", alignItems:"center", gap:8, boxShadow:"0 0 20px rgba(52,211,153,.4)",
              }}>
                <CheckCircleIcon size={15}/> Hoàn thành chuyến
              </button>
            )}

            {/* Stops */}
            <div style={{ marginTop:14 }}>
              {activeTrip.stops.map((s, i) => {
                const isCur  = s.order === activeTrip.currentStopIndex + 1;
                const isDone = s.status === "DONE";
                const isSkip = s.status === "SKIPPED";
                return (
                  <div key={s.id} style={{ display:"flex", gap:12, padding:"8px 0", borderBottom: i < activeTrip.stops.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:24, flexShrink:0 }}>
                      <div style={{
                        width:22, height:22, borderRadius:"50%",
                        background: isDone ? "#34d399" : isSkip ? "#475569" : isCur ? "#6366f1" : "var(--bg-elevated)",
                        border:`2px solid ${isDone?"#34d399":isSkip?"#475569":isCur?"#6366f1":"var(--border-medium)"}`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:9, color:"#fff", fontWeight:700,
                        boxShadow: isCur ? "0 0 10px rgba(99,102,241,.5)" : "none",
                      }}>
                        {isDone ? "✓" : isSkip ? "×" : s.order}
                      </div>
                      {i < activeTrip.stops.length - 1 && (
                        <div style={{ width:2, flex:1, minHeight:12, background: isDone ? "#34d399" : "var(--border-subtle)", margin:"3px 0" }}/>
                      )}
                    </div>
                    <div style={{ flex:1, paddingTop:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:1 }}>
                        <span style={{ fontSize:10, fontWeight:700, color: s.type==="PICKUP"?"#22d3ee":"#f472b6" }}>
                          {s.type === "PICKUP" ? "ĐÓN" : "TRẢ"}
                        </span>
                        {isCur && <span style={{ fontSize:9, background:"rgba(99,102,241,.2)", color:"#a5b4fc", padding:"1px 5px", borderRadius:4, fontWeight:600 }}>HIỆN TẠI</span>}
                      </div>
                      <div style={{ fontSize:12, color: isDone || isSkip ? "var(--text-muted)" : "var(--text-primary)", textDecoration: isSkip ? "line-through" : "none" }}>
                        {s.address}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          background:"var(--bg-surface)", border:"1px dashed var(--border-subtle)",
          borderRadius:16, padding:"40px 20px", textAlign:"center",
        }}>
          <div style={{ marginBottom:16, display:"flex", justifyContent:"center" }}>
            <GeoIcon type="route" size={72}/>
          </div>
          <div style={{ fontSize:16, fontWeight:600, color:"var(--text-secondary)", marginBottom:8 }}>
            Không có chuyến đang chạy
          </div>
          <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:20 }}>
            {online ? "Bạn đang online — chờ nhận chuyến mới" : "Bật nhận chuyến để bắt đầu"}
          </div>
          <a href="/driver/matches" style={{
            display:"inline-flex", alignItems:"center", gap:8,
            padding:"10px 22px", background:"var(--grad-primary)",
            borderRadius:10, color:"#fff", fontWeight:600, fontSize:13, textDecoration:"none",
            boxShadow:"var(--glow-sm)",
          }}>
            <RouteIcon size={14}/> Xem chuyến chờ nhận
          </a>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse2 { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
        @media (max-width: 600px) {
          .driver-stats { grid-template-columns: 1fr 1fr !important; }
          .driver-stats > div:first-child { grid-column: span 2; }
        }
      `}</style>
    </div>
  );
}
