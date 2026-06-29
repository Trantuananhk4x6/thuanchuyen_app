"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import {
  BackhaulIcon, MapPinIcon, ClockIcon, SeatIcon, CoinIcon,
  FireIcon, ReturnRouteIcon, CheckCircleIcon, AlertTriangleIcon, CarIcon,
} from "@/components/ui/Icons";
import dynamic from "next/dynamic";

const GeoIcon = dynamic(() => import("@/components/ui/GeoIcon"), { ssr: false });

interface BackhaulOpp {
  requestId: string;
  customerName: string;
  pickupAddress: string;
  dropoffAddress: string;
  seats: number;
  quotedPrice: number;
  departureTime: string;
  distanceFromDriverKm: number;
  directionScore: number;
}

interface Streak {
  currentStreak: number;
  longestStreak: number;
  bonusEarnedTotal: number;
}

export default function DriverBackhaulPage() {
  const [tripId, setTripId]           = useState("");
  const [opps,   setOpps]             = useState<BackhaulOpp[]>([]);
  const [streak, setStreak]           = useState<Streak | null>(null);
  const [loading, setLoading]         = useState(false);
  const [accepting, setAccepting]     = useState<string | null>(null);
  const [accepted, setAccepted]       = useState<string | null>(null);
  const [error,   setError]           = useState("");
  const [searched, setSearched]       = useState(false);

  /* ── Load streak on mount ─────────────────────────────────────── */
  useEffect(() => {
    api.get<{ streak: Streak }>("/driver/streak")
      .then((r) => setStreak(r.data.streak))
      .catch(() => {});
  }, []);

  const search = async () => {
    if (!tripId.trim()) { setError("Nhập mã chuyến vừa hoàn thành"); return; }
    setLoading(true); setError(""); setSearched(false);
    try {
      const r = await api.get<{ opportunities: BackhaulOpp[] }>(
        `/driver/backhaul?tripId=${tripId.trim()}`
      );
      setOpps(r.data.opportunities);
      setSearched(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const accept = async (requestId: string) => {
    setAccepting(requestId); setError("");
    try {
      await api.post("/driver/backhaul", { requestId });
      setAccepted(requestId);
      setOpps((prev) => prev.filter((o) => o.requestId !== requestId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAccepting(null);
    }
  };

  const scoreColor = (s: number) =>
    s >= 0.7 ? "#34d399" : s >= 0.4 ? "#fbbf24" : "#94a3b8";

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px" }}>

      {/* ── Streak card ─────────────────────────────────────────── */}
      {streak && (
        <div style={{
          borderRadius: 18,
          background: "linear-gradient(135deg,rgba(251,191,36,.12),rgba(249,115,22,.08))",
          border: "1px solid rgba(251,191,36,.25)",
          padding: "18px 20px", marginBottom: 24,
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{ flexShrink: 0 }}>
            <GeoIcon type="backhaul" size={52}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>
              Chuỗi chuyến liên tiếp
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: "#fbbf24", lineHeight: 1 }}>
                {streak.currentStreak}
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>ngày</span>
              {streak.currentStreak > 0 && (
                <FireIcon size={18} color="#f97316" style={{ marginLeft: 4 }}/>
              )}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              Kỷ lục: {streak.longestStreak} ngày ·{" "}
              Thưởng tích lũy: {streak.bonusEarnedTotal.toLocaleString("vi-VN")}đ
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Thưởng hôm nay</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#34d399" }}>
              +{Math.min(streak.currentStreak * 5000, 50000).toLocaleString("vi-VN")}đ
            </div>
          </div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{
          fontSize: 22, fontWeight: 800, color: "var(--text-primary)",
          display: "flex", alignItems: "center", gap: 10, marginBottom: 6,
        }}>
          <BackhaulIcon size={24} color="#6366f1"/>
          Chiều quay đầu
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6 }}>
          Nhập mã chuyến vừa hoàn thành để tìm hành khách ghép trên đường về.
          Chiều quay đầu giúp tăng thu nhập với chi phí cận biên gần bằng 0.
        </p>
      </div>

      {/* ── Search form ─────────────────────────────────────────── */}
      <div style={{
        background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
        borderRadius: 16, padding: 20, marginBottom: 24,
      }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: .5, display: "block", marginBottom: 8 }}>
          Mã chuyến vừa hoàn thành
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={tripId}
            onChange={(e) => setTripId(e.target.value)}
            placeholder="clxxxxxxxxxxxxxxxx"
            style={{
              flex: 1, padding: "10px 14px",
              background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
              borderRadius: 10, color: "var(--text-primary)", fontSize: 13, outline: "none",
              fontFamily: "monospace",
            }}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <button
            onClick={search}
            disabled={loading}
            style={{
              padding: "10px 20px", background: "var(--grad-primary)",
              border: "none", borderRadius: 10, cursor: loading ? "wait" : "pointer",
              color: "#fff", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap",
              opacity: loading ? .7 : 1,
            }}
          >
            {loading ? (
              <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:14, height:14, border:"2px solid rgba(255,255,255,.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin .7s linear infinite", display:"inline-block" }}/>
                Đang tìm...
              </span>
            ) : (
              <span style={{display:"flex",alignItems:"center",gap:6}}>
                <ReturnRouteIcon size={14}/> Tìm chiều về
              </span>
            )}
          </button>
        </div>

        {error && (
          <div style={{
            marginTop: 10, display: "flex", alignItems: "center", gap: 8,
            padding: "8px 12px", borderRadius: 8, fontSize: 12,
            background: "var(--danger-bg)", border: "1px solid var(--danger-border)",
            color: "var(--danger)",
          }}>
            <AlertTriangleIcon size={13} style={{ flexShrink: 0 }}/> {error}
          </div>
        )}
      </div>

      {/* ── Accepted notice ─────────────────────────────────────── */}
      {accepted && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px", borderRadius: 12, marginBottom: 16,
          background: "rgba(52,211,153,.1)", border: "1px solid rgba(52,211,153,.3)",
          color: "#34d399", fontSize: 13, fontWeight: 600,
        }}>
          <CheckCircleIcon size={16}/> Đã nhận chuyến chiều về thành công!
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────────── */}
      {searched && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>
              {opps.length > 0 ? `${opps.length} chuyến chiều về phù hợp` : "Không có chuyến nào phù hợp"}
            </span>
          </div>

          {opps.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "40px 20px",
              background: "var(--bg-overlay)", borderRadius: 16,
              border: "1px dashed var(--border-subtle)",
            }}>
              <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}>
                <GeoIcon type="backhaul" size={64}/>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                Hiện chưa có hành khách chiều về trong vòng 3h tới.
                <br/>Kiểm tra lại sau hoặc mở rộng bán kính tìm kiếm.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {opps.map((opp) => (
                <div key={opp.requestId} style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 16, padding: 18,
                  transition: "border-color .2s, box-shadow .2s",
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--brand-primary)";
                    e.currentTarget.style.boxShadow = "var(--glow-sm)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* Top row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: "var(--grad-primary)", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "var(--glow-sm)",
                      }}>
                        <CarIcon size={20} color="#fff"/>
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                          {opp.customerName}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                          {opp.seats} ghế · {new Date(opp.departureTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#34d399" }}>
                        {opp.quotedPrice.toLocaleString("vi-VN")}đ
                      </div>
                      <div style={{
                        fontSize: 11, fontWeight: 600,
                        color: scoreColor(opp.directionScore),
                        marginTop: 2,
                      }}>
                        {Math.round(opp.directionScore * 100)}% thuận chiều
                      </div>
                    </div>
                  </div>

                  {/* Route */}
                  <div style={{
                    background: "var(--bg-overlay)", borderRadius: 10, padding: "10px 12px",
                    marginBottom: 12, fontSize: 12, color: "var(--text-secondary)",
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                      <MapPinIcon size={13} color="#22d3ee" style={{ marginTop: 1, flexShrink: 0 }}/>
                      <span>{opp.pickupAddress}</span>
                    </div>
                    <div style={{ width: 1, height: 10, background: "var(--border-medium)", margin: "0 6px" }}/>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <MapPinIcon size={13} color="#f472b6" style={{ marginTop: 1, flexShrink: 0 }}/>
                      <span>{opp.dropoffAddress}</span>
                    </div>
                  </div>

                  {/* Chips */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                    <Chip>
                      <SeatIcon size={11} color="#6366f1"/> {opp.seats} ghế
                    </Chip>
                    <Chip>
                      <MapPinIcon size={11} color="#22d3ee"/> {opp.distanceFromDriverKm.toFixed(1)} km tới điểm đón
                    </Chip>
                    <Chip>
                      <ClockIcon size={11} color="#fbbf24"/> {new Date(opp.departureTime).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                    </Chip>
                  </div>

                  <button
                    onClick={() => accept(opp.requestId)}
                    disabled={accepting === opp.requestId}
                    style={{
                      width: "100%", padding: "10px",
                      background: "var(--grad-primary)", border: "none", borderRadius: 10,
                      color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer",
                      boxShadow: "var(--glow-sm)", opacity: accepting === opp.requestId ? .7 : 1,
                    }}
                  >
                    {accepting === opp.requestId ? (
                      <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                        <span style={{ width:14, height:14, border:"2px solid rgba(255,255,255,.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin .7s linear infinite", display:"inline-block" }}/>
                        Đang nhận chuyến...
                      </span>
                    ) : (
                      <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                        <ReturnRouteIcon size={14}/> Nhận chuyến chiều về
                      </span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      background: "var(--bg-overlay)", borderRadius: 6,
      padding: "3px 8px", fontSize: 11, color: "var(--text-secondary)",
    }}>
      {children}
    </div>
  );
}
