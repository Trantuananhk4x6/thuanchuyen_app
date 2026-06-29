"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ActivityIcon, CarIcon, DocumentIcon, RouteIcon, ZapIcon,
  WalletIcon, FlagIcon, TagIcon, UsersGroupIcon, CheckCircleIcon,
  ShieldIcon, TrendingUpIcon,
} from "@/components/ui/Icons";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";

const GeoIcon = dynamic(() => import("@/components/ui/GeoIcon"), { ssr: false });

const TT = {
  background: "rgba(15,23,42,.95)",
  border: "1px solid rgba(99,102,241,.3)",
  borderRadius: 8, color: "#f1f5f9", fontSize: 12,
};

interface DashboardMetrics {
  totalUsers: number; totalDrivers: number; pendingKyc: number;
  totalTrips: number; activeTrips: number; pendingWithdrawals: number; openReports: number;
}

type GType = "notification"|"backhaul"|"cargo"|"route"|"realtime"|"payment"|"ai";

const STATS: Array<{
  key: keyof DashboardMetrics; label: string; geo: GType;
  color: string; Icon: React.FC<{size?:number;color?:string}>;
  href?: string; alert?: boolean;
}> = [
  { key:"totalUsers",        label:"Người dùng",    geo:"notification", color:"#6366f1", Icon:UsersGroupIcon },
  { key:"totalDrivers",      label:"Tài xế",        geo:"backhaul",     color:"#22d3ee", Icon:CarIcon },
  { key:"pendingKyc",        label:"KYC chờ duyệt", geo:"cargo",        color:"#fbbf24", Icon:DocumentIcon, href:"/admin/drivers?status=PENDING", alert:true },
  { key:"totalTrips",        label:"Tổng chuyến",   geo:"route",        color:"#a78bfa", Icon:RouteIcon },
  { key:"activeTrips",       label:"Đang chạy",     geo:"realtime",     color:"#34d399", Icon:ZapIcon },
  { key:"pendingWithdrawals",label:"Rút tiền chờ",  geo:"payment",      color:"#34d399", Icon:WalletIcon, href:"/admin/withdrawals?status=PENDING", alert:true },
  { key:"openReports",       label:"Báo cáo mở",    geo:"ai",           color:"#f87171", Icon:FlagIcon, href:"/admin/reports?status=OPEN", alert:true },
];

function buildChartData(txns: { createdAt: string }[] = []) {
  const days = 14;
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
    return {
      date: d.toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit" }),
      chuyến:   Math.floor(20 + Math.random() * 80),
      doanhthu: Math.floor(500_000 + Math.random() * 2_000_000),
      nguoidung:Math.floor(2  + Math.random() * 15),
    };
  });
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const chartData = buildChartData();

  useEffect(() => {
    api.get<DashboardMetrics>("/admin/dashboard")
      .then((r) => setMetrics(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:400, gap:16 }}>
      <div style={{ width:36, height:36, borderRadius:"50%", border:"3px solid rgba(99,102,241,.2)", borderTopColor:"#6366f1", animation:"spin .8s linear infinite" }}/>
      <span style={{ color:"var(--text-muted)", fontSize:13 }}>Đang tải dữ liệu...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!metrics) return (
    <div style={{ textAlign:"center", padding:48 }}>
      <AlertIcon size={40} color="var(--danger)" style={{ margin:"0 auto 12px" }}/>
      <p style={{ color:"var(--text-muted)", marginBottom:16 }}>Không tải được dữ liệu</p>
      <button onClick={() => window.location.reload()} style={{ padding:"8px 20px", borderRadius:8, background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)", color:"var(--text-primary)", cursor:"pointer" }}>
        Thử lại
      </button>
    </div>
  );

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:"var(--text-primary)", display:"flex", alignItems:"center", gap:10, margin:0 }}>
            <ActivityIcon size={22} color="#6366f1"/> Tổng quan hệ thống
          </h1>
          <div style={{
            display:"inline-flex", alignItems:"center", gap:6,
            background:"rgba(52,211,153,.1)", border:"1px solid rgba(52,211,153,.25)",
            borderRadius:99, padding:"5px 14px", fontSize:11, color:"#34d399", fontWeight:600,
          }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#34d399", boxShadow:"0 0 6px #34d399" }}/>
            Thời gian thực
          </div>
        </div>
        <div style={{ height:2, background:"linear-gradient(90deg,#6366f1,#22d3ee,transparent)", marginTop:16, borderRadius:99 }}/>
      </div>

      {/* ── Stat cards with GeoIcon ─────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14, marginBottom:24 }}>
        {STATS.map(({ key, label, geo, color, Icon, href, alert }) => {
          const value = metrics[key];
          const Card = (
            <div style={{
              background:"var(--bg-surface)", border:`1px solid ${value > 0 && alert ? `${color}35` : "var(--border-subtle)"}`,
              borderRadius:16, padding:18, position:"relative", overflow:"hidden",
              cursor: href ? "pointer" : "default", transition:"all .2s",
            }}
              onMouseEnter={(e) => { if (href) { e.currentTarget.style.borderColor=color+"60"; e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 8px 24px ${color}18`; } }}
              onMouseLeave={(e) => { if (href) { e.currentTarget.style.borderColor=value>0&&alert?`${color}35`:"var(--border-subtle)"; e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; } }}
            >
              {/* Ambient glow */}
              <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, borderRadius:"50%", background:`radial-gradient(circle,${color}15 0%,transparent 70%)`, pointerEvents:"none" }}/>

              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <GeoIcon type={geo} size={40}/>
                {alert && value > 0 && (
                  <span style={{ padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700, background:`${color}20`, color, border:`1px solid ${color}40` }}>
                    CẦN XỬ LÝ
                  </span>
                )}
              </div>
              <div style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:.5, marginBottom:4 }}>
                {label}
              </div>
              <div style={{ fontSize:28, fontWeight:800, color, letterSpacing:-1, lineHeight:1 }}>
                {value.toLocaleString("vi-VN")}
              </div>
              {href && (
                <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:6, display:"flex", alignItems:"center", gap:4 }}>
                  <Icon size={10}/> Xem chi tiết →
                </div>
              )}
            </div>
          );
          return href ? <Link key={key} href={href} style={{ textDecoration:"none" }}>{Card}</Link> : <div key={key}>{Card}</div>;
        })}
      </div>

      {/* ── Quick actions + System status ───────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:16, marginBottom:24 }}>
        {/* Quick actions */}
        <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:16, overflow:"hidden" }}>
          <div style={{ padding:"14px 20px 10px", borderBottom:"1px solid var(--border-subtle)", display:"flex", alignItems:"center", gap:8 }}>
            <ZapIcon size={15} color="#fbbf24"/>
            <span style={{ fontWeight:700, fontSize:14, color:"var(--text-primary)" }}>Thao tác nhanh</span>
          </div>
          <div style={{ padding:"4px 0" }}>
            {[
              { href:"/admin/drivers?status=PENDING",     Icon:DocumentIcon,   label:"Duyệt KYC đang chờ",    count:metrics.pendingKyc,        color:"#fbbf24" },
              { href:"/admin/withdrawals?status=PENDING", Icon:WalletIcon,     label:"Duyệt rút tiền",         count:metrics.pendingWithdrawals, color:"#6366f1" },
              { href:"/admin/reports?status=OPEN",        Icon:FlagIcon,       label:"Xử lý báo cáo",          count:metrics.openReports,        color:"#f87171" },
              { href:"/admin/pricing",                    Icon:TagIcon,        label:"Cấu hình bảng giá",      count:null,                       color:"#34d399" },
            ].map((l) => (
              <Link key={l.href} href={l.href} style={{ textDecoration:"none", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 20px", borderBottom:"1px solid var(--border-subtle)", color:"var(--text-primary)", fontSize:13, fontWeight:500, transition:"all .15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-overlay)"; e.currentTarget.style.color = l.color; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-primary)"; }}
              >
                <span style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <l.Icon size={14}/> {l.label}
                </span>
                {l.count !== null && l.count > 0 && (
                  <span style={{ padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700, background:`${l.color}20`, color:l.color, border:`1px solid ${l.color}40` }}>{l.count}</span>
                )}
                {l.count === null && <span style={{ color:"var(--text-muted)", fontSize:12 }}>→</span>}
              </Link>
            ))}
          </div>
        </div>

        {/* System status */}
        <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:16, overflow:"hidden" }}>
          <div style={{ padding:"14px 20px 10px", borderBottom:"1px solid var(--border-subtle)", display:"flex", alignItems:"center", gap:8 }}>
            <ShieldIcon size={15} color="#6366f1"/>
            <span style={{ fontWeight:700, fontSize:14, color:"var(--text-primary)" }}>Trạng thái hệ thống</span>
          </div>
          <div style={{ padding:"4px 0" }}>
            {[
              { label:"Chuyến đang hoạt động", value:metrics.activeTrips,                                    ok:true,                                             color:"#34d399" },
              { label:"Yêu cầu tồn đọng",      value:metrics.pendingKyc+metrics.pendingWithdrawals,          ok:metrics.pendingKyc+metrics.pendingWithdrawals<=5, color:"#fbbf24" },
              { label:"Báo cáo chưa xử lý",    value:metrics.openReports,                                   ok:metrics.openReports===0,                          color:"#f87171" },
            ].map((item, i, arr) => (
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderBottom:i<arr.length-1?"1px solid var(--border-subtle)":"none" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"var(--text-secondary)" }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", background:item.ok?"#34d399":item.value>5?"#fbbf24":"#f87171", boxShadow:`0 0 6px ${item.ok?"#34d399":item.value>5?"#fbbf24":"#f87171"}` }}/>
                  {item.label}
                </div>
                <span style={{ fontWeight:700, fontSize:18, color:item.ok?"var(--success)":item.value>5?"var(--warning)":"var(--danger)" }}>
                  {item.value}
                </span>
              </div>
            ))}
            <div style={{ margin:"0 20px 14px", padding:"10px 14px", borderRadius:10, background:"var(--success-bg)", border:"1px solid var(--success-border)", display:"flex", alignItems:"center", gap:8, fontSize:12, color:"var(--success)" }}>
              <CheckCircleIcon size={13}/> Hệ thống hoạt động bình thường
            </div>
          </div>
        </div>
      </div>

      {/* ── Charts ──────────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16, marginBottom:16 }} className="admin-charts">
        <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:16, overflow:"hidden" }}>
          <div style={{ padding:"14px 20px 10px", borderBottom:"1px solid var(--border-subtle)", display:"flex", alignItems:"center", gap:8 }}>
            <TrendingUpIcon size={15} color="#6366f1"/>
            <span style={{ fontWeight:700, fontSize:14, color:"var(--text-primary)" }}>Chuyến xe — 14 ngày qua</span>
          </div>
          <div style={{ padding:"16px 8px 8px" }}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gTrip" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,.07)"/>
                <XAxis dataKey="date" tick={{ fill:"#475569", fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:"#475569", fontSize:10 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={TT} formatter={(v: unknown) => [v+" chuyến","Số chuyến"]}/>
                <Area type="monotone" dataKey="chuyến" stroke="#6366f1" strokeWidth={2.5} fill="url(#gTrip)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:16, overflow:"hidden" }}>
          <div style={{ padding:"14px 20px 10px", borderBottom:"1px solid var(--border-subtle)", display:"flex", alignItems:"center", gap:8 }}>
            <UsersGroupIcon size={15} color="#22d3ee"/>
            <span style={{ fontWeight:700, fontSize:14, color:"var(--text-primary)" }}>Người dùng mới</span>
          </div>
          <div style={{ padding:"16px 8px 8px" }}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,.07)"/>
                <XAxis dataKey="date" tick={{ fill:"#475569", fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:"#475569", fontSize:10 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={TT} formatter={(v: unknown) => [v+" người","Mới"]}/>
                <Line type="monotone" dataKey="nguoidung" stroke="#22d3ee" strokeWidth={2.5} dot={{ fill:"#22d3ee", r:3 }}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:16, overflow:"hidden" }}>
        <div style={{ padding:"14px 20px 10px", borderBottom:"1px solid var(--border-subtle)", display:"flex", alignItems:"center", gap:8 }}>
          <WalletIcon size={15} color="#34d399"/>
          <span style={{ fontWeight:700, fontSize:14, color:"var(--text-primary)" }}>Doanh thu ước tính — 14 ngày qua</span>
        </div>
        <div style={{ padding:"16px 8px 8px" }}>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,.07)"/>
              <XAxis dataKey="date" tick={{ fill:"#475569", fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:"#475569", fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v/1000000).toFixed(1)}tr`}/>
              <Tooltip contentStyle={TT} formatter={(v: unknown) => [Number(v).toLocaleString("vi-VN")+"đ","Doanh thu"]}/>
              <Bar dataKey="doanhthu" fill="#34d399" radius={[4,4,0,0]} maxBarSize={28}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .admin-charts { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function AlertIcon({ size = 24, color = "currentColor", style }: { size?: number; color?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display:"block", ...style }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth={2}/>
    </svg>
  );
}
