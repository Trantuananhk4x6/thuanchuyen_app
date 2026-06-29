"use client";
import type {
  SectionConfig, BlogPostSummary, EventSummary,
  FooterGroup,
} from "@/types/landing";

/* ── Constants ────────────────────────────────────────────────────── */

const CATEGORY_LABELS: Record<string, string> = {
  TIN_TUC:   "Tin tức",
  KHUYEN_MAI:"Khuyến mãi",
  HUONG_DAN: "Hướng dẫn",
  CAU_CHUYEN:"Câu chuyện",
  THI_TRUONG:"Thị trường",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  CASHBACK:     "Hoàn tiền",
  DOUBLE_POINT: "Điểm đôi",
  DISCOUNT:     "Giảm giá",
  FREE_RIDE:    "Chuyến miễn phí",
  STREAK_BONUS: "Thưởng liên tiếp",
  REFERRAL:     "Giới thiệu bạn",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  CASHBACK:     "#34d399",
  DOUBLE_POINT: "#f472b6",
  DISCOUNT:     "#fb923c",
  FREE_RIDE:    "#6366f1",
  STREAK_BONUS: "#22d3ee",
  REFERRAL:     "#a78bfa",
};

const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    color: "#6366f1",
    title: "Đặt chuyến trong 30 giây",
    desc: "Nhập điểm đi, điểm đến và giờ xuất phát. AI sẽ tìm tài xế phù hợp nhất trong bán kính tuyến đường của bạn.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
    ),
  },
  {
    step: "02",
    color: "#22d3ee",
    title: "Theo dõi hành trình thực",
    desc: "Biết vị trí xe theo thời gian thực. Chia sẻ hành trình với người thân chỉ bằng một cú chạm.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    ),
  },
  {
    step: "03",
    color: "#34d399",
    title: "Thanh toán & đánh giá",
    desc: "Thanh toán qua VNPay, MoMo, PayOS hoặc ví Thuận Chuyến. Đánh giá tài xế để xây dựng cộng đồng tin cậy.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
        <line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
  },
];

/* ── Helpers ──────────────────────────────────────────────────────── */

function fmtDate(d: Date | null | undefined) {
  if (!d) return "";
  return new Intl.DateTimeFormat("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric" }).format(new Date(d));
}

function daysLeft(endsAt: Date) {
  const diff = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

/* ── Section Header ───────────────────────────────────────────────── */

function SectionHeader({ eyebrow, title, desc, ctaLabel, ctaHref }: {
  eyebrow: string; title: string; desc: string;
  ctaLabel?: string; ctaHref?: string;
}) {
  return (
    <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
      <div>
        <div style={{
          display:"inline-block", padding:"3px 10px", borderRadius:99,
          background:"rgba(99,102,241,.12)", border:"1px solid rgba(99,102,241,.25)",
          fontSize:11, fontWeight:700, color:"#6366f1", letterSpacing:0.5,
          marginBottom:10, textTransform:"uppercase",
        }}>{eyebrow}</div>
        <h2 style={{ fontSize:"clamp(20px,2.5vw,28px)", fontWeight:800, color:"#f1f5f9", marginBottom:8 }}>
          {title}
        </h2>
        <p style={{ color:"#64748b", fontSize:14, lineHeight:1.7, maxWidth:560 }}>{desc}</p>
      </div>
      {ctaLabel && ctaHref && (
        <a href={ctaHref} style={{
          display:"inline-flex", alignItems:"center", gap:6,
          padding:"8px 18px", borderRadius:10,
          border:"1px solid rgba(99,102,241,.3)",
          color:"#818cf8", fontSize:13, fontWeight:600,
          textDecoration:"none", transition:"all .2s", whiteSpace:"nowrap",
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,.1)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
        >
          {ctaLabel} →
        </a>
      )}
    </div>
  );
}

/* ── Events Section ───────────────────────────────────────────────── */

function EventsSection({ section, events }: { section: SectionConfig; events: EventSummary[] }) {
  if (events.length === 0) return null;
  return (
    <section id="events" style={{ marginBottom:72 }}>
      <SectionHeader
        eyebrow="Ưu đãi đang diễn ra"
        title={section.title}
        desc={section.subtitle}
        ctaLabel={section.ctaLabel}
        ctaHref={section.ctaHref}
      />
      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))",
        gap:16, marginTop:32,
      }}>
        {events.map((ev) => {
          const color = EVENT_TYPE_COLORS[ev.type] ?? "#6366f1";
          const left  = daysLeft(ev.endsAt);
          return (
            <div key={ev.id} style={{
              background:"rgba(15,23,42,.8)",
              border:`1px solid ${color}28`,
              borderRadius:16, overflow:"hidden", position:"relative",
              transition:"transform .2s, border-color .2s",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor=`${color}55`; (e.currentTarget as HTMLElement).style.transform="translateY(-2px)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor=`${color}28`; (e.currentTarget as HTMLElement).style.transform="translateY(0)"; }}
            >
              <div style={{ height:3, background:`linear-gradient(90deg,${color},${color}44)` }} />
              <div style={{ padding:"18px 20px" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                  <span style={{
                    padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:700,
                    background:`${color}18`, color, border:`1px solid ${color}30`,
                  }}>
                    {EVENT_TYPE_LABELS[ev.type] ?? ev.type}
                  </span>
                  {left <= 3 ? (
                    <span style={{ fontSize:11, color:"#f87171", fontWeight:600 }}>Còn {left} ngày</span>
                  ) : (
                    <span style={{ fontSize:11, color:"#475569" }}>Đến {fmtDate(ev.endsAt)}</span>
                  )}
                </div>
                <h3 style={{ color:"#f1f5f9", fontSize:15, fontWeight:700, marginBottom:8, lineHeight:1.4 }}>
                  {ev.name}
                </h3>
                <p style={{ color:"#64748b", fontSize:13, lineHeight:1.6, marginBottom:14 }}>
                  {ev.description.slice(0, 120)}{ev.description.length > 120 ? "…" : ""}
                </p>
                <a href="/login" style={{
                  display:"inline-flex", alignItems:"center", gap:6,
                  fontSize:13, fontWeight:600, color, textDecoration:"none",
                }}>
                  Tham gia ngay →
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Posts Section ────────────────────────────────────────────────── */

function PostsSection({ section, posts }: { section: SectionConfig; posts: BlogPostSummary[] }) {
  if (posts.length === 0) return null;
  return (
    <section id="posts" style={{ marginBottom:72 }}>
      <SectionHeader
        eyebrow="Kiến thức & Chia sẻ"
        title={section.title}
        desc={section.subtitle}
        ctaLabel={section.ctaLabel}
        ctaHref={section.ctaHref}
      />
      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",
        gap:20, marginTop:32,
      }}>
        {posts.map((post) => (
          <a
            key={post.id}
            href={`/blog/${post.slug}`}
            style={{
              display:"block", textDecoration:"none",
              background:"rgba(15,23,42,.7)",
              border:"1px solid rgba(99,102,241,.1)",
              borderRadius:16, overflow:"hidden",
              transition:"border-color .2s, transform .2s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor="rgba(99,102,241,.3)"; (e.currentTarget as HTMLElement).style.transform="translateY(-3px)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor="rgba(99,102,241,.1)"; (e.currentTarget as HTMLElement).style.transform="translateY(0)"; }}
          >
            {post.coverImage ? (
              <div style={{ height:160, overflow:"hidden" }}>
                <img
                  src={post.coverImage} alt={post.title}
                  style={{ width:"100%", height:"100%", objectFit:"cover",
                    transition:"transform .4s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform="scale(1.04)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform="scale(1)"; }}
                />
              </div>
            ) : (
              <div style={{
                height:120, background:"linear-gradient(135deg,rgba(99,102,241,.15),rgba(34,211,238,.08))",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(99,102,241,.4)" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
            )}
            <div style={{ padding:"16px 18px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <span style={{
                  padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700,
                  background:"rgba(99,102,241,.15)", color:"#818cf8",
                  border:"1px solid rgba(99,102,241,.2)",
                }}>
                  {CATEGORY_LABELS[post.category] ?? post.category}
                </span>
                <span style={{ fontSize:11, color:"#475569" }}>{post.readTime} phút đọc</span>
              </div>
              <h3 style={{ color:"#f1f5f9", fontSize:15, fontWeight:700, lineHeight:1.4, marginBottom:8 }}>
                {post.title}
              </h3>
              <p style={{ color:"#64748b", fontSize:13, lineHeight:1.6, marginBottom:12 }}>
                {post.summary.slice(0, 100)}{post.summary.length > 100 ? "…" : ""}
              </p>
              {post.publishedAt && (
                <span style={{ fontSize:11, color:"#334155" }}>{fmtDate(post.publishedAt)}</span>
              )}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ── How It Works Section ─────────────────────────────────────────── */

function HowItWorksSection({ section }: { section: SectionConfig }) {
  return (
    <section id="how-it-works" style={{ marginBottom:72 }}>
      <SectionHeader
        eyebrow="Đơn giản & Nhanh chóng"
        title={section.title}
        desc={section.subtitle}
      />
      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))",
        gap:20, marginTop:36,
        position:"relative",
      }}>
        {HOW_IT_WORKS_STEPS.slice(0, section.limit ?? 3).map((step, i) => (
          <div key={i} style={{ position:"relative" }}>
            {/* Connector line */}
            {i < (section.limit ?? 3) - 1 && (
              <div className="hiw-connector" style={{
                position:"absolute", top:32, left:"calc(50% + 70px)",
                width:"calc(100% - 70px)", height:1,
                background:"linear-gradient(90deg,rgba(99,102,241,.4),transparent)",
                display:"none",
              }} />
            )}
            <div style={{
              background:"rgba(15,23,42,.7)",
              border:"1px solid rgba(99,102,241,.12)",
              borderRadius:18, padding:"28px 24px",
              position:"relative", overflow:"hidden",
              transition:"border-color .2s, transform .2s",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor=`${step.color}40`; (e.currentTarget as HTMLElement).style.transform="translateY(-3px)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor="rgba(99,102,241,.12)"; (e.currentTarget as HTMLElement).style.transform="translateY(0)"; }}
            >
              {/* Background number */}
              <div style={{
                position:"absolute", top:-10, right:10, fontSize:80, fontWeight:900,
                color:`${step.color}08`, lineHeight:1, userSelect:"none",
              }}>
                {step.step}
              </div>
              <div style={{
                width:52, height:52, borderRadius:14, marginBottom:20,
                background:`${step.color}18`, border:`1px solid ${step.color}35`,
                display:"flex", alignItems:"center", justifyContent:"center",
                color:step.color,
              }}>
                {step.icon}
              </div>
              <div style={{
                display:"inline-block", padding:"2px 8px", borderRadius:99,
                background:`${step.color}15`, color:step.color,
                fontSize:10, fontWeight:800, letterSpacing:1,
                marginBottom:12,
              }}>
                BƯỚC {step.step}
              </div>
              <h3 style={{ color:"#f1f5f9", fontSize:16, fontWeight:700, marginBottom:10, lineHeight:1.4 }}>
                {step.title}
              </h3>
              <p style={{ color:"#64748b", fontSize:13, lineHeight:1.7 }}>{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <style>{`@media(min-width:900px){ .hiw-connector{display:block!important} }`}</style>
    </section>
  );
}

/* ── Footer ───────────────────────────────────────────────────────── */

function LandingFooter({ groups, copy }: { groups: FooterGroup[]; copy: string }) {
  return (
    <footer style={{
      borderTop: "1px solid rgba(99,102,241,.1)",
      padding: "48px 0 32px",
      background: "rgba(4,8,16,.6)",
    }}>
      <div style={{ maxWidth:1120, margin:"0 auto", padding:"0 24px" }}>
        <div style={{
          display:"grid",
          gridTemplateColumns:`200px repeat(${Math.min(groups.length, 4)}, 1fr)`,
          gap:40, marginBottom:48,
        }}>
          {/* Brand column */}
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <img src="/logo.png" alt="Thuận Chuyến" style={{ width:32, height:32, borderRadius:8, objectFit:"cover" }} />
              <span style={{ fontWeight:700, fontSize:15, color:"#f1f5f9" }}>Thuận Chuyến</span>
            </div>
            <p style={{ color:"#475569", fontSize:13, lineHeight:1.7 }}>
              Nền tảng ghép xe thế hệ mới. Kết nối tài xế &amp; hành khách thông minh bằng AI.
            </p>
          </div>
          {/* Link groups */}
          {groups.map((group) => (
            <div key={group.id}>
              <div style={{ color:"#94a3b8", fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:16 }}>
                {group.label}
              </div>
              <ul style={{ listStyle:"none", padding:0, margin:0, display:"flex", flexDirection:"column", gap:10 }}>
                {group.links.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener" : undefined}
                      style={{ color:"#475569", fontSize:13, textDecoration:"none", transition:"color .15s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#475569"; }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {/* Bottom bar */}
        <div style={{
          borderTop:"1px solid rgba(255,255,255,.06)",
          paddingTop:24,
          display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12,
        }}>
          <span style={{ color:"#334155", fontSize:12 }}>{copy}</span>
          <div style={{ display:"flex", gap:16 }}>
            {[
              { label:"Điều khoản", href:"/terms" },
              { label:"Bảo mật",    href:"/privacy" },
            ].map((l) => (
              <a key={l.href} href={l.href}
                style={{ color:"#334155", fontSize:12, textDecoration:"none", transition:"color .15s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#64748b"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#334155"; }}>
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── BelowFold (entry point) ─────────────────────────────────────── */

interface Props {
  sections: SectionConfig[];
  posts: BlogPostSummary[];
  events: EventSummary[];
  footerGroups: FooterGroup[];
  footerCopy: string;
}

export default function BelowFold({ sections, posts, events, footerGroups, footerCopy }: Props) {
  return (
    <div style={{ background:"#080e1a", position:"relative", zIndex:5 }}>
      {sections.length > 0 && (
        <div style={{ maxWidth:1120, margin:"0 auto", padding:"72px 24px 0" }}>
          {sections.map((section) => {
            if (section.type === "events")       return <EventsSection      key={section.id} section={section} events={events} />;
            if (section.type === "posts")        return <PostsSection       key={section.id} section={section} posts={posts} />;
            if (section.type === "how_it_works") return <HowItWorksSection  key={section.id} section={section} />;
            return null;
          })}
        </div>
      )}
      <LandingFooter groups={footerGroups} copy={footerCopy} />
    </div>
  );
}
