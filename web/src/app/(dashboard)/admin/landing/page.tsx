"use client";
import { useEffect, useState, useCallback } from "react";
import type {
  LandingConfigData, NavItem, HeroFeature, SectionConfig,
  FooterGroup, FooterLink, GeoType, SectionType,
} from "@/types/landing";
import { DEFAULT_LANDING_CONFIG } from "@/lib/landing/defaults";

/* ── nanoid lite (no dep) ─────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 10);

/* ── Constants ────────────────────────────────────────────────────── */

const GEO_OPTIONS: { value: GeoType; label: string }[] = [
  { value:"ai",           label:"AI / Lộ trình" },
  { value:"payment",      label:"Thanh toán"    },
  { value:"realtime",     label:"Thời gian thực"},
  { value:"notification", label:"Thông báo"     },
];

const SECTION_TYPE_META: Record<SectionType, { label: string; icon: string; desc: string }> = {
  events:       { label:"Ưu đãi / Chiến dịch", icon:"🎁", desc:"Hiển thị các PromotionEvent đang ACTIVE từ DB" },
  posts:        { label:"Bài viết / Blog",      icon:"📝", desc:"Hiển thị các BlogPost đã PUBLISHED từ DB"      },
  how_it_works: { label:"Cách hoạt động",       icon:"🗺️", desc:"3 bước sử dụng dịch vụ — nội dung cố định"    },
  stats:        { label:"Số liệu nổi bật",      icon:"📊", desc:"Thống kê tài xế, chuyến xe (sắp ra mắt)"      },
};

/* ── Tab types ────────────────────────────────────────────────────── */

type EditorTab = "nav" | "hero" | "sections" | "footer";

const TABS: { id: EditorTab; label: string; icon: string }[] = [
  { id:"nav",      label:"Điều hướng", icon:"🗂️" },
  { id:"hero",     label:"Hero",       icon:"🌟" },
  { id:"sections", label:"Sections",   icon:"📐" },
  { id:"footer",   label:"Footer",     icon:"🔗" },
];

/* ── Shared primitives ────────────────────────────────────────────── */

function Field({ label, children, hint }: {
  label: string; children: React.ReactNode; hint?: string;
}) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", color:"var(--text-secondary)", fontSize:12, fontWeight:600,
        letterSpacing:.3, marginBottom:6 }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ color:"var(--text-muted)", fontSize:11, marginTop:4 }}>{hint}</div>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, rows }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number;
}) {
  const style: React.CSSProperties = {
    width:"100%",padding:"9px 12px",
    background:"var(--bg-overlay)",
    border:"1px solid var(--border-subtle)",
    borderRadius:8,color:"var(--text-primary)",fontSize:13,outline:"none",
    transition:"border-color .15s",boxSizing:"border-box",
    resize: rows ? "vertical" : "none",
    fontFamily:"inherit",
  };
  if (rows) {
    return (
      <textarea
        value={value} rows={rows} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={style}
        onFocus={(e) => { e.target.style.borderColor = "#6366f1"; }}
        onBlur={(e)  => { e.target.style.borderColor = "var(--border-subtle)"; }}
      />
    );
  }
  return (
    <input
      type="text" value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={style}
      onFocus={(e) => { e.target.style.borderColor = "#6366f1"; }}
      onBlur={(e)  => { e.target.style.borderColor = "var(--border-subtle)"; }}
    />
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <button
        type="button" onClick={() => onChange(!value)}
        style={{
          width:38, height:22, borderRadius:99, border:"none", cursor:"pointer",
          background: value ? "#6366f1" : "var(--border-subtle)",
          position:"relative", transition:"background .2s", flexShrink:0,
        }}
      >
        <span style={{
          position:"absolute", top:3, left: value ? 19 : 3,
          width:16, height:16, borderRadius:"50%",
          background:"#fff", transition:"left .2s",
        }} />
      </button>
      {label && <span style={{ fontSize:13, color: value ? "var(--text-primary)" : "var(--text-muted)" }}>{label}</span>}
    </div>
  );
}

function MoveBtn({ dir, onClick, disabled }: {
  dir: "up" | "down"; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      style={{
        width:26, height:26, borderRadius:6, border:"1px solid var(--border-subtle)",
        background:"var(--bg-overlay)", cursor:disabled?"not-allowed":"pointer",
        display:"flex", alignItems:"center", justifyContent:"center",
        color: disabled ? "var(--text-muted)" : "var(--text-secondary)",
        opacity: disabled ? .4 : 1, transition:"all .15s",
      }}
    >
      {dir === "up"
        ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg>
        : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>}
    </button>
  );
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        width:26, height:26, borderRadius:6, border:"1px solid rgba(239,68,68,.25)",
        background:"rgba(239,68,68,.08)", cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center",
        color:"#f87171", transition:"all .15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background="rgba(239,68,68,.15)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background="rgba(239,68,68,.08)"; }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
        <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
      </svg>
    </button>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background:"var(--bg-surface)", border:"1px solid var(--border-subtle)",
      borderRadius:14, padding:"20px 24px", ...style,
    }}>
      {children}
    </div>
  );
}

/* ── Nav editor ───────────────────────────────────────────────────── */

function NavEditor({ config, onChange }: {
  config: LandingConfigData;
  onChange: (patch: Partial<LandingConfigData>) => void;
}) {
  const items = config.navItems;

  const update = (id: string, patch: Partial<NavItem>) =>
    onChange({ navItems: items.map((x) => x.id === id ? { ...x, ...patch } : x) });

  const move = (id: string, dir: -1 | 1) => {
    const idx  = items.findIndex((x) => x.id === id);
    const next = [...items];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange({ navItems: next.map((x, i) => ({ ...x, order: i + 1 })) });
  };

  const remove = (id: string) => onChange({ navItems: items.filter((x) => x.id !== id) });

  const add = () => onChange({
    navItems: [...items, {
      id: uid(), label:"Liên kết mới", href:"#", external:false,
      visible:true, order: items.length + 1,
    }],
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <Card>
        <Field label="Tên thương hiệu (navbar)">
          <TextInput value={config.navBrand} onChange={(v) => onChange({ navBrand: v })} placeholder="Thuận Chuyến"/>
        </Field>
      </Card>

      <Card>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:"var(--text-primary)" }}>Menu điều hướng</div>
            <div style={{ color:"var(--text-muted)", fontSize:12, marginTop:2 }}>Các liên kết hiển thị trên thanh nav</div>
          </div>
          <button
            type="button" onClick={add}
            style={{
              padding:"6px 14px", borderRadius:8,
              background:"rgba(99,102,241,.15)", border:"1px solid rgba(99,102,241,.3)",
              color:"#818cf8", fontSize:12, fontWeight:600, cursor:"pointer",
            }}
          >
            + Thêm
          </button>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {items.sort((a,b)=>a.order-b.order).map((item, i) => (
            <div key={item.id} style={{
              display:"grid",
              gridTemplateColumns:"26px 1fr 1fr 80px 80px auto",
              gap:8, alignItems:"center",
              padding:"10px 12px", borderRadius:10,
              background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)",
            }}>
              {/* Visible toggle */}
              <Toggle value={item.visible} onChange={(v) => update(item.id, { visible: v })} />
              {/* Label */}
              <TextInput value={item.label} onChange={(v) => update(item.id, { label: v })} placeholder="Label" />
              {/* Href */}
              <TextInput value={item.href} onChange={(v) => update(item.id, { href: v })} placeholder="href hoặc #anchor" />
              {/* Badge */}
              <TextInput value={item.badge ?? ""} onChange={(v) => update(item.id, { badge: v || undefined })} placeholder="Badge?" />
              {/* External */}
              <Toggle value={item.external} onChange={(v) => update(item.id, { external: v })} label="Ngoài" />
              {/* Actions */}
              <div style={{ display:"flex", gap:4 }}>
                <MoveBtn dir="up"   onClick={() => move(item.id, -1)} disabled={i === 0} />
                <MoveBtn dir="down" onClick={() => move(item.id,  1)} disabled={i === items.length - 1} />
                <DeleteBtn onClick={() => remove(item.id)} />
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div style={{ textAlign:"center", color:"var(--text-muted)", fontSize:13, padding:"24px 0" }}>
              Chưa có liên kết nào. Nhấn &quot;+ Thêm&quot; để bắt đầu.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ── Hero editor ──────────────────────────────────────────────────── */

function HeroEditor({ config, onChange }: {
  config: LandingConfigData;
  onChange: (patch: Partial<LandingConfigData>) => void;
}) {
  const features = [...config.heroFeatures].sort((a,b)=>a.order-b.order);

  const updateFeature = (id: string, patch: Partial<HeroFeature>) =>
    onChange({ heroFeatures: config.heroFeatures.map((f) => f.id === id ? { ...f, ...patch } : f) });

  const moveFeature = (id: string, dir: -1 | 1) => {
    const idx  = features.findIndex((f) => f.id === id);
    const next = [...features];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange({ heroFeatures: next.map((f, i) => ({ ...f, order: i + 1 })) });
  };

  const addFeature = () => onChange({
    heroFeatures: [...config.heroFeatures, {
      id:uid(), geoType:"ai" as GeoType, title:"Tính năng mới", desc:"Mô tả ngắn gọn",
      visible:true, order: config.heroFeatures.length + 1,
    }],
  });

  const removeFeature = (id: string) =>
    onChange({ heroFeatures: config.heroFeatures.filter((f) => f.id !== id) });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Text content */}
      <Card>
        <div style={{ fontWeight:700, fontSize:14, color:"var(--text-primary)", marginBottom:16 }}>Nội dung Hero</div>
        <Field label="Badge (dòng nhỏ đầu trang)">
          <TextInput value={config.heroBadge} onChange={(v) => onChange({ heroBadge: v })} placeholder="Thuận đường · Thuận chuyến"/>
        </Field>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Field label="Tiêu đề chính">
            <TextInput value={config.heroTitle} onChange={(v) => onChange({ heroTitle: v })} placeholder="Mỗi cuốc xe —"/>
          </Field>
          <Field label="Tiêu đề highlight (màu gradient)">
            <TextInput value={config.heroHighlight} onChange={(v) => onChange({ heroHighlight: v })} placeholder="một câu chuyện người"/>
          </Field>
        </div>
        <Field label="Mô tả phụ (xuống dòng = \\n)" hint="Dòng thứ 2 trở đi sẽ hiển thị màu sáng hơn">
          <TextInput value={config.heroSubtitle} onChange={(v) => onChange({ heroSubtitle: v })} rows={3}
            placeholder="Tài xế không còn trống xe về..."/>
        </Field>
      </Card>

      {/* Social proof */}
      <Card>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:14, color:"var(--text-primary)" }}>Social Proof</div>
          <Toggle value={config.socialVisible} onChange={(v) => onChange({ socialVisible: v })} label="Hiển thị"/>
        </div>
        {config.socialVisible && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Tiêu đề">
              <TextInput value={config.socialTitle} onChange={(v) => onChange({ socialTitle: v })}/>
            </Field>
            <Field label="Dòng phụ">
              <TextInput value={config.socialSub} onChange={(v) => onChange({ socialSub: v })}/>
            </Field>
          </div>
        )}
      </Card>

      {/* Feature list */}
      <Card>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:"var(--text-primary)" }}>Danh sách tính năng</div>
            <div style={{ color:"var(--text-muted)", fontSize:12, marginTop:2 }}>Hiển thị dọc bên trái hero panel (desktop)</div>
          </div>
          <button
            type="button" onClick={addFeature}
            style={{
              padding:"6px 14px", borderRadius:8,
              background:"rgba(99,102,241,.15)", border:"1px solid rgba(99,102,241,.3)",
              color:"#818cf8", fontSize:12, fontWeight:600, cursor:"pointer",
            }}
          >
            + Thêm
          </button>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {features.map((f, i) => (
            <div key={f.id} style={{
              padding:"14px 16px", borderRadius:12,
              background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)",
              display:"flex", flexDirection:"column", gap:10,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Toggle value={f.visible} onChange={(v) => updateFeature(f.id, { visible: v })} />
                <select
                  value={f.geoType}
                  onChange={(e) => updateFeature(f.id, { geoType: e.target.value as GeoType })}
                  style={{
                    padding:"6px 10px", borderRadius:7, fontSize:12,
                    background:"var(--bg-surface)", border:"1px solid var(--border-subtle)",
                    color:"var(--text-primary)", cursor:"pointer",
                  }}
                >
                  {GEO_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
                <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
                  <MoveBtn dir="up"   onClick={() => moveFeature(f.id, -1)} disabled={i === 0} />
                  <MoveBtn dir="down" onClick={() => moveFeature(f.id,  1)} disabled={i === features.length - 1} />
                  <DeleteBtn onClick={() => removeFeature(f.id)} />
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:10 }}>
                <TextInput value={f.title} onChange={(v) => updateFeature(f.id, { title: v })} placeholder="Tiêu đề"/>
                <TextInput value={f.desc}  onChange={(v) => updateFeature(f.id, { desc:  v })} placeholder="Mô tả ngắn"/>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ── Sections editor ──────────────────────────────────────────────── */

function SectionsEditor({ config, onChange }: {
  config: LandingConfigData;
  onChange: (patch: Partial<LandingConfigData>) => void;
}) {
  const sections = [...config.sections].sort((a,b) => a.order - b.order);
  const [expanded, setExpanded] = useState<string | null>(null);

  const update = (id: string, patch: Partial<SectionConfig>) =>
    onChange({ sections: config.sections.map((s) => s.id === id ? { ...s, ...patch } : s) });

  const move = (id: string, dir: -1 | 1) => {
    const idx  = sections.findIndex((s) => s.id === id);
    const next = [...sections];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange({ sections: next.map((s, i) => ({ ...s, order: i + 1 })) });
  };

  const remove = (id: string) => onChange({ sections: config.sections.filter((s) => s.id !== id) });

  const addSection = (type: SectionType) => {
    const meta = SECTION_TYPE_META[type];
    onChange({
      sections: [...config.sections, {
        id: uid(), type, visible:true, order: config.sections.length + 1,
        title: meta.label, subtitle: "Mô tả ngắn cho section này",
        limit: type === "events" ? 4 : type === "posts" ? 6 : 3,
        ctaLabel: type === "how_it_works" ? undefined : "Xem thêm",
        ctaHref:  type === "how_it_works" ? undefined : "#",
      }],
    });
  };

  const usedTypes = new Set(sections.map((s) => s.type));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Existing sections */}
      {sections.map((section, i) => {
        const meta = SECTION_TYPE_META[section.type];
        const isExpanded = expanded === section.id;
        return (
          <Card key={section.id} style={{ padding:0, overflow:"hidden" }}>
            {/* Header row */}
            <div
              style={{
                display:"flex", alignItems:"center", gap:12,
                padding:"14px 18px", cursor:"pointer",
                borderBottom: isExpanded ? "1px solid var(--border-subtle)" : "none",
              }}
              onClick={() => setExpanded(isExpanded ? null : section.id)}
            >
              <span style={{ fontSize:20 }}>{meta.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontWeight:700, fontSize:13, color:"var(--text-primary)" }}>{meta.label}</span>
                  {!section.visible && (
                    <span style={{
                      fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:99,
                      background:"rgba(239,68,68,.1)", color:"#f87171",
                      border:"1px solid rgba(239,68,68,.2)",
                    }}>Ẩn</span>
                  )}
                </div>
                <div style={{ color:"var(--text-muted)", fontSize:11, marginTop:1 }}>{section.title}</div>
              </div>
              <div onClick={(e) => e.stopPropagation()} style={{ display:"flex", gap:6, alignItems:"center" }}>
                <Toggle value={section.visible} onChange={(v) => update(section.id, { visible: v })} />
                <MoveBtn dir="up"   onClick={() => move(section.id, -1)} disabled={i === 0} />
                <MoveBtn dir="down" onClick={() => move(section.id,  1)} disabled={i === sections.length - 1} />
                <DeleteBtn onClick={() => remove(section.id)} />
              </div>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="var(--text-muted)" strokeWidth="2.5"
                style={{ transition:"transform .2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}
              >
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>

            {/* Expanded config */}
            {isExpanded && (
              <div style={{ padding:"18px 18px 20px", display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{
                  padding:"8px 12px", borderRadius:8,
                  background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.15)",
                  color:"#94a3b8", fontSize:12,
                }}>
                  ℹ️ {meta.desc}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <Field label="Tiêu đề section">
                    <TextInput value={section.title} onChange={(v) => update(section.id, { title: v })}/>
                  </Field>
                  <Field label="Dòng phụ (subtitle)">
                    <TextInput value={section.subtitle} onChange={(v) => update(section.id, { subtitle: v })}/>
                  </Field>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 1fr", gap:12 }}>
                  <Field label="Số lượng hiển thị">
                    <input
                      type="number" min={1} max={20} value={section.limit ?? 4}
                      onChange={(e) => update(section.id, { limit: Number(e.target.value) })}
                      style={{
                        width:"100%", padding:"9px 12px",
                        background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)",
                        borderRadius:8, color:"var(--text-primary)", fontSize:13, outline:"none",
                      }}
                    />
                  </Field>
                  {section.type !== "how_it_works" && (
                    <>
                      <Field label="CTA label">
                        <TextInput value={section.ctaLabel ?? ""} onChange={(v) => update(section.id, { ctaLabel: v || undefined })} placeholder="Xem thêm"/>
                      </Field>
                      <Field label="CTA href">
                        <TextInput value={section.ctaHref ?? ""} onChange={(v) => update(section.id, { ctaHref: v || undefined })} placeholder="/blog"/>
                      </Field>
                    </>
                  )}
                </div>
              </div>
            )}
          </Card>
        );
      })}

      {/* Add section */}
      <Card>
        <div style={{ fontWeight:700, fontSize:13, color:"var(--text-primary)", marginBottom:12 }}>Thêm section mới</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {(Object.keys(SECTION_TYPE_META) as SectionType[]).map((type) => {
            const meta = SECTION_TYPE_META[type];
            const used = usedTypes.has(type);
            return (
              <button
                key={type} type="button"
                onClick={() => !used && addSection(type)}
                disabled={used}
                style={{
                  padding:"8px 14px", borderRadius:10, cursor: used ? "not-allowed" : "pointer",
                  background: used ? "var(--bg-overlay)" : "rgba(99,102,241,.1)",
                  border:`1px solid ${used ? "var(--border-subtle)" : "rgba(99,102,241,.3)"}`,
                  color: used ? "var(--text-muted)" : "#818cf8",
                  fontSize:12, fontWeight:600, opacity: used ? .5 : 1,
                  display:"flex", alignItems:"center", gap:6,
                }}
              >
                <span>{meta.icon}</span>
                {meta.label}
                {used && <span style={{ fontSize:10 }}>(đã có)</span>}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ── Footer editor ────────────────────────────────────────────────── */

function FooterEditor({ config, onChange }: {
  config: LandingConfigData;
  onChange: (patch: Partial<LandingConfigData>) => void;
}) {
  const groups = config.footerGroups;

  const updateGroup = (id: string, patch: Partial<FooterGroup>) =>
    onChange({ footerGroups: groups.map((g) => g.id === id ? { ...g, ...patch } : g) });

  const removeGroup = (id: string) =>
    onChange({ footerGroups: groups.filter((g) => g.id !== id) });

  const addGroup = () => onChange({
    footerGroups: [...groups, { id:uid(), label:"Nhóm mới", links:[] }],
  });

  const updateLink = (gid: string, lid: string, patch: Partial<FooterLink>) =>
    onChange({
      footerGroups: groups.map((g) =>
        g.id === gid
          ? { ...g, links: g.links.map((l) => l.id === lid ? { ...l, ...patch } : l) }
          : g
      ),
    });

  const removeLink = (gid: string, lid: string) =>
    onChange({
      footerGroups: groups.map((g) =>
        g.id === gid ? { ...g, links: g.links.filter((l) => l.id !== lid) } : g
      ),
    });

  const addLink = (gid: string) =>
    onChange({
      footerGroups: groups.map((g) =>
        g.id === gid
          ? { ...g, links: [...g.links, { id:uid(), label:"Liên kết", href:"#", external:false }] }
          : g
      ),
    });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <Card>
        <Field label="Dòng bản quyền (copyright)">
          <TextInput value={config.footerCopy} onChange={(v) => onChange({ footerCopy: v })}
            placeholder="© 2025 Thuận Chuyến..."/>
        </Field>
      </Card>

      {groups.map((group) => (
        <Card key={group.id}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <TextInput value={group.label} onChange={(v) => updateGroup(group.id, { label: v })} placeholder="Tên nhóm"/>
            <button
              type="button" onClick={() => addLink(group.id)}
              style={{
                padding:"7px 12px", borderRadius:8, whiteSpace:"nowrap",
                background:"rgba(99,102,241,.12)", border:"1px solid rgba(99,102,241,.25)",
                color:"#818cf8", fontSize:12, fontWeight:600, cursor:"pointer",
              }}
            >+ Link</button>
            <DeleteBtn onClick={() => removeGroup(group.id)} />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {group.links.map((link) => (
              <div key={link.id} style={{
                display:"grid", gridTemplateColumns:"1fr 1fr 80px auto",
                gap:8, alignItems:"center",
                padding:"8px 10px", borderRadius:8,
                background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)",
              }}>
                <TextInput value={link.label} onChange={(v) => updateLink(group.id, link.id, { label: v })} placeholder="Label"/>
                <TextInput value={link.href}  onChange={(v) => updateLink(group.id, link.id, { href: v })}  placeholder="href"/>
                <Toggle value={link.external ?? false} onChange={(v) => updateLink(group.id, link.id, { external: v })} label="Ngoài"/>
                <DeleteBtn onClick={() => removeLink(group.id, link.id)} />
              </div>
            ))}
            {group.links.length === 0 && (
              <div style={{ color:"var(--text-muted)", fontSize:12, textAlign:"center", padding:"8px 0" }}>
                Chưa có liên kết
              </div>
            )}
          </div>
        </Card>
      ))}

      <button
        type="button" onClick={addGroup}
        style={{
          padding:"10px", borderRadius:10, cursor:"pointer",
          background:"rgba(99,102,241,.08)", border:"1px dashed rgba(99,102,241,.3)",
          color:"#818cf8", fontSize:13, fontWeight:600,
          display:"flex", alignItems:"center", justifyContent:"center", gap:6,
        }}
      >
        + Thêm nhóm footer
      </button>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────── */

export default function LandingAdminPage() {
  const [config,    setConfig]    = useState<LandingConfigData | null>(null);
  const [original,  setOriginal]  = useState<string>("");
  const [activeTab, setActiveTab] = useState<EditorTab>("nav");
  const [saving,    setSaving]    = useState(false);
  const [savedAt,   setSavedAt]   = useState<Date | null>(null);
  const [error,     setError]     = useState<string | null>(null);

  const isDirty = config ? JSON.stringify(config) !== original : false;

  /* Load */
  useEffect(() => {
    fetch("/api/v1/admin/landing-config")
      .then((r) => r.json())
      .then((d) => {
        const cfg = d.data?.config ?? DEFAULT_LANDING_CONFIG;
        setConfig(cfg);
        setOriginal(JSON.stringify(cfg));
      })
      .catch(() => {
        setConfig(DEFAULT_LANDING_CONFIG);
        setOriginal(JSON.stringify(DEFAULT_LANDING_CONFIG));
      });
  }, []);

  const handleChange = useCallback((patch: Partial<LandingConfigData>) => {
    setConfig((prev) => prev ? { ...prev, ...patch } : prev);
    setError(null);
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true); setError(null);
    try {
      const res  = await fetch("/api/v1/admin/landing-config", {
        method:"PUT", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Lỗi khi lưu");
      setOriginal(JSON.stringify(config));
      setSavedAt(new Date());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    if (!confirm("Reset về mặc định? Mọi thay đổi chưa lưu sẽ mất.")) return;
    setConfig(DEFAULT_LANDING_CONFIG);
  };

  if (!config) return (
    <div style={{ display:"flex", justifyContent:"center", paddingTop:80 }}>
      <div style={{
        width:36, height:36, borderRadius:"50%",
        border:"3px solid rgba(99,102,241,.2)", borderTopColor:"#6366f1",
        animation:"spin .8s linear infinite",
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div>
      {/* ── Page header ────────────────────────────────── */}
      <div style={{
        display:"flex", alignItems:"flex-start", justifyContent:"space-between",
        flexWrap:"wrap", gap:12, marginBottom:28,
      }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:"var(--text-primary)", marginBottom:4 }}>
            🌐 Cấu hình Trang chủ
          </h1>
          <p style={{ color:"var(--text-muted)", fontSize:13 }}>
            Quản lý nội dung, menu, sections và footer — không cần code, lưu là cập nhật ngay.
          </p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {savedAt && !isDirty && (
            <span style={{ fontSize:12, color:"#4ade80" }}>
              ✓ Đã lưu lúc {savedAt.toLocaleTimeString("vi-VN")}
            </span>
          )}
          {isDirty && (
            <span style={{
              fontSize:11, padding:"3px 10px", borderRadius:99,
              background:"rgba(251,191,36,.12)", border:"1px solid rgba(251,191,36,.25)",
              color:"#fbbf24", fontWeight:600,
            }}>
              Chưa lưu
            </span>
          )}
          <button
            type="button" onClick={reset}
            style={{
              padding:"7px 14px", borderRadius:8, cursor:"pointer",
              background:"var(--bg-overlay)", border:"1px solid var(--border-subtle)",
              color:"var(--text-muted)", fontSize:12,
            }}
          >
            Reset mặc định
          </button>
          <a
            href="/login" target="_blank" rel="noopener"
            style={{
              padding:"7px 14px", borderRadius:8,
              background:"rgba(99,102,241,.12)", border:"1px solid rgba(99,102,241,.25)",
              color:"#818cf8", fontSize:12, fontWeight:600, textDecoration:"none",
              display:"flex", alignItems:"center", gap:5,
            }}
          >
            👁️ Xem trước
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
            </svg>
          </a>
          <button
            type="button" onClick={save} disabled={saving || !isDirty}
            style={{
              padding:"8px 20px", borderRadius:10,
              background: (saving || !isDirty) ? "var(--bg-overlay)" : "linear-gradient(135deg,#6366f1,#4f46e5)",
              border:"none", color: (saving || !isDirty) ? "var(--text-muted)" : "#fff",
              fontSize:13, fontWeight:600, cursor: (saving || !isDirty) ? "not-allowed" : "pointer",
              opacity: !isDirty && !saving ? .5 : 1,
              boxShadow: isDirty ? "0 4px 16px rgba(99,102,241,.4)" : "none",
              transition:"all .2s",
            }}
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding:"12px 16px", borderRadius:10, marginBottom:20,
          background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.22)",
          color:"#f87171", fontSize:13,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Tab bar ────────────────────────────────────── */}
      <div style={{
        display:"flex", gap:2, background:"var(--bg-surface)",
        border:"1px solid var(--border-subtle)",
        borderRadius:12, padding:4, marginBottom:24, width:"fit-content",
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id} type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding:"8px 20px", borderRadius:9, border:"none", cursor:"pointer",
              background: activeTab === tab.id ? "rgba(99,102,241,.2)" : "transparent",
              color: activeTab === tab.id ? "#818cf8" : "var(--text-muted)",
              fontSize:13, fontWeight: activeTab === tab.id ? 700 : 400,
              display:"flex", alignItems:"center", gap:6,
              transition:"all .15s",
            }}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* ── Editor panes ───────────────────────────────── */}
      {activeTab === "nav"      && <NavEditor      config={config} onChange={handleChange} />}
      {activeTab === "hero"     && <HeroEditor     config={config} onChange={handleChange} />}
      {activeTab === "sections" && <SectionsEditor config={config} onChange={handleChange} />}
      {activeTab === "footer"   && <FooterEditor   config={config} onChange={handleChange} />}
    </div>
  );
}
