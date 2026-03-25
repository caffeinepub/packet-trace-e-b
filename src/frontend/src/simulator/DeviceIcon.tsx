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
    default:
      return <Monitor {...iconProps} />;
  }
}
