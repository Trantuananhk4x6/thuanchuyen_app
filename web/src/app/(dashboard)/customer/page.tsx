"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import PlaceAutocomplete, { type PlaceResult } from "@/components/PlaceAutocomplete";
import { api } from "@/lib/api/client";
import { useAuth } from "@/hooks/useAuth";
import {
  BusIcon, SearchIcon, CrosshairIcon, ArrowUpDownIcon, MapPinIcon,
  CheckCircleIcon, AlertTriangleIcon, ClockIcon, RulerIcon, SeatIcon,
  StarIcon, RouteIcon, CarIcon, PhoneIcon, UserIcon, EditIcon, TicketIcon, XIcon,
} from "@/components/ui/Icons";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

interface QuoteResult { distanceKm: number; durationMin: number; quotedPrice: number }
interface DriverCard {
  driverId: string; driverProfileId: string; name: string; plate: string;
  vehicleType: string; seatsAvailable: number; rating: number;
  detourKm: number; quotedPrice: number; departureTime: string;
  pickupDeviationKm?: number; dropoffDeviationKm?: number;
  coverageScore?: number;
  originAddress?: string; destAddress?: string;
}
interface GeoPoint { lat: number; lng: number }

// idle → results → confirm → booked
type Step = "idle" | "results" | "confirm" | "booked";

interface ActiveTrip {
  tripId: string;
  status: string;
  pickup: string;
  dropoff: string;
  driverName: string | null;
  vehiclePlate: string;
}

export default function CustomerBookingPage() {
  const { user } = useAuth();
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);

  // Check for ongoing/active trip on mount
  useEffect(() => {
    api.get<{ items: Array<{ id: string; status: string; pickupAddress?: string; dropoffAddress?: string; matches: Array<{ driverProfile: { vehiclePlate: string; user: { fullName: string | null } } }>; tripPassenger: { tripId: string } | null }> }>(
      "/customer/trip-requests?status=MATCHED"
    ).then((r) => {
      const matched = r.data.items.find((t) => t.tripPassenger?.tripId);
      if (matched && matched.tripPassenger) {
        setActiveTrip({
          tripId:      matched.tripPassenger.tripId,
          status:      matched.status,
          pickup:      matched.pickupAddress ?? "",
          dropoff:     matched.dropoffAddress ?? "",
          driverName:  matched.matches[0]?.driverProfile?.user?.fullName ?? null,
          vehiclePlate:matched.matches[0]?.driverProfile?.vehiclePlate ?? "",
        });
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [pickup,  setPickup]  = useState<PlaceResult | null>(null);
  const [dropoff, setDropoff] = useState<PlaceResult | null>(null);
  const [pickupInput,  setPickupInput]  = useState("");
  const [dropoffInput, setDropoffInput] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [seats, setSeats] = useState(1);

  const [step,    setStep]    = useState<Step>("idle");
  const [quote,   setQuote]   = useState<QuoteResult | null>(null);
  const [drivers, setDrivers] = useState<DriverCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [bookedId, setBookedId] = useState("");

  // Confirm step state
  const [pendingMode,   setPendingMode]   = useState<"DIRECT_BOOK" | "OPEN_WAIT">("OPEN_WAIT");
  const [pendingDriver, setPendingDriver] = useState<DriverCard | null>(null);
  const [passengerName,  setPassengerName]  = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [note, setNote] = useState("");

  const [locating,   setLocating]   = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Voucher state
  const [voucherCode,    setVoucherCode]    = useState("");
  const [voucherApplied, setVoucherApplied] = useState<{ id: string; code: string; name: string; discount: number; finalPrice: number } | null>(null);
  const [voucherError,   setVoucherError]   = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [showVoucherList, setShowVoucherList] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState<Array<{ id: string; code: string; name: string; type: string; value: number; minOrderValue: number; expiresAt: string }>>([]);
  const [voucherListLoading, setVoucherListLoading] = useState(false);

  // Auto-default departure time to +1 hour on mount
  useEffect(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    setDepartureTime(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
  }, []);

  // Prefill passenger info from account — chỉ chạy 1 lần khi user load xong
  useEffect(() => {
    if (user?.id) {
      setPassengerName(user.fullName ?? "");
      setPassengerPhone(user.phone ?? "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const setTimePreset = (offsetHours: number, fixedHour?: number) => {
    const d = new Date();
    if (fixedHour !== undefined) {
      d.setDate(d.getDate() + Math.ceil(offsetHours / 24));
      d.setHours(fixedHour, 0, 0, 0);
    } else {
      d.setTime(d.getTime() + offsetHours * 3600 * 1000);
      d.setSeconds(0, 0);
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    setDepartureTime(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
  };

  const onPickupSelect  = useCallback((r: PlaceResult) => { setPickup(r);  setPickupInput(r.address); }, []);
  const onDropoffSelect = useCallback((r: PlaceResult) => { setDropoff(r); setDropoffInput(r.address); }, []);

  useEffect(() => {
    if (!pickup || !dropoff) { setQuote(null); return; }
    if (quoteTimer.current) clearTimeout(quoteTimer.current);
    quoteTimer.current = setTimeout(async () => {
      setQuoteLoading(true);
      try {
        const r = await api.post<QuoteResult>("/customer/quote", {
          pickup:  { lat: pickup.lat,  lng: pickup.lng  },
          dropoff: { lat: dropoff.lat, lng: dropoff.lng },
          departureTime: departureTime ? new Date(departureTime).toISOString() : new Date().toISOString(),
          seats,
        });
        setQuote(r.data);
      } catch { setQuote(null); }
      finally { setQuoteLoading(false); }
    }, 400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, dropoff, seats]);

  const useMyLocation = () => {
    if (!navigator.geolocation) { setError("Trình duyệt không hỗ trợ định vị GPS."); return; }
    setLocating(true); setError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lng } }) => {
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
          headers: { "Accept-Language": "vi" },
        })
          .then((r) => r.json())
          .then((data) => {
            const address = data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            setPickup({ address, lat, lng });
            setPickupInput(address);
          })
          .catch(() => {
            const address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            setPickup({ address, lat, lng });
            setPickupInput(address);
          })
          .finally(() => setLocating(false));
      },
      (err) => {
        setLocating(false);
        setError(
          err.code === 1 ? "Bạn chưa cho phép truy cập vị trí." :
          err.code === 2 ? "Không xác định được vị trí." : "Hết thời gian định vị."
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  };

  // datetime-local value không có timezone → convert sang ISO trước khi gửi API
  const toISO = (dt: string) => dt ? new Date(dt).toISOString() : new Date().toISOString();

  const canSearch = pickup && dropoff && departureTime;

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSearch) return;
    setLoading(true); setError("");
    try {
      const pu: GeoPoint = { lat: pickup.lat, lng: pickup.lng };
      const dr: GeoPoint = { lat: dropoff.lat, lng: dropoff.lng };
      const isoTime = toISO(departureTime);
      const [q, feed] = await Promise.all([
        api.post<QuoteResult>("/customer/quote", { pickup: pu, dropoff: dr, departureTime: isoTime, seats }),
        api.get<{ items: DriverCard[] }>(
          `/customer/feed/drivers?pickupLat=${pu.lat}&pickupLng=${pu.lng}&dropoffLat=${dr.lat}&dropoffLng=${dr.lng}&departureTime=${encodeURIComponent(isoTime)}&seats=${seats}`
        ),
      ]);
      setQuote(q.data);
      setDrivers(feed.data.items);
      setStep("results");
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  // Khi bấm Đặt ngay hoặc Chờ ghép → chuyển sang bước confirm
  const openConfirm = (mode: "DIRECT_BOOK" | "OPEN_WAIT", driver?: DriverCard) => {
    setPendingMode(mode);
    setPendingDriver(driver ?? null);
    setError("");
    setStep("confirm");
  };

  // Bước xác nhận cuối (submit thực sự)
  const confirmBook = async () => {
    if (!pickup || !dropoff || !passengerName.trim() || !passengerPhone.trim()) return;
    setLoading(true); setError("");
    try {
      const res = await api.post<{ request: { id: string } }>("/customer/trip-requests", {
        pickup:  { lat: pickup.lat,  lng: pickup.lng  },
        pickupAddress: pickup.address,
        dropoff: { lat: dropoff.lat, lng: dropoff.lng },
        dropoffAddress: dropoff.address,
        departureTime: toISO(departureTime), seats,
        passengerName: passengerName.trim(),
        passengerPhone: passengerPhone.trim(),
        note: note.trim() || undefined,
        bookingMode: pendingMode,
        ...(pendingDriver ? { targetDriverId: pendingDriver.driverId } : {}),
        ...(voucherApplied ? { voucherCode: voucherApplied.code } : {}),
      });
      setBookedId(res.data.request.id);
      setStep("booked");
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const applyVoucher = async () => {
    if (!voucherCode.trim() || !quote) return;
    setVoucherLoading(true); setVoucherError("");
    try {
      const r = await api.post<{ discount: number; finalPrice: number; voucher: { id: string; code: string; name: string } }>(
        "/customer/vouchers/validate",
        { code: voucherCode.trim().toUpperCase(), orderValue: quote.quotedPrice }
      );
      setVoucherApplied({ ...r.data.voucher, discount: r.data.discount, finalPrice: r.data.finalPrice });
      setVoucherCode("");
    } catch (e) {
      setVoucherError((e as Error).message);
    } finally { setVoucherLoading(false); }
  };

  const removeVoucher = () => { setVoucherApplied(null); setVoucherCode(""); setVoucherError(""); };

  const toggleVoucherList = async () => {
    if (showVoucherList) { setShowVoucherList(false); return; }
    setShowVoucherList(true);
    if (availableVouchers.length > 0) return;
    setVoucherListLoading(true);
    try {
      const r = await api.get<{ vouchers: typeof availableVouchers }>("/customer/vouchers");
      setAvailableVouchers(r.data.vouchers ?? []);
    } catch { /* fail silent */ }
    finally { setVoucherListLoading(false); }
  };

  const selectVoucher = (code: string) => {
    setVoucherCode(code);
    setShowVoucherList(false);
    setVoucherError("");
  };

  const reset = () => {
    setStep("idle"); setPickup(null); setDropoff(null);
    setPickupInput(""); setDropoffInput("");
    setQuote(null); setDrivers([]); setError("");
    setNote(""); setVoucherApplied(null); setVoucherCode(""); setVoucherError("");
  };

  /* ── Booking success ─────────────────────────────────────────────── */
  if (step === "booked") return (
    <div style={{ maxWidth: 560, margin: "60px auto", padding: "0 16px" }}>
      <div style={{
        background: "var(--bg-surface)", border: "1px solid var(--success-border)",
        borderRadius: 20, padding: 40, textAlign: "center",
        boxShadow: "0 0 40px var(--success-bg)",
      }}>
        <div style={{ marginBottom: 16, display:"flex", justifyContent:"center" }}>
          <CheckCircleIcon size={56} color="#34d399" style={{filter:"drop-shadow(0 0 16px #34d39988)"}}/>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
          Đặt chuyến thành công!
        </h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: 6 }}>Mã yêu cầu:</p>
        <div style={{
          background: "var(--bg-overlay)", borderRadius: 8, padding: "8px 16px",
          fontFamily: "monospace", color: "var(--brand-primary)", fontWeight: 600,
          fontSize: 13, marginBottom: 16, wordBreak: "break-all",
        }}>{bookedId}</div>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 28 }}>
          Bạn sẽ nhận thông báo khi tài xế xác nhận.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <a href="/customer/trips" style={{
            padding: "10px 22px", background: "var(--grad-primary)",
            borderRadius: 10, color: "#fff", fontWeight: 600, textDecoration: "none",
            boxShadow: "var(--glow-sm)",
          }}>Theo dõi chuyến</a>
          <button onClick={reset} style={{
            padding: "10px 22px", background: "var(--bg-overlay)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 10, color: "var(--text-secondary)", cursor: "pointer",
          }}>Đặt chuyến khác</button>
        </div>
      </div>
    </div>
  );

  /* ── Confirm overlay (Grab/Be style) ─────────────────────────────── */
  if (step === "confirm") return (
    <div style={{ maxWidth: 560, margin: "32px auto", padding: "0 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => setStep("results")} style={{
          width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", cursor: "pointer", color: "var(--text-muted)",
        }}>
          ←
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Xác nhận chuyến đi</h2>
      </div>

      {error && (
        <div style={{
          display: "flex", gap: 8, padding: "10px 14px", borderRadius: 10, marginBottom: 14,
          background: "var(--danger-bg)", border: "1px solid var(--danger-border)", color: "var(--danger)", fontSize: 13,
        }}>
          <AlertTriangleIcon size={14} style={{flexShrink:0, marginTop:1}}/> {error}
        </div>
      )}

      {/* Route summary */}
      <div style={{
        background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
        borderRadius: 16, padding: 16, marginBottom: 14,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 12 }}>
          Thông tin chuyến
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22d3ee", marginTop: 5, flexShrink: 0 }}/>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Điểm đón</div>
              <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{pickup?.address}</div>
            </div>
          </div>
          <div style={{ marginLeft: 4, borderLeft: "2px dashed var(--border-medium)", height: 12 }}/>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: "#f472b6", marginTop: 5, flexShrink: 0 }}/>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Điểm trả</div>
              <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{dropoff?.address}</div>
            </div>
          </div>
        </div>
        {quote && (
          <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
            <SummaryChip icon={<ClockIcon size={13} color="#22d3ee"/>} label={`~${quote.durationMin} phút`}/>
            <SummaryChip icon={<RulerIcon size={13} color="#6366f1"/>} label={`${quote.distanceKm.toFixed(1)} km`}/>
            <SummaryChip icon={<SeatIcon size={13} color="#34d399"/>} label={`${seats} ghế`}/>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#34d399" }}>
                {quote.quotedPrice.toLocaleString("vi-VN")}đ
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>ước tính</div>
            </div>
          </div>
        )}
        {pendingDriver && (
          <div style={{
            marginTop: 12, padding: "8px 12px", borderRadius: 10,
            background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <CarIcon size={16} color="#6366f1"/>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{pendingDriver.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{pendingDriver.plate} · {pendingDriver.vehicleType}</div>
            </div>
            <div style={{
              marginLeft: "auto", padding: "2px 8px", borderRadius: 99,
              background: "rgba(99,102,241,.15)", color: "#6366f1", fontSize: 11, fontWeight: 600,
            }}>Đặt thẳng</div>
          </div>
        )}
        {!pendingDriver && (
          <div style={{
            marginTop: 12, padding: "8px 12px", borderRadius: 10,
            background: "rgba(34,211,238,.08)", border: "1px solid rgba(34,211,238,.2)",
            fontSize: 12, color: "var(--text-muted)",
          }}>
            🔄 Chờ hệ thống ghép tài xế phù hợp nhất
          </div>
        )}
      </div>

      {/* Passenger info — phần quan trọng nhất */}
      <div style={{
        background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
        borderRadius: 16, padding: 16, marginBottom: 14,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 14 }}>
          Thông tin hành khách
        </div>

        {/* Name */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
            Tên hành khách <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <div style={{ position: "relative" }}>
            <UserIcon size={14} color="var(--text-muted)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}/>
            <input
              type="text"
              value={passengerName}
              onChange={(e) => setPassengerName(e.target.value)}
              placeholder="Nhập tên hành khách..."
              maxLength={100}
              style={{
                width: "100%", padding: "11px 12px 11px 36px",
                background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
                borderRadius: 10, color: "var(--text-primary)", fontSize: 14, outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--brand-primary)"}
              onBlur={(e) => e.target.style.borderColor = "var(--border-subtle)"}
            />
          </div>
        </div>

        {/* Phone */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
            Số điện thoại <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <div style={{ position: "relative" }}>
            <PhoneIcon size={14} color="var(--text-muted)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}/>
            <input
              type="tel"
              value={passengerPhone}
              onChange={(e) => setPassengerPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="0xxxxxxxxx"
              maxLength={12}
              style={{
                width: "100%", padding: "11px 12px 11px 36px",
                background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
                borderRadius: 10, color: "var(--text-primary)", fontSize: 14, outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--brand-primary)"}
              onBlur={(e) => e.target.style.borderColor = "var(--border-subtle)"}
            />
          </div>
        </div>

        {/* Note */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
            Ghi chú cho tài xế <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>(tuỳ chọn)</span>
          </label>
          <div style={{ position: "relative" }}>
            <EditIcon size={14} color="var(--text-muted)" style={{ position: "absolute", left: 12, top: 12, pointerEvents: "none" }}/>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Đón trước cổng xanh, gọi trước 5 phút..."
              maxLength={300}
              rows={2}
              style={{
                width: "100%", padding: "10px 12px 10px 36px",
                background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
                borderRadius: 10, color: "var(--text-primary)", fontSize: 13, outline: "none",
                resize: "none", boxSizing: "border-box", lineHeight: 1.5,
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--brand-primary)"}
              onBlur={(e) => e.target.style.borderColor = "var(--border-subtle)"}
            />
          </div>
          {note && <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "right", marginTop: 3 }}>{note.length}/300</div>}
        </div>
      </div>

      {/* Voucher */}
      <div style={{
        background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
        borderRadius: 16, padding: 16, marginBottom: 14,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <TicketIcon size={13} color="#f97316"/> Voucher & Khuyến mãi
        </div>

        {voucherApplied ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Applied voucher chip */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px", borderRadius: 10,
              background: "rgba(249,115,22,.08)", border: "1px solid rgba(249,115,22,.3)",
            }}>
              <TicketIcon size={16} color="#f97316"/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{voucherApplied.name}</div>
                <div style={{ fontSize: 11, color: "#f97316" }}>Tiết kiệm {voucherApplied.discount.toLocaleString("vi-VN")}đ</div>
              </div>
              <code style={{ fontSize: 12, color: "#f97316", background: "rgba(249,115,22,.15)", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>{voucherApplied.code}</code>
              <button onClick={removeVoucher} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, borderRadius: 6, display: "flex" }}>
                <XIcon size={14}/>
              </button>
            </div>
            {/* Price breakdown */}
            {quote && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--bg-overlay)", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Giá gốc</span>
                  <span style={{ color: "var(--text-primary)" }}>{quote.quotedPrice.toLocaleString("vi-VN")}đ</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#f97316" }}>Giảm giá</span>
                  <span style={{ color: "#f97316", fontWeight: 600 }}>- {voucherApplied.discount.toLocaleString("vi-VN")}đ</span>
                </div>
                <div style={{ height: 1, background: "var(--border-subtle)", margin: "4px 0" }}/>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800 }}>
                  <span style={{ color: "var(--text-primary)" }}>Thành tiền</span>
                  <span style={{ color: "#34d399" }}>{voucherApplied.finalPrice.toLocaleString("vi-VN")}đ</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => { setVoucherCode(e.target.value.toUpperCase()); setVoucherError(""); }}
                onKeyDown={(e) => e.key === "Enter" && applyVoucher()}
                placeholder="Nhập mã voucher..."
                maxLength={20}
                style={{
                  flex: 1, padding: "10px 14px",
                  background: "var(--bg-overlay)", border: `1px solid ${voucherError ? "var(--danger-border)" : "var(--border-subtle)"}`,
                  borderRadius: 10, color: "var(--text-primary)", fontSize: 14, outline: "none",
                  letterSpacing: "0.05em", fontWeight: 600,
                }}
                onFocus={(e) => e.target.style.borderColor = "#f97316"}
                onBlur={(e) => e.target.style.borderColor = voucherError ? "var(--danger-border)" : "var(--border-subtle)"}
              />
              <button type="button" onClick={applyVoucher} disabled={voucherLoading || !voucherCode.trim()}
                style={{
                  padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: voucherCode.trim() ? "#f97316" : "var(--bg-overlay)",
                  color: voucherCode.trim() ? "#fff" : "var(--text-muted)",
                  fontWeight: 600, fontSize: 13, flexShrink: 0, transition: "all .2s",
                }}>
                {voucherLoading ? "..." : "Áp dụng"}
              </button>
            </div>
            {voucherError && (
              <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                <AlertTriangleIcon size={12}/> {voucherError}
              </div>
            )}
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
              <button type="button" onClick={toggleVoucherList} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#f97316", fontSize: 11, fontWeight: 600, padding: 0,
                display: "flex", alignItems: "center", gap: 4,
              }}>
                Xem tất cả voucher khả dụng
                <span style={{ transition: "transform .2s", display: "inline-block", transform: showVoucherList ? "rotate(90deg)" : "none" }}>›</span>
              </button>
            </div>

            {/* Inline voucher list */}
            {showVoucherList && (
              <div style={{
                marginTop: 10, borderRadius: 12, border: "1px solid rgba(249,115,22,.25)",
                background: "rgba(249,115,22,.04)", overflow: "hidden",
              }}>
                {voucherListLoading ? (
                  <div style={{ padding: "20px", textAlign: "center" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(249,115,22,.2)", borderTopColor: "#f97316", animation: "spin .8s linear infinite", margin: "0 auto" }}/>
                  </div>
                ) : availableVouchers.length === 0 ? (
                  <div style={{ padding: "16px", textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
                    Không có voucher nào khả dụng lúc này
                  </div>
                ) : (
                  <div style={{ maxHeight: 280, overflowY: "auto" }}>
                    {availableVouchers.map((v) => (
                      <button key={v.id} type="button" onClick={() => selectVoucher(v.code)}
                        style={{
                          width: "100%", padding: "10px 14px", background: "none", border: "none",
                          borderBottom: "1px solid rgba(249,115,22,.1)", cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                          transition: "background .15s",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(249,115,22,.08)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                          background: "rgba(249,115,22,.15)", border: "1px solid rgba(249,115,22,.3)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <TicketIcon size={16} color="#f97316"/>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", marginBottom: 2 }}>{v.name}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ color: "#f97316", fontWeight: 600 }}>
                              {v.type === "PERCENT" ? `Giảm ${v.value}%` : v.type === "FREE_TRIP" ? "Miễn phí chuyến" : `Giảm ${(v.value ?? 0).toLocaleString("vi-VN")}đ`}
                            </span>
                            {v.minOrderValue > 0 ? <span>Đơn tối thiểu {v.minOrderValue.toLocaleString("vi-VN")}đ</span> : null}
                            <span>HSD: {new Date(v.expiresAt).toLocaleDateString("vi-VN")}</span>
                          </div>
                        </div>
                        <code style={{
                          fontSize: 11, fontWeight: 700, fontFamily: "monospace",
                          color: "#f97316", background: "rgba(249,115,22,.12)",
                          padding: "2px 8px", borderRadius: 4, flexShrink: 0,
                        }}>{v.code}</code>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm button */}
      <button
        onClick={confirmBook}
        disabled={loading || !passengerName.trim() || passengerPhone.length < 9}
        style={{
          width: "100%", padding: "14px",
          background: passengerName.trim() && passengerPhone.length >= 9
            ? "var(--grad-primary)" : "var(--bg-overlay)",
          border: "none", borderRadius: 14, cursor: "pointer",
          color: passengerName.trim() && passengerPhone.length >= 9 ? "#fff" : "var(--text-muted)",
          fontWeight: 700, fontSize: 16,
          boxShadow: passengerName.trim() && passengerPhone.length >= 9 ? "var(--glow-primary)" : "none",
          transition: "all .2s",
        }}
      >
        {loading ? (
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }}/>
            Đang đặt chuyến...
          </span>
        ) : "Xác nhận đặt chuyến"}
      </button>

      <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
        Bằng cách xác nhận, bạn đồng ý với điều khoản dịch vụ của Thuận Chuyến.
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  /* ── Main layout (search form + map) ─────────────────────────────── */
  return (
    <>
    {/* ── Active trip banner ──────────────────────────────────── */}
    {activeTrip && (
      <a href={`/customer/trips/${activeTrip.tripId}`} style={{ textDecoration:"none", display:"block" }}>
        <div style={{
          display:"flex", alignItems:"center", gap:12,
          padding:"10px 16px", marginBottom:0,
          background:"linear-gradient(90deg,rgba(99,102,241,.15),rgba(34,211,238,.08))",
          border:"1px solid rgba(99,102,241,.3)",
          borderRadius:0,
          cursor:"pointer",
        }}>
          <span style={{ width:8, height:8, borderRadius:"50%", background:"#34d399", flexShrink:0, animation:"pulse2 1.5s infinite", display:"inline-block" }}/>
          <span style={{ fontSize:13, fontWeight:600, color:"#a5b4fc" }}>Chuyến đang chạy</span>
          {activeTrip.driverName && (
            <span style={{ fontSize:12, color:"var(--text-muted)" }}>
              · Tài xế {activeTrip.driverName}
              {activeTrip.vehiclePlate && <span style={{ marginLeft:6, fontFamily:"monospace", background:"var(--bg-overlay)", padding:"1px 6px", borderRadius:4, fontSize:11 }}>{activeTrip.vehiclePlate}</span>}
            </span>
          )}
          <span style={{ marginLeft:"auto", fontSize:12, color:"#22d3ee", fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
            Xem lộ trình →
          </span>
        </div>
      </a>
    )}
    <div className="booking-layout" style={{
      display: "flex",
      height: "calc(100vh - var(--header-h, 64px))",
      overflow: "hidden",
      margin: "-24px",
    }}>
      {/* ── Left panel ────────────────────────────────────────── */}
      <div className="booking-panel" style={{
        width: 420, flexShrink: 0,
        background: "var(--bg-surface, #0f172a)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        <div style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-elevated, #1e293b)",
        }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2, display:"flex", alignItems:"center", gap:8 }}>
            <BusIcon size={20} color="#6366f1"/> Đặt chuyến xe
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Liên tỉnh · Ghép khách · Giá tốt</p>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {error && (
            <div style={{
              display:"flex", alignItems:"center", gap:8,
              padding: "10px 14px", borderRadius: 8, marginBottom: 12,
              background: "var(--danger-bg)", border: "1px solid var(--danger-border)",
              color: "var(--danger)", fontSize: 13,
            }}>
              <AlertTriangleIcon size={14} style={{flexShrink:0}}/> {error}
            </div>
          )}

          <form onSubmit={search}>
            <div style={{ background: "var(--bg-overlay)", borderRadius: 16, padding: 16, marginBottom: 12 }}>
              {/* Pickup */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--brand-secondary)", textTransform: "uppercase", letterSpacing: .5 }}>
                    Điểm đón
                  </div>
                  <button type="button" onClick={useMyLocation} disabled={locating} style={{
                    display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99,
                    cursor: locating ? "wait" : "pointer",
                    background: locating ? "var(--bg-elevated)" : "var(--info-bg)",
                    border: "1px solid var(--info-border)", color: "var(--info)",
                    fontSize: 11, fontWeight: 600, transition: "all .2s", opacity: locating ? 0.7 : 1,
                  }}>
                    {locating ? (
                      <><span style={{ width: 10, height: 10, border: "1.5px solid rgba(34,211,238,.3)", borderTopColor: "#22d3ee", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} /> Định vị...</>
                    ) : (
                      <><CrosshairIcon size={11}/> Vị trí của tôi</>
                    )}
                  </button>
                </div>
                <PlaceAutocomplete
                  placeholder="Nhập địa chỉ đón..."
                  value={pickupInput} onChange={setPickupInput} onSelect={onPickupSelect}
                  autoFocus icon={<CrosshairIcon size={16} color="#22d3ee"/>}
                />
              </div>

              {/* Connector */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0 8px 12px" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 2, height: 4, background: "var(--border-medium)", borderRadius: 2 }} />)}
                </div>
                <button type="button" onClick={() => {
                  const p = pickup; const pi = pickupInput;
                  setPickup(dropoff); setPickupInput(dropoffInput);
                  setDropoff(p); setDropoffInput(pi);
                }} title="Đổi chiều" style={{
                  background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                  borderRadius: 8, width: 28, height: 28, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--text-muted)", transition: "all .2s",
                }}>
                  <ArrowUpDownIcon size={14}/>
                </button>
              </div>

              {/* Dropoff */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#f472b6", marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>Điểm trả</div>
                <PlaceAutocomplete
                  placeholder="Nhập địa chỉ trả..."
                  value={dropoffInput} onChange={setDropoffInput} onSelect={onDropoffSelect}
                  icon={<MapPinIcon size={16} color="#f472b6"/>}
                />
              </div>
            </div>

            {/* Time + Seats */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>
                  Giờ khởi hành
                </label>
                <input
                  type="datetime-local" value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)} required
                  style={{
                    width: "100%", padding: "11px 12px",
                    background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
                    borderRadius: 10, color: "var(--text-primary)", fontSize: 13, outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "var(--brand-primary)"}
                  onBlur={(e) => e.target.style.borderColor = "var(--border-subtle)"}
                />
                {/* Quick time presets */}
                <div style={{ display: "flex", gap: 5, marginTop: 7, flexWrap: "wrap" }}>
                  {[
                    { label: "Bây giờ",    fn: () => setTimePreset(0) },
                    { label: "+1 tiếng",   fn: () => setTimePreset(1) },
                    { label: "+2 tiếng",   fn: () => setTimePreset(2) },
                    { label: "Sáng mai 8h",fn: () => setTimePreset(24, 8) },
                    { label: "Chiều mai 2h",fn: () => setTimePreset(24, 14) },
                  ].map(({ label, fn }) => (
                    <button key={label} type="button" onClick={fn} style={{
                      padding: "3px 9px", borderRadius: 99, fontSize: 11, cursor: "pointer",
                      background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                      color: "var(--text-muted)", transition: "all .15s", whiteSpace: "nowrap",
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--brand-primary)"; e.currentTarget.style.color = "var(--brand-primary)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                    >{label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>
                  Số ghế
                </label>
                <div style={{ display: "flex", gap: 4 }}>
                  {[1,2,3,4].map((n) => (
                    <button key={n} type="button" onClick={() => setSeats(n)} style={{
                      flex: 1, padding: "10px 0", borderRadius: 8, cursor: "pointer",
                      border: `1px solid ${seats === n ? "var(--brand-primary)" : "var(--border-subtle)"}`,
                      background: seats === n ? "var(--bg-active)" : "var(--bg-overlay)",
                      color: seats === n ? "var(--brand-primary)" : "var(--text-muted)",
                      fontWeight: seats === n ? 700 : 400, fontSize: 14,
                      boxShadow: seats === n ? "var(--glow-sm)" : "none", transition: "all .15s",
                    }}>{n}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick book CTA — hiện khi có đủ địa chỉ + giá ước tính */}
            {pickup && dropoff && quote && step === "idle" && (
              <div style={{
                background: "linear-gradient(135deg,rgba(99,102,241,.1),rgba(34,211,238,.06))",
                border: "1px solid rgba(99,102,241,.25)", borderRadius: 14,
                padding: "12px 14px", marginBottom: 10,
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
              }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Giá ước tính</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#34d399" }}>{quote.quotedPrice.toLocaleString("vi-VN")}đ</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{quote.distanceKm.toFixed(1)} km · ~{quote.durationMin} phút</div>
                </div>
                <button type="button" onClick={() => openConfirm("OPEN_WAIT")} style={{
                  padding: "10px 16px", background: "var(--grad-primary)",
                  border: "none", borderRadius: 10, cursor: "pointer",
                  color: "#fff", fontWeight: 700, fontSize: 13,
                  boxShadow: "var(--glow-sm)", flexShrink: 0, lineHeight: 1.4,
                }}>
                  Đặt ngay<br/><span style={{ fontSize: 11, fontWeight: 400, opacity: .85 }}>chờ ghép tự động</span>
                </button>
              </div>
            )}

            {/* Search button */}
            {(() => {
              const hint = !pickup ? "Nhập điểm đón trước" : !dropoff ? "Nhập điểm trả" : null;
              return (
                <button
                  type="submit" disabled={!canSearch || loading}
                  style={{
                    width: "100%", padding: "13px",
                    background: canSearch ? "var(--bg-overlay)" : "var(--bg-overlay)",
                    border: `1px solid ${canSearch ? "var(--border-medium)" : "var(--border-subtle)"}`,
                    borderRadius: 12, cursor: canSearch ? "pointer" : "not-allowed",
                    color: canSearch ? "var(--text-secondary)" : "var(--text-muted)",
                    fontWeight: 600, fontSize: 14, transition: "all .2s",
                  }}
                  onMouseEnter={(e) => { if (canSearch) { e.currentTarget.style.borderColor = "var(--brand-primary)"; e.currentTarget.style.color = "var(--brand-primary)"; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = canSearch ? "var(--border-medium)" : "var(--border-subtle)"; e.currentTarget.style.color = canSearch ? "var(--text-secondary)" : "var(--text-muted)"; }}
                >
                  {loading ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
                      Đang tìm tài xế...
                    </span>
                  ) : hint ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: .7 }}>
                      ↑ {hint}
                    </span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <SearchIcon size={15}/> Xem danh sách tài xế
                    </span>
                  )}
                </button>
              );
            })()}
          </form>

          {/* Auto quote */}
          {(quoteLoading || quote) && pickup && dropoff && (
            <div style={{
              marginTop: 12, borderRadius: 14,
              background: quote ? "linear-gradient(135deg,rgba(99,102,241,.12),rgba(34,211,238,.06))" : "var(--bg-overlay)",
              border: `1px solid ${quote ? "rgba(99,102,241,.3)" : "var(--border-subtle)"}`,
              overflow: "hidden",
            }}>
              {quoteLoading ? (
                <div style={{ padding: "16px", display: "flex", alignItems: "center", gap: 10, color: "var(--text-muted)", fontSize: 13 }}>
                  <span style={{ width: 14, height: 14, border: "2px solid rgba(99,102,241,.3)", borderTopColor: "#6366f1", borderRadius: "50%", display: "inline-block", animation: "spin .6s linear infinite", flexShrink: 0 }} />
                  Đang tính giá...
                </div>
              ) : quote && (
                <>
                  <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid rgba(99,102,241,.1)" }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 }}>Giá ước tính</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 28, fontWeight: 800, color: "#34d399", letterSpacing: -1 }}>
                        {quote.quotedPrice.toLocaleString("vi-VN")}đ
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>/ {seats} ghế</span>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "10px 16px" }}>
                    <StatChip icon={<RulerIcon size={16} color="#6366f1"/>} label="Khoảng cách" value={`${quote.distanceKm.toFixed(1)} km`} />
                    <StatChip icon={<ClockIcon size={16} color="#22d3ee"/>} label="Thời gian" value={`~${quote.durationMin} phút`} />
                    <StatChip icon={<SeatIcon size={16} color="#34d399"/>} label="Mỗi ghế" value={`${Math.round(quote.quotedPrice / seats).toLocaleString("vi-VN")}đ`} />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Driver results */}
          {step === "results" && (
            <div style={{ marginTop: 16 }}>
              {/* Primary CTA — luôn hiện */}
              <button onClick={() => openConfirm("OPEN_WAIT")} disabled={loading} style={{
                width: "100%", padding: "13px", marginBottom: 14,
                background: "var(--grad-primary)", border: "none", borderRadius: 12,
                cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 15,
                boxShadow: "var(--glow-primary)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                <span style={{ fontSize: 16 }}>🚀</span>
                Đặt chuyến ngay · chờ ghép tài xế
                {quote && <span style={{ fontSize: 12, fontWeight: 500, opacity: .85 }}>· {quote.quotedPrice.toLocaleString("vi-VN")}đ</span>}
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }}/>
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
                  {drivers.length > 0 ? `hoặc chọn ${drivers.length} tài xế sẵn có` : "không có tài xế trực tuyến ngay lúc này"}
                </span>
                <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }}/>
              </div>

              {drivers.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {drivers.map((d) => (
                    <DriverCard key={d.driverProfileId} driver={d} onBook={() => openConfirm("DIRECT_BOOK", d)} loading={loading} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Map ─────────────────────────────────────────────── */}
      <div className="booking-map" style={{ flex: 1, position: "relative" }}>
        <RouteMap
          pickup={pickup ? { lat: pickup.lat, lng: pickup.lng } : null}
          dropoff={dropoff ? { lat: dropoff.lat, lng: dropoff.lng } : null}
          style={{ width: "100%", height: "100%" }}
        />
        {!pickup && !dropoff && (
          <div style={{
            position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
            background: "rgba(15,23,42,.85)", backdropFilter: "blur(12px)",
            border: "1px solid var(--border-subtle)", borderRadius: 999, padding: "8px 18px",
            color: "var(--text-secondary)", fontSize: 13, pointerEvents: "none", whiteSpace: "nowrap",
          }}>
            🗺️ Nhập địa chỉ để hiển thị tuyến đường
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes pulse2 { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
        @media (max-width: 768px) {
          .booking-layout { flex-direction: column !important; height: auto !important; overflow: visible !important; }
          .booking-panel  { width: 100% !important; border-right: none !important; border-bottom: 1px solid var(--border-subtle); }
          .booking-map    { flex: none !important; height: 240px !important; }
        }
      `}</style>
    </div>
    </>
  );
}

function DriverCard({ driver: d, onBook, loading }: {
  driver: DriverCard; onBook: () => void; loading: boolean;
}) {
  const stars = Math.round(d.rating);
  const depDate = new Date(d.departureTime);
  const today   = new Date(); today.setHours(0,0,0,0);
  const depDay  = new Date(depDate); depDay.setHours(0,0,0,0);
  const diffDay = Math.round((depDay.getTime() - today.getTime()) / 86400000);
  const dayLabel = diffDay === -1 ? "Hôm qua" : diffDay === 0 ? "Hôm nay" : diffDay === 1 ? "Ngày mai" : `${depDate.toLocaleDateString("vi-VN", { day:"2-digit", month:"2-digit" })}`;
  const coverPct = Math.round((d.coverageScore ?? 0) * 100);
  const isOnRoute = (d.pickupDeviationKm ?? 0) < 10 && (d.dropoffDeviationKm ?? 0) < 10;

  return (
    <div style={{
      background: "var(--bg-overlay)", border: `1px solid ${isOnRoute ? "rgba(52,211,153,.35)" : "var(--border-subtle)"}`,
      borderRadius: 14, padding: "14px 14px 12px", transition: "border-color .2s, box-shadow .2s",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = isOnRoute ? "#34d399" : "var(--brand-primary)"; e.currentTarget.style.boxShadow = "var(--glow-sm)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = isOnRoute ? "rgba(52,211,153,.35)" : "var(--border-subtle)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Route label (tuyến đường tài xế) */}
      {(d.originAddress || d.destAddress) && (
        <div style={{
          display: "flex", alignItems: "center", gap: 5, marginBottom: 10,
          padding: "5px 8px", borderRadius: 8,
          background: "var(--bg-elevated)", fontSize: 11, color: "var(--text-muted)",
          overflow: "hidden",
        }}>
          <RouteIcon size={11} color="#a78bfa"/>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {d.originAddress?.split(",").slice(-2).join(",").trim()} → {d.destAddress?.split(",").slice(-2).join(",").trim()}
          </span>
          {isOnRoute && (
            <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: "#34d399", marginLeft: 4 }}>
              ✓ Qua điểm của bạn
            </span>
          )}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: "var(--grad-primary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "var(--glow-sm)",
        }}>
          <CarIcon size={22} color="#fff"/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 2, fontSize: 14 }}>{d.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: "2px 8px", fontSize: 11, color: "var(--text-muted)" }}>{d.vehicleType}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.plate}</span>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: "#34d399" }}>{d.quotedPrice.toLocaleString("vi-VN")}đ</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>ước tính</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        <Chip icon={<StarIcon size={12} color="#fbbf24" filled/>}>{"★".repeat(stars)}{"☆".repeat(5 - stars)} {d.rating.toFixed(1)}</Chip>
        <Chip icon={<SeatIcon size={12} color="#6366f1"/>}>{d.seatsAvailable} ghế</Chip>
        <Chip icon={<ClockIcon size={12} color="#22d3ee"/>}>
          {dayLabel} · {depDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
        </Chip>
        {(d.pickupDeviationKm ?? 0) > 0 && (
          <Chip icon={<MapPinIcon size={12} color="#f472b6"/>}>
            Đón lệch ~{d.pickupDeviationKm?.toFixed(0)}km
          </Chip>
        )}
      </div>

      {/* Coverage bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 10, color: "var(--text-muted)" }}>
          <span>Độ phù hợp lộ trình</span>
          <span style={{ color: coverPct >= 70 ? "#34d399" : coverPct >= 40 ? "#fbbf24" : "#f87171", fontWeight: 700 }}>{coverPct}%</span>
        </div>
        <div style={{ height: 4, borderRadius: 99, background: "var(--bg-elevated)", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 99, transition: "width .4s",
            width: `${coverPct}%`,
            background: coverPct >= 70 ? "#34d399" : coverPct >= 40 ? "#fbbf24" : "#f87171",
          }}/>
        </div>
      </div>

      <button onClick={onBook} disabled={loading} style={{
        width: "100%", padding: "9px", background: "var(--grad-primary)",
        border: "none", borderRadius: 9, cursor: "pointer",
        color: "#fff", fontWeight: 600, fontSize: 14,
        boxShadow: "var(--glow-sm)", transition: "opacity .2s", opacity: loading ? .6 : 1,
      }}>
        Đặt ngay →
      </button>
    </div>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--bg-elevated)", borderRadius: 6, padding: "3px 8px", fontSize: 11, color: "var(--text-secondary)" }}>
      <span>{icon}</span>{children}
    </div>
  );
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ marginBottom: 4, display:"flex", justifyContent:"center" }}>{icon}</div>
      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
    </div>
  );
}

function SummaryChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--text-secondary)" }}>
      {icon} {label}
    </div>
  );
}
