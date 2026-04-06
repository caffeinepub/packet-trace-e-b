export type DeviceType =
  | "router"
  | "switch"
  | "hub"
  | "pc"
  | "server"
  | "smartphone"
  | "firewall"
  | "access-point";

export interface DeviceInterface {
  name: string;
  ip: string;
  subnet: string;
}

export interface VlanConfig {
  id: number;
  name: string;
  ports: string[];
}

export interface AclRule {
  id: string;
  action: "permit" | "deny";
  protocol: "any" | "tcp" | "udp" | "icmp" | "ip";
  sourceIp: string;
  sourceMask: string;
  destIp: string;
  destMask: string;
  description: string;
}

export interface RoutingEntry {
  network: string;
  mask: string;
  nextHop: string;
  interface: string;
  protocol: "connected" | "static" | "rip" | "ospf";
  metric: number;
}

export interface DhcpPool {
  poolName: string;
  networkAddr: string;
  mask: string;
  defaultRouter: string;
  dnsServer: string;
  startIp: string;
  endIp: string;
  leaseTime: number;
  assignedIps: { ip: string; deviceId: string }[];
}

export interface DnsRecord {
  hostname: string;
  ip: string;
  type: "A" | "AAAA";
}

export interface NatConfig {
  insideInterface: string;
  outsideInterface: string;
  type: "static" | "dynamic" | "pat";
  translations: { insideIp: string; outsideIp: string }[];
}

export interface ServiceConfig {
  http: boolean;
  ftp: boolean;
  dhcp: boolean;
  dns: boolean;
  ospfEnabled: boolean;
  ripEnabled: boolean;
  ospfProcessId: number;
  ospfAreaId: number;
}

export interface CliHistoryEntry {
  input: string;
  output: string;
  timestamp: number;
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
  vlans?: VlanConfig[];
  aclRules?: AclRule[];
  routingTable?: RoutingEntry[];
  dhcpPools?: DhcpPool[];
  dnsRecords?: DnsRecord[];
  natConfig?: NatConfig;
  services?: ServiceConfig;
  cliHistory?: CliHistoryEntry[];
  ipv6Address?: string;
  ipv6Prefix?: number;
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  sourcePort: string;
  targetPort: string;
  cableTypeOverride?: "straight" | "crossover" | "serial";
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
  currentStep?: number;
}

export type SimulationMode = "realtime" | "simulation";

export type DeviceConfig = {
  color: string;
  bgColor: string;
  ports: string[];
  label: string;
  defaultIp: string;
};

export interface CableStatus {
  valid: boolean;
  cableType: "straight" | "crossover" | "serial" | "incompatible";
  speed: string;
  color: string;
}

export interface PacketLayerDetail {
  layer: string;
  fields: { label: string; value: string }[];
}

export interface PacketHopDetail {
  hop: number;
  fromDevice: string;
  toDevice: string;
  fromPort: string;
  toPort: string;
  timestamp: string;
  cableStatus: CableStatus;
  layers: PacketLayerDetail[];
  aclEvent?: string;
  natEvent?: string;
  serviceEvent?: string;
  vlanEvent?: string;
}

export interface DetailedPacketLog {
  hops: PacketHopDetail[];
  summary: string;
}

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
  "access-point": {
    color: "#8B5CF6",
    bgColor: "#2D1B69",
    ports: ["Fa0/0", "Wlan0", "Wlan1", "Wlan2", "Wlan3"],
    label: "Access Point",
    defaultIp: "192.168.1.254",
  },
};
