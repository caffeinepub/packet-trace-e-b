import {
  LayoutGrid,
  Monitor,
  Radio,
  Router,
  Server,
  Shield,
  Smartphone,
} from "lucide-react";
import type { DeviceType } from "./types";
import { DEVICE_CONFIGS } from "./types";

interface DeviceIconProps {
  type: DeviceType;
  size?: number;
  className?: string;
}

function AccessPointIcon({ size, color }: { size: number; color: string }) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2 + 2;
  const r1 = s * 0.18;
  const r2 = s * 0.32;
  const r3 = s * 0.46;

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Access Point"
      role="img"
    >
      <path
        d={`M ${cx - r3 * 0.866} ${cy - r3 * 0.5} A ${r3} ${r3} 0 0 1 ${cx + r3 * 0.866} ${cy - r3 * 0.5}`}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.6}
      />
      <path
        d={`M ${cx - r2 * 0.866} ${cy - r2 * 0.5} A ${r2} ${r2} 0 0 1 ${cx + r2 * 0.866} ${cy - r2 * 0.5}`}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.8}
      />
      <path
        d={`M ${cx - r1 * 0.866} ${cy - r1 * 0.5} A ${r1} ${r1} 0 0 1 ${cx + r1 * 0.866} ${cy - r1 * 0.5}`}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy + 2} r={2} fill={color} />
      <line
        x1={cx}
        y1={cy + 2}
        x2={cx}
        y2={cy + s * 0.3}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DeviceIcon({
  type,
  size = 24,
  className = "",
}: DeviceIconProps) {
  const cfg = DEVICE_CONFIGS[type];
  const iconProps = { size, color: cfg.color, className };

  switch (type) {
    case "router":
      return <Router {...iconProps} />;
    case "switch":
      return <LayoutGrid {...iconProps} />;
    case "hub":
      return <Radio {...iconProps} />;
    case "pc":
      return <Monitor {...iconProps} />;
    case "server":
      return <Server {...iconProps} />;
    case "smartphone":
      return <Smartphone {...iconProps} />;
    case "firewall":
      return <Shield {...iconProps} />;
    case "access-point":
      return <AccessPointIcon size={size} color={cfg.color} />;
    default:
      return <Monitor {...iconProps} />;
  }
}
