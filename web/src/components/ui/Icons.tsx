"use client";
/**
 * Thuận Chuyến icon set — geometric SVG, Three.js wireframe aesthetic.
 * Stroke-based, adapts to `color` / `size` props.
 */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number, extra?: object) => ({
  width: size, height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...extra,
});

/* ── Transport ─────────────────────────────────────────────────────────────── */

export function CarIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M5 17H3v-4l2.5-5h11l2.5 5v4h-2" />
      <circle cx="7.5" cy="17" r="1.5" />
      <circle cx="16.5" cy="17" r="1.5" />
      <path d="M5 13h14" />
    </svg>
  );
}

export function BusIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="2" y="4" width="20" height="14" rx="3" />
      <path d="M8 18v2M16 18v2M2 10h20M8 4v6M16 4v6" />
      <circle cx="6.5" cy="16" r="1" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="16" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TruckIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M14 4H2v13h12V4zM14 8h4l3 3v5h-7V8z" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="19" r="2" />
    </svg>
  );
}

/* ── Navigation ────────────────────────────────────────────────────────────── */

export function MapPinIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 2C8.69 2 6 4.69 6 8c0 5.25 6 12 6 12s6-6.75 6-12c0-3.31-2.69-6-6-6z" />
      <circle cx="12" cy="8" r="2" />
    </svg>
  );
}

export function NavigationIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <polygon points="3,11 22,2 13,21 11,13" />
    </svg>
  );
}

export function CrosshairIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  );
}

export function RouteIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="5" cy="7" r="2" />
      <circle cx="19" cy="17" r="2" />
      <path d="M5 9C5 13 9 13 12 13s7 0 7 4" />
    </svg>
  );
}

export function ReturnRouteIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M3 12h18M15 6l6 6-6 6" />
      <path d="M3 6l6 6-6 6" strokeOpacity={0.4} />
    </svg>
  );
}

/* ── Actions ───────────────────────────────────────────────────────────────── */

export function SearchIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

export function ArrowUpDownIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M7 3l-4 4 4 4M3 7h18M17 21l4-4-4-4M21 17H3" />
    </svg>
  );
}

export function RefreshIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

export function CheckIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <polyline points="20,6 9,17 4,12" />
    </svg>
  );
}

export function CheckCircleIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="9,12 11,14 15,10" />
    </svg>
  );
}

export function XIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function AlertTriangleIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth={2} />
    </svg>
  );
}

/* ── UI elements ───────────────────────────────────────────────────────────── */

export function StarIcon({ size = 24, filled = false, ...p }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(size)} {...p}>
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}

export function ClockIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12,7 12,12 16,14" />
    </svg>
  );
}

export function BellIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export function UsersIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function UserIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function SeatIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="4" y="3" width="7" height="10" rx="1" />
      <rect x="4" y="15" width="16" height="4" rx="1" />
      <path d="M4 19v2M16 19v2M11 13v4" />
    </svg>
  );
}

/* ── Finance ───────────────────────────────────────────────────────────────── */

export function WalletIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
      <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
      <circle cx="18" cy="12" r="2" />
    </svg>
  );
}

export function CoinIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v1M12 16v1M9.5 9.5c0-.83.67-1.5 1.5-1.5h2a1.5 1.5 0 0 1 0 3h-2a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 0 1.5-1.5" />
    </svg>
  );
}

/* ── Tech / Analytics ──────────────────────────────────────────────────────── */

export function ZapIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
    </svg>
  );
}

export function ShieldIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6z" />
      <polyline points="9,12 11,14 15,10" />
    </svg>
  );
}

export function ActivityIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
    </svg>
  );
}

export function TrendingUpIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
      <polyline points="17,6 23,6 23,12" />
    </svg>
  );
}

export function LayersIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <polygon points="12,2 2,7 12,12 22,7" />
      <polyline points="2,17 12,22 22,17" />
      <polyline points="2,12 12,17 22,12" />
    </svg>
  );
}

export function PackageIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27,6.96 12,12.01 20.73,6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

export function KeyIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

export function EnvelopeIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="2,4 12,13 22,4" />
    </svg>
  );
}

export function FireIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

export function BackhaulIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M1 4v6h6" />
      <path d="M3.51 15a9 9 0 1 0 .49-4" />
    </svg>
  );
}

export function HomeIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
  );
}

export function ListIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <line x1="8" y1="6"  x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6"  x2="3.01" y2="6"  strokeWidth={2} />
      <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth={2} />
      <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth={2} />
    </svg>
  );
}

export function HistoryIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <polyline points="1,4 1,10 7,10" />
      <path d="M3.51 15a9 9 0 1 0 .49-4" />
      <polyline points="12,7 12,12 15,15" />
    </svg>
  );
}

export function DocumentIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}

export function LogOutIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function SendIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22,2 15,22 11,13 2,9" />
    </svg>
  );
}

export function MapIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

export function TagIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" strokeWidth={2} />
    </svg>
  );
}

export function PhoneIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function FlagIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

export function UsersGroupIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function ToggleRightIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="1" y="5" width="22" height="14" rx="7" />
      <circle cx="16" cy="12" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ToggleLeftIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="1" y="5" width="22" height="14" rx="7" />
      <circle cx="8" cy="12" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PlusIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function ArrowLeftIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12,19 5,12 12,5" />
    </svg>
  );
}

export function RulerIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0z" />
      <path d="M7.5 6.5 10 9M10.5 9.5 13 12M13.5 12.5 16 15" />
    </svg>
  );
}

export function EditIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export function GiftIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <polyline points="20,12 20,22 4,22 4,12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}

export function TicketIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2z" />
    </svg>
  );
}

export function ImageIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21,15 16,10 5,21" />
    </svg>
  );
}

export function CalendarIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function TrashIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <polyline points="3,6 5,6 21,6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export function PercentIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}

export function SlidersIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

export function MegaphoneIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M3 11l19-9-9 19-2-8-8-2z" />
    </svg>
  );
}

export function ChatIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function ChevronDownIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function ChevronUpIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

export function MergeIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M16 3h5v5" />
      <path d="M8 3H3v5" />
      <path d="M21 3l-7 7-4-4-7 7" />
      <path d="M12 17v4" />
      <path d="M9 21h6" />
    </svg>
  );
}
