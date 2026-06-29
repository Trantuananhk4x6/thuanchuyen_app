"use client";
import { useEffect, useState, Suspense } from "react";
import { signIn, getProviders } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  EnvelopeIcon, KeyIcon, UserIcon, CarIcon,
  CheckCircleIcon, AlertTriangleIcon,
} from "@/components/ui/Icons";
import type { LandingConfigData } from "@/types/landing";

const ThreeBackground = dynamic(() => import("@/components/ThreeBackground"), { ssr: false });
const GeoIcon = dynamic(() => import("@/components/ui/GeoIcon"), { ssr: false });

type Tab = "otp" | "password" | "register-customer" | "register-driver";
type OtpStep = "email" | "code";

const LAST_TAB_KEY = "td_last_tab";

const OAUTH_ERRORS: Record<string, string> = {
  OAuthCallback:        "Google OAuth thất bại — kiểm tra cài đặt Google Console (redirect URI).",
  OAuthAccountNotLinked:"Email này đã đăng ký bằng mật khẩu. Dùng mục 'Mật khẩu' để đăng nhập.",
  OAuthCreateAccount:   "Không thể tạo tài khoản từ Google. Thử lại sau.",
  Callback:             "Lỗi callback xác thực. Thử lại sau.",
  AccessDenied:         "Bạn đã từ chối cấp quyền Google.",
  Verification:         "Liên kết xác thực không hợp lệ hoặc đã hết hạn.",
  Default:              "Đăng nhập thất bại. Vui lòng thử lại.",
};

interface Props {
  config: LandingConfigData;
}

function LoginPage({ config }: Props) {
  const searchParams = useSearchParams();
  const [tab,      setTab]      = useState<Tab>("otp");
  const [otpStep,  setOtpStep]  = useState<OtpStep>("email");
  const [email,    setEmail]    = useState("");
  const [otp,      setOtp]      = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [msg,      setMsg]      = useState<{ ok: boolean; text: string } | null>(null);
  const [hasGoogle, setHasGoogle] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  const isBotDetected = () => honeypot.length > 0;
  const isRegister    = tab === "register-customer" || tab === "register-driver";
  const isDriver      = tab === "register-driver";

  useEffect(() => {
    const errCode = searchParams?.get("error");
    if (errCode) setMsg({ ok: false, text: OAUTH_ERRORS[errCode] ?? OAUTH_ERRORS.Default });
  }, [searchParams]);

  useEffect(() => {
    const saved = localStorage.getItem(LAST_TAB_KEY) as Tab | null;
    if (saved && ["otp","password","register-customer","register-driver"].includes(saved)) setTab(saved);
    getProviders().then((p) => setHasGoogle(!!p?.google));
  }, []);

  const switchTab = (t: Tab) => {
    setTab(t); setMsg(null); setOtpStep("email");
    localStorage.setItem(LAST_TAB_KEY, t);
  };

  const goHome = () => { window.location.href = "/"; };
  const reset  = () => { setMsg(null); setOtp(""); };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMsg(null);
    try {
      const res  = await fetch("/api/v1/auth/email-otp/request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Không gửi được OTP");
      setOtpStep("code");
      setMsg({ ok: true, text: `Mã 6 chữ số đã gửi tới ${email}` });
    } catch (err) { setMsg({ ok: false, text: (err as Error).message }); }
    finally { setLoading(false); }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBotDetected()) { setMsg({ ok: false, text: "Xác thực thất bại." }); return; }
    setLoading(true); setMsg(null);
    const res = await signIn("email-otp", { email, otp, redirect: false });
    setLoading(false);
    if (res?.error) setMsg({ ok: false, text: res.error });
    else goHome();
  };

  const loginPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBotDetected()) { setMsg({ ok: false, text: "Xác thực thất bại." }); return; }
    setLoading(true); setMsg(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) setMsg({ ok: false, text: res.error === "CredentialsSignin" ? "Email hoặc mật khẩu không đúng" : res.error });
    else goHome();
  };

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBotDetected()) { setMsg({ ok: false, text: "Xác thực thất bại." }); return; }
    setLoading(true); setMsg(null);
    const role = isDriver ? "DRIVER" : "CUSTOMER";
    try {
      const res  = await fetch("/api/v1/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, role }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      await signIn("credentials", { email, password, redirect: false });
      goHome();
    } catch (err) { setMsg({ ok: false, text: (err as Error).message }); }
    finally { setLoading(false); }
  };

  const visibleFeatures = [...config.heroFeatures]
    .filter((f) => f.visible)
    .sort((a, b) => a.order - b.order);

  return (
    <div id="about" style={{
      minHeight: "100vh", position: "relative",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "80px 16px 40px",  // 80px top accounts for sticky nav
      overflow: "hidden",
    }}>
      {/* Honeypot */}
      <input
        type="text" name="website" value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1} autoComplete="off" aria-hidden="true"
        style={{ position:"absolute", left:"-9999px", width:1, height:1, opacity:0, pointerEvents:"none" }}
      />
      <ThreeBackground />

      <div style={{ position:"absolute",top:"8%",left:"3%",width:500,height:500,borderRadius:"50%",
        background:"radial-gradient(circle,rgba(99,102,241,.12) 0%,transparent 70%)",
        animation:"pulse 5s ease-in-out infinite",pointerEvents:"none",zIndex:1 }} />
      <div style={{ position:"absolute",bottom:"8%",right:"3%",width:600,height:600,borderRadius:"50%",
        background:"radial-gradient(circle,rgba(6,182,212,.09) 0%,transparent 70%)",
        animation:"pulse 6s ease-in-out infinite reverse",pointerEvents:"none",zIndex:1 }} />

      {/* ── Hero panel ───────────────────────────────────────── */}
      <div id="features" className="login-hero" style={{
        flex:1, maxWidth:520, marginRight:56, zIndex:10,
        display:"none", flexDirection:"column",
      }}>
        {/* Badge */}
        <div style={{
          display:"inline-flex",alignItems:"center",gap:8,
          background:"rgba(99,102,241,.12)",border:"1px solid rgba(99,102,241,.22)",
          borderRadius:999,padding:"6px 16px",marginBottom:28,width:"fit-content",
        }}>
          <span style={{width:6,height:6,borderRadius:"50%",background:"#22d3ee",display:"inline-block",
            boxShadow:"0 0 8px #22d3ee,0 0 16px #22d3ee44"}}/>
          <span style={{color:"#94a3b8",fontSize:13,letterSpacing:0.3}}>{config.heroBadge}</span>
        </div>

        {/* Headline */}
        <h1 style={{fontSize:"clamp(30px,3.6vw,48px)",fontWeight:800,lineHeight:1.15,color:"#f8fafc",marginBottom:18}}>
          {config.heroTitle}{" "}
          <span style={{background:"linear-gradient(90deg,#6366f1,#22d3ee)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
            {config.heroHighlight}
          </span>
        </h1>

        {/* Subtitle */}
        <p style={{color:"#94a3b8",fontSize:15,lineHeight:1.9,marginBottom:36,whiteSpace:"pre-line"}}>
          {config.heroSubtitle.split("\n").map((line, i) =>
            i === 0 ? line : <><br/><span key={i} style={{color:"#c4c9d4"}}>{line}</span></>
          )}
        </p>

        {/* Feature list */}
        {visibleFeatures.map((f) => (
          <div key={f.id} style={{display:"flex",gap:16,alignItems:"flex-start",marginBottom:22}}>
            <div style={{width:46,height:46,borderRadius:12,flexShrink:0,
              background:"rgba(99,102,241,.1)",border:"1px solid rgba(99,102,241,.18)",
              display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
              <GeoIcon type={f.geoType} size={46}/>
            </div>
            <div style={{paddingTop:3}}>
              <div style={{color:"#e2e8f0",fontWeight:700,fontSize:14,marginBottom:3}}>{f.title}</div>
              <div style={{color:"#64748b",fontSize:13,lineHeight:1.6}}>{f.desc}</div>
            </div>
          </div>
        ))}

        {/* Social proof */}
        {config.socialVisible && (
          <div style={{
            marginTop:6,padding:"14px 18px",borderRadius:14,
            background:"rgba(99,102,241,.06)",border:"1px solid rgba(99,102,241,.13)",
            display:"flex",alignItems:"center",gap:14,
          }}>
            <div style={{display:"flex"}}>
              {(["T","M","H","L","A"] as const).map((l, i) => (
                <div key={i} style={{
                  width:28,height:28,borderRadius:"50%",
                  background:["#6366f1","#22d3ee","#34d399","#f472b6","#fb923c"][i],
                  border:"2px solid rgba(15,23,42,.8)",marginLeft:i>0?-8:0,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:11,color:"#fff",fontWeight:700,
                }}>{l}</div>
              ))}
            </div>
            <div>
              <div style={{color:"#e2e8f0",fontSize:13,fontWeight:600}}>{config.socialTitle}</div>
              <div style={{color:"#64748b",fontSize:12,marginTop:2}}>{config.socialSub}</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Login card ───────────────────────────────────────── */}
      <div
        id="login-card"
        style={{
          width:"100%",maxWidth:400,zIndex:10,position:"relative",
          background:"rgba(15,23,42,.92)",backdropFilter:"blur(28px)",
          border:"1px solid rgba(99,102,241,.18)",borderRadius:24,
          padding:"28px 24px",
          boxShadow:"0 0 0 1px rgba(99,102,241,.07),0 24px 64px rgba(0,0,0,.6),0 0 100px rgba(99,102,241,.05)",
        }}
      >
        <div style={{position:"absolute",top:0,left:"25%",right:"25%",height:1,
          background:"linear-gradient(90deg,transparent,#6366f1,#22d3ee,transparent)"}}/>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{
            marginBottom:10,display:"inline-flex",alignItems:"center",justifyContent:"center",
            animation:"floatIcon 3s ease-in-out infinite",
            filter:"drop-shadow(0 4px 20px rgba(99,102,241,.4))",
          }}>
            <img src="/logo.png" alt="Thuận Chuyến" style={{width:64,height:64,borderRadius:14,objectFit:"cover"}}/>
          </div>
          {isRegister ? (
            <>
              <div style={{color:"#f1f5f9",fontWeight:700,fontSize:18,marginBottom:3}}>
                {isDriver ? "Trở thành Tài xế" : "Tạo tài khoản"}
              </div>
              <div style={{color:"#475569",fontSize:12}}>
                {isDriver ? "Bắt đầu kiếm thêm thu nhập ngay hôm nay" : "Đặt chuyến nhanh, giá tốt mỗi ngày"}
              </div>
            </>
          ) : (
            <>
              <div style={{color:"#f1f5f9",fontWeight:700,fontSize:18,marginBottom:3}}>Thuận Chuyến</div>
              <div style={{color:"#475569",fontSize:12}}>Chào mừng trở lại</div>
            </>
          )}
        </div>

        {/* Alert */}
        {msg && (
          <div style={{
            padding:"10px 14px",borderRadius:10,fontSize:13,marginBottom:14,
            background:msg.ok?"rgba(34,197,94,.08)":"rgba(239,68,68,.08)",
            border:`1px solid ${msg.ok?"rgba(34,197,94,.22)":"rgba(239,68,68,.22)"}`,
            color:msg.ok?"#4ade80":"#f87171",
          }}>
            <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
              {msg.ok
                ? <CheckCircleIcon size={14} style={{display:"inline"}}/>
                : <AlertTriangleIcon size={14} style={{display:"inline"}}/>}
              {msg.text}
            </span>
          </div>
        )}

        {/* ════ LOGIN MODE ════ */}
        {!isRegister && (
          <>
            {hasGoogle && (
              <>
                <GoogleBtn loading={loading} tab={tab} />
                <CardDivider label="hoặc đăng nhập bằng" />
              </>
            )}

            <div style={{display:"flex",gap:3,background:"rgba(0,0,0,.3)",borderRadius:12,padding:4,marginBottom:16}}>
              <Pill active={tab==="otp"} onClick={()=>switchTab("otp")}>
                <EnvelopeIcon size={12} style={{display:"inline",verticalAlign:"middle",marginRight:4}}/>OTP Email
              </Pill>
              <Pill active={tab==="password"} onClick={()=>switchTab("password")}>
                <KeyIcon size={12} style={{display:"inline",verticalAlign:"middle",marginRight:4}}/>Mật khẩu
              </Pill>
            </div>

            {tab==="otp" && otpStep==="email" && (
              <form onSubmit={sendOtp} style={{display:"flex",flexDirection:"column",gap:12}}>
                <NeonInput type="email" placeholder="your@email.com" value={email} onChange={setEmail} label="Địa chỉ Email" autoFocus/>
                <NeonBtn loading={loading} label="Gửi mã OTP →"/>
              </form>
            )}

            {tab==="otp" && otpStep==="code" && (
              <form onSubmit={verifyOtp} style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={{
                  textAlign:"center",padding:"10px 14px",borderRadius:10,
                  background:"rgba(6,182,212,.07)",border:"1px solid rgba(6,182,212,.16)",
                  color:"#67e8f9",fontSize:13,
                }}>
                  <EnvelopeIcon size={13} style={{display:"inline",verticalAlign:"middle",marginRight:6}}/>
                  Mã đã gửi tới <strong>{email}</strong>
                </div>
                <NeonInput
                  type="text" placeholder="• • • • • •" value={otp}
                  onChange={(v) => setOtp(v.replace(/\D/g,""))}
                  label="Nhập mã OTP (6 chữ số)" maxLength={6} autoFocus
                  style={{fontSize:26,letterSpacing:12,textAlign:"center",fontWeight:700}}
                />
                <NeonBtn loading={loading} label="Xác nhận đăng nhập" disabled={otp.length<6}/>
                <button type="button" onClick={()=>{setOtpStep("email");reset();}}
                  style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:12,paddingTop:2,textAlign:"center"}}>
                  ← Đổi email · Gửi lại
                </button>
              </form>
            )}

            {tab==="password" && (
              <form onSubmit={loginPassword} style={{display:"flex",flexDirection:"column",gap:12}}>
                <NeonInput type="email" placeholder="your@email.com" value={email} onChange={setEmail} label="Email"/>
                <NeonInput type="password" placeholder="••••••••" value={password} onChange={setPassword} label="Mật khẩu"/>
                <NeonBtn loading={loading} label="Đăng nhập"/>
              </form>
            )}

            <div style={{marginTop:20}}>
              <CardDivider label="Chưa có tài khoản?" />
              <div style={{display:"flex",gap:8,marginTop:12}}>
                <RegisterCTA icon={<UserIcon size={15}/>} label="Đặt xe" sub="Khách hàng" color="#22d3ee" onClick={()=>switchTab("register-customer")}/>
                <RegisterCTA icon={<CarIcon size={15}/>}  label="Chạy xe" sub="Tài xế"     color="#f472b6" onClick={()=>switchTab("register-driver")}/>
              </div>
            </div>
          </>
        )}

        {/* ════ REGISTER MODE ════ */}
        {isRegister && (
          <>
            <button
              type="button"
              onClick={() => switchTab("otp")}
              style={{
                background:"none",border:"1px solid rgba(255,255,255,.07)",
                borderRadius:8,color:"#64748b",cursor:"pointer",
                fontSize:12,padding:"6px 12px",marginBottom:16,
                display:"inline-flex",alignItems:"center",gap:5,transition:"all .2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor="rgba(99,102,241,.3)"; e.currentTarget.style.color="#94a3b8"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor="rgba(255,255,255,.07)"; e.currentTarget.style.color="#64748b"; }}
            >
              ← Quay lại đăng nhập
            </button>

            <div style={{display:"flex",gap:3,background:"rgba(0,0,0,.3)",borderRadius:12,padding:4,marginBottom:16}}>
              <Pill active={tab==="register-customer"} onClick={()=>switchTab("register-customer")} color="#22d3ee">
                <UserIcon size={12} style={{display:"inline",verticalAlign:"middle",marginRight:4}}/>Đặt xe (Khách)
              </Pill>
              <Pill active={tab==="register-driver"} onClick={()=>switchTab("register-driver")} color="#f472b6">
                <CarIcon size={12} style={{display:"inline",verticalAlign:"middle",marginRight:4}}/>Chạy xe (Tài xế)
              </Pill>
            </div>

            <form onSubmit={register} style={{display:"flex",flexDirection:"column",gap:12}}>
              <NeonInput type="text" placeholder="Nguyễn Văn A" value={fullName} onChange={setFullName} label="Họ và tên" autoFocus/>
              <NeonInput type="email" placeholder="your@email.com" value={email} onChange={setEmail} label="Email"/>
              <NeonInput type="password" placeholder="Tối thiểu 8 ký tự" value={password} onChange={setPassword} label="Mật khẩu"/>
              <NeonBtn
                loading={loading}
                label={isDriver ? "Đăng ký làm Tài xế →" : "Tạo tài khoản →"}
                color={isDriver ? "#f472b6" : undefined}
              />
              {isDriver && (
                <p style={{fontSize:11,color:"#475569",textAlign:"center",lineHeight:1.6,marginTop:2}}>
                  Sau đăng ký, hoàn thành <strong style={{color:"#94a3b8"}}>KYC</strong> để bắt đầu nhận chuyến.
                </p>
              )}
            </form>
          </>
        )}

        <p style={{textAlign:"center",marginTop:20,fontSize:12}}>
          <a href="/guide" style={{color:"#4f46e5",textDecoration:"none",opacity:.7}}>📖 Xem hướng dẫn sử dụng</a>
        </p>
      </div>

      <style>{`
        @keyframes pulse     { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.05);opacity:.7} }
        @keyframes floatIcon { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes spin      { to{transform:rotate(360deg)} }
        @media(min-width:900px){ .login-hero{display:flex!important} }
      `}</style>
    </div>
  );
}

export default function LoginForm({ config }: Props) {
  return (
    <Suspense>
      <LoginPage config={config} />
    </Suspense>
  );
}

/* ── Sub-components ───────────────────────────────────────────────── */

function CardDivider({ label }: { label: string }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,margin:"14px 0"}}>
      <div style={{flex:1,height:1,background:"rgba(255,255,255,.06)"}}/>
      <span style={{color:"#334155",fontSize:11,whiteSpace:"nowrap"}}>{label}</span>
      <div style={{flex:1,height:1,background:"rgba(255,255,255,.06)"}}/>
    </div>
  );
}

function GoogleBtn({ loading, tab }: { loading: boolean; tab: Tab }) {
  return (
    <button
      onClick={() => { localStorage.setItem(LAST_TAB_KEY, tab); signIn("google", { callbackUrl:"/" }); }}
      disabled={loading}
      style={{
        width:"100%",padding:"11px 16px",
        border:"1px solid rgba(255,255,255,.08)",borderRadius:12,
        background:"rgba(255,255,255,.04)",cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",
        gap:10,fontSize:14,fontWeight:500,color:"#e2e8f0",transition:"all .2s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background="rgba(255,255,255,.08)"; e.currentTarget.style.borderColor="rgba(99,102,241,.3)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background="rgba(255,255,255,.04)"; e.currentTarget.style.borderColor="rgba(255,255,255,.08)"; }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Tiếp tục với Google
    </button>
  );
}

function Pill({ active, onClick, children, color }: {
  active: boolean; onClick: () => void; children: React.ReactNode; color?: string;
}) {
  const c = color ?? "#6366f1";
  return (
    <button onClick={onClick} type="button" style={{
      flex:1,padding:"9px 4px",border:"none",cursor:"pointer",borderRadius:9,
      fontSize:12,fontWeight:600,transition:"all .2s",
      background: active ? `linear-gradient(135deg,${c}cc,${c}88)` : "transparent",
      color: active ? "#fff" : "#475569",
      boxShadow: active ? `0 2px 12px ${c}44` : "none",
    }}>
      {children}
    </button>
  );
}

function RegisterCTA({ icon, label, sub, color, onClick }: {
  icon: React.ReactNode; label: string; sub: string; color: string; onClick: () => void;
}) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        flex:1,padding:"12px 8px",borderRadius:12,cursor:"pointer",
        background:"rgba(0,0,0,.2)",border:`1px solid ${color}28`,
        display:"flex",flexDirection:"column",alignItems:"center",gap:5,
        transition:"all .22s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background=`${color}10`;
        e.currentTarget.style.borderColor=`${color}55`;
        e.currentTarget.style.transform="translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background="rgba(0,0,0,.2)";
        e.currentTarget.style.borderColor=`${color}28`;
        e.currentTarget.style.transform="translateY(0)";
      }}
    >
      <span style={{ color, width:34, height:34, borderRadius:9, background:`${color}16`,
        display:"flex", alignItems:"center", justifyContent:"center" }}>
        {icon}
      </span>
      <span style={{color:"#e2e8f0",fontSize:13,fontWeight:700}}>{label}</span>
      <span style={{color:"#475569",fontSize:11}}>{sub}</span>
    </button>
  );
}

function NeonInput({ type, placeholder, value, onChange, label, autoFocus, maxLength, style: extra }: {
  type: string; placeholder: string; value: string;
  onChange: (v: string) => void; label: string;
  autoFocus?: boolean; maxLength?: number; style?: React.CSSProperties;
}) {
  return (
    <div>
      <label style={{display:"block",color:"#475569",fontSize:11,fontWeight:600,marginBottom:5,letterSpacing:0.3}}>
        {label}
      </label>
      <input
        type={type} placeholder={placeholder} value={value} required
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus} maxLength={maxLength}
        style={{
          width:"100%",padding:"11px 14px",
          background:"rgba(255,255,255,.03)",
          border:"1px solid rgba(99,102,241,.18)",
          borderRadius:10,color:"#f1f5f9",fontSize:14,outline:"none",
          transition:"all .2s",boxSizing:"border-box",...extra,
        }}
        onFocus={(e) => {
          e.target.style.borderColor="#6366f1";
          e.target.style.boxShadow="0 0 0 3px rgba(99,102,241,.12)";
          e.target.style.background="rgba(99,102,241,.04)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor="rgba(99,102,241,.18)";
          e.target.style.boxShadow="none";
          e.target.style.background="rgba(255,255,255,.03)";
        }}
      />
    </div>
  );
}

function NeonBtn({ loading, label, disabled, color }: {
  loading: boolean; label: string; disabled?: boolean; color?: string;
}) {
  const c = color ?? "#6366f1";
  return (
    <button
      type="submit" disabled={loading || disabled}
      style={{
        width:"100%",padding:"12px",marginTop:2,
        background: disabled ? "rgba(99,102,241,.15)" : `linear-gradient(135deg,${c},${c}bb)`,
        border:"none",borderRadius:10,color:"#fff",fontSize:14,fontWeight:600,
        cursor: loading || disabled ? "not-allowed" : "pointer",
        opacity: disabled ? .5 : 1,transition:"all .2s",
        boxShadow: disabled ? "none" : `0 4px 20px ${c}44`,
        letterSpacing:0.3,
      }}
      onMouseEnter={(e) => { if (!loading && !disabled) { e.currentTarget.style.boxShadow=`0 6px 28px ${c}66`; e.currentTarget.style.transform="translateY(-1px)"; }}}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow=`0 4px 20px ${c}44`; e.currentTarget.style.transform="translateY(0)"; }}
    >
      {loading ? (
        <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <span style={{
            width:15,height:15,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",
            borderRadius:"50%",display:"inline-block",animation:"spin .7s linear infinite",
          }}/>
          Đang xử lý...
        </span>
      ) : label}
    </button>
  );
}
