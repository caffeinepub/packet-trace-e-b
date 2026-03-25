export type DeviceType =
  | "router"
  | "switch"
  | "hub"
  | "pc"
  | "server"
  | "smartphone"
  | "firewall";

export interface DeviceInterface {
  name: string;
  ip: string;
  subnet: string;
}

export interface Device {
  id: string;
  type: DeviceType;
  hostname: string;
  ip: string;
  subnetMask: string;
  gateway: string;
  x: number;
  y: number;
  interfaces: DeviceInterface[];
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  sourcePort: string;
  targetPort: string;
}

export interface SavedTopology {
  id: string;
  name: string;
  description: string;
  devices: Device[];
  connections: Connection[];
  savedAt: number;
}

export interface HopResult {
  deviceId: string;
  ip: string;
  hostname: string;
  rtt: number;
}

export interface PingResult {
  success: boolean;
  hops: HopResult[];
  totalRtt: number;
  error?: string;
  type: "ping" | "traceroute";
}

export interface PacketAnimState {
  active: boolean;
  path: string[];
  result: PingResult | null;
}

export type DeviceConfig = {
  color: string;
  bgColor: string;
  ports: string[];
  label: string;
  defaultIp: string;
};

export const DEVICE_SIZE = 68;

export const DEVICE_CONFIGS: Record<DeviceType, DeviceConfig> = {
  router: {
    color: "#4B9EFF",
    bgColor: "#0E2B5C",
    ports: ["Fa0/0", "Fa0/1", "Fa0/2", "Serial0/0"],
    label: "Router",
    defaultIp: "192.168.1.1",
  },
  switch: {
    color: "#22C55E",
    bgColor: "#0B3A1F",
    ports: [
      "Fa0/0",
      "Fa0/1",
      "Fa0/2",
      "Fa0/3",
      "Fa0/4",
      "Fa0/5",
      "Fa0/6",
      "Fa0/7",
      "Fa0/8",
      "Fa0/9",
      "Fa0/10",
      "Fa0/11",
      "Fa0/12",
      "Fa0/13",
      "Fa0/14",
      "Fa0/15",
      "Fa0/16",
      "Fa0/17",
      "Fa0/18",
      "Fa0/19",
      "Fa0/20",
      "Fa0/21",
      "Fa0/22",
      "Fa0/23",
    ],
    label: "Switch",
    defaultIp: "192.168.1.2",
  },
  hub: {
    color: "#F59E0B",
    bgColor: "#3A2000",
    ports: [
      "Port0",
      "Port1",
      "Port2",
      "Port3",
      "Port4",
      "Port5",
      "Port6",
      "Port7",
    ],
    label: "Hub",
    defaultIp: "0.0.0.0",
  },
  pc: {
    color: "#94A3B8",
    bgColor: "#1E2A3A",
    ports: ["Fa0"],
    label: "PC",
    defaultIp: "192.168.1.10",
  },
  server: {
    color: "#14B8A6",
    bgColor: "#0A2E2B",
    ports: ["Fa0"],
    label: "Server",
    defaultIp: "192.168.1.100",
  },
  smartphone: {
    color: "#A855F7",
    bgColor: "#2A1045",
    ports: ["Wlan0"],
    label: "Smartphone",
    defaultIp: "192.168.1.20",
  },
  firewall: {
    color: "#EF4444",
    bgColor: "#3A0808",
    ports: ["Fa0/0", "Fa0/1", "DMZ"],
    label: "Firewall",
    defaultIp: "10.0.0.1",
  },
};
