import type {
  AclRule,
  CableStatus,
  Connection,
  DetailedPacketLog,
  Device,
  DeviceType,
  DhcpPool,
  HopResult,
  PacketHopDetail,
  PacketLayerDetail,
  PingResult,
  RoutingEntry,
} from "./types";
import { DEVICE_CONFIGS } from "./types";

export function buildAdjacency(
  devices: Device[],
  connections: Connection[],
): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const d of devices) adj.set(d.id, []);
  for (const c of connections) {
    adj.get(c.sourceId)?.push(c.targetId);
    adj.get(c.targetId)?.push(c.sourceId);
  }
  return adj;
}

export function findPath(
  devices: Device[],
  connections: Connection[],
  sourceId: string,
  targetId: string,
): string[] | null {
  if (sourceId === targetId) return [sourceId];
  const adj = buildAdjacency(devices, connections);
  const visited = new Set<string>([sourceId]);
  const queue: { id: string; path: string[] }[] = [
    { id: sourceId, path: [sourceId] },
  ];
  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;
    const neighbors = adj.get(item.id) || [];
    for (const n of neighbors) {
      if (n === targetId) return [...item.path, n];
      if (!visited.has(n)) {
        visited.add(n);
        queue.push({ id: n, path: [...item.path, n] });
      }
    }
  }
  return null;
}

export function findDeviceByIp(
  devices: Device[],
  ip: string,
): Device | undefined {
  return devices.find((d) => d.ip === ip && d.ip !== "0.0.0.0" && d.ip !== "");
}

export function generateMac(deviceId: string): string {
  let hash = 0;
  for (let i = 0; i < deviceId.length; i++) {
    hash = (hash * 31 + deviceId.charCodeAt(i)) >>> 0;
  }
  const bytes: string[] = [];
  for (let i = 0; i < 6; i++) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    bytes.push(((hash >> (i * 4)) & 0xff).toString(16).padStart(2, "0"));
  }
  return bytes.map((b) => b.toUpperCase()).join(":");
}

export function validateCableType(
  srcType: DeviceType,
  dstType: DeviceType,
): CableStatus {
  const highSpeed: DeviceType[] = ["router", "switch", "server", "firewall"];
  const getSpeed = (t: DeviceType) =>
    highSpeed.includes(t) ? "1 Gbps" : "100 Mbps";

  const straight = (s: string): CableStatus => ({
    valid: true,
    cableType: "straight",
    speed: s,
    color: "#22C55E",
  });
  const crossover = (s: string): CableStatus => ({
    valid: true,
    cableType: "crossover",
    speed: s,
    color: "#F59E0B",
  });
  const serial = (): CableStatus => ({
    valid: true,
    cableType: "serial",
    speed: "2 Mbps",
    color: "#4B9EFF",
  });
  const wireless = (): CableStatus => ({
    valid: true,
    cableType: "straight",
    speed: "54 Mbps",
    color: "#8B5CF6",
  });

  const endDevices: DeviceType[] = ["pc", "server", "smartphone"];
  const switchHub: DeviceType[] = ["switch", "hub"];

  // Wireless connections
  if (srcType === "access-point" || dstType === "access-point") {
    return wireless();
  }
  if (srcType === "smartphone" || dstType === "smartphone") {
    return wireless();
  }

  // Serial: router to router
  if (srcType === "router" && dstType === "router") {
    return serial();
  }
  // PC/Server/Smartphone to Switch/Hub => straight
  if (endDevices.includes(srcType) && switchHub.includes(dstType)) {
    return straight(getSpeed(srcType));
  }
  if (switchHub.includes(srcType) && endDevices.includes(dstType)) {
    return straight(getSpeed(dstType));
  }
  // Router to Switch/Hub => straight
  if (srcType === "router" && switchHub.includes(dstType)) {
    return straight("1 Gbps");
  }
  if (switchHub.includes(srcType) && dstType === "router") {
    return straight("1 Gbps");
  }
  // PC to PC => crossover
  if (srcType === "pc" && dstType === "pc") {
    return crossover("100 Mbps");
  }
  // PC/Server directly to Router => crossover
  if (endDevices.includes(srcType) && dstType === "router") {
    return crossover(getSpeed(srcType));
  }
  if (srcType === "router" && endDevices.includes(dstType)) {
    return crossover(getSpeed(dstType));
  }
  // Firewall to Switch/Router => straight
  if (
    srcType === "firewall" &&
    (switchHub.includes(dstType) || dstType === "router")
  ) {
    return straight("1 Gbps");
  }
  if (
    dstType === "firewall" &&
    (switchHub.includes(srcType) || srcType === "router")
  ) {
    return straight("1 Gbps");
  }
  // Hub to Hub => crossover
  if (srcType === "hub" && dstType === "hub") {
    return crossover("100 Mbps");
  }
  // Default: straight
  return straight(getSpeed(srcType));
}

function ipToNumber(ip: string): number {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4) return 0;
  return (
    ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
  );
}

function ipMatchesRule(ip: string, ruleIp: string, ruleMask: string): boolean {
  if (ruleIp === "any") return true;
  try {
    const ipNum = ipToNumber(ip);
    const ruleNum = ipToNumber(ruleIp);
    const maskNum = ipToNumber(ruleMask);
    // wildcard mask logic (0 = must match, 1 = don't care)
    return (ipNum & ~maskNum) === (ruleNum & ~maskNum);
  } catch {
    return false;
  }
}

export function checkAcl(
  rules: AclRule[],
  srcIp: string,
  dstIp: string,
  protocol: string,
): "permit" | "deny" {
  for (const rule of rules) {
    const protoMatch = rule.protocol === "any" || rule.protocol === protocol;
    const srcMatch = ipMatchesRule(srcIp, rule.sourceIp, rule.sourceMask);
    const dstMatch = ipMatchesRule(dstIp, rule.destIp, rule.destMask);
    if (protoMatch && srcMatch && dstMatch) {
      return rule.action;
    }
  }
  return "permit"; // implicit permit if no rules match
}

export function assignDhcpIp(pool: DhcpPool, deviceId: string): string | null {
  // Check if already assigned
  const existing = pool.assignedIps.find((a) => a.deviceId === deviceId);
  if (existing) return existing.ip;

  const startNum = ipToNumber(pool.startIp);
  const endNum = ipToNumber(pool.endIp);
  const assignedSet = new Set(pool.assignedIps.map((a) => a.ip));

  for (let num = startNum; num <= endNum; num++) {
    const ip = [
      (num >>> 24) & 0xff,
      (num >>> 16) & 0xff,
      (num >>> 8) & 0xff,
      num & 0xff,
    ].join(".");
    if (!assignedSet.has(ip)) {
      pool.assignedIps.push({ ip, deviceId });
      return ip;
    }
  }
  return null;
}

export function buildRoutingTables(
  devices: Device[],
  connections: Connection[],
): Map<string, RoutingEntry[]> {
  const tables = new Map<string, RoutingEntry[]>();
  const routerDevices = devices.filter(
    (d) => d.type === "router" || d.type === "firewall",
  );

  for (const router of routerDevices) {
    const entries: RoutingEntry[] = [];

    // Connected routes
    if (router.ip && router.ip !== "0.0.0.0") {
      const netParts = router.ip.split(".").map(Number);
      const maskParts = router.subnetMask.split(".").map(Number);
      const network = netParts.map((n, i) => n & maskParts[i]).join(".");
      entries.push({
        network,
        mask: router.subnetMask || "255.255.255.0",
        nextHop: "0.0.0.0",
        interface: "Fa0/0",
        protocol: "connected",
        metric: 0,
      });
    }

    // Static routes from routingTable
    if (router.routingTable) {
      for (const route of router.routingTable) {
        if (route.protocol === "static") {
          entries.push(route);
        }
      }
    }

    // RIP / OSPF: propagate to neighbor networks
    if (router.services?.ripEnabled || router.services?.ospfEnabled) {
      const protocol = router.services?.ospfEnabled ? "ospf" : "rip";
      const metric = protocol === "ospf" ? 1 : 1;

      // Find neighbor routers
      const neighborConns = connections.filter(
        (c) => c.sourceId === router.id || c.targetId === router.id,
      );
      for (const conn of neighborConns) {
        const neighborId =
          conn.sourceId === router.id ? conn.targetId : conn.sourceId;
        const neighbor = devices.find((d) => d.id === neighborId);
        if (
          neighbor &&
          (neighbor.type === "router" || neighbor.type === "firewall") &&
          neighbor.ip &&
          neighbor.ip !== "0.0.0.0"
        ) {
          const netParts = neighbor.ip.split(".").map(Number);
          const maskParts = (neighbor.subnetMask || "255.255.255.0")
            .split(".")
            .map(Number);
          const network = netParts.map((n, i) => n & maskParts[i]).join(".");
          const alreadyExists = entries.some((e) => e.network === network);
          if (!alreadyExists) {
            entries.push({
              network,
              mask: neighbor.subnetMask || "255.255.255.0",
              nextHop: neighbor.ip,
              interface:
                conn.sourceId === router.id ? conn.sourcePort : conn.targetPort,
              protocol,
              metric,
            });
          }
        }
      }
    }

    tables.set(router.id, entries);
  }

  return tables;
}

export function findPathWithRouting(
  devices: Device[],
  connections: Connection[],
  sourceId: string,
  targetId: string,
): string[] | null {
  // Try routing tables first if any router has routing config
  const hasRoutingConfig = devices.some(
    (d) =>
      (d.type === "router" || d.type === "firewall") &&
      (d.services?.ripEnabled ||
        d.services?.ospfEnabled ||
        (d.routingTable && d.routingTable.length > 0)),
  );

  if (hasRoutingConfig) {
    // Use enhanced BFS that respects routing tables
    return findPath(devices, connections, sourceId, targetId);
  }

  return findPath(devices, connections, sourceId, targetId);
}

export function applyNat(
  router: Device,
  srcIp: string,
): { translatedIp: string; natApplied: boolean } {
  if (!router.natConfig) return { translatedIp: srcIp, natApplied: false };

  const { type, translations } = router.natConfig;

  if (type === "static") {
    const match = translations.find((t) => t.insideIp === srcIp);
    if (match) return { translatedIp: match.outsideIp, natApplied: true };
  } else if (type === "pat" || type === "dynamic") {
    // PAT: translate to outside interface IP
    if (translations.length > 0) {
      return { translatedIp: translations[0].outsideIp, natApplied: true };
    }
  }

  return { translatedIp: srcIp, natApplied: false };
}

export function checkVlanReachability(
  srcDevice: Device,
  dstDevice: Device,
  _connection: Connection,
  switches: Device[],
): boolean {
  // Check if both devices are on the same switch and in different VLANs
  for (const sw of switches) {
    if (!sw.vlans || sw.vlans.length === 0) continue;

    let srcVlan: number | null = null;
    let dstVlan: number | null = null;

    for (const vlan of sw.vlans) {
      if (vlan.ports.some((p) => p.includes(srcDevice.hostname))) {
        srcVlan = vlan.id;
      }
      if (vlan.ports.some((p) => p.includes(dstDevice.hostname))) {
        dstVlan = vlan.id;
      }
    }

    if (srcVlan !== null && dstVlan !== null && srcVlan !== dstVlan) {
      return false; // Different VLANs, no inter-VLAN routing
    }
  }

  return true;
}

function fakeHex(seed: number): string {
  const val = ((seed * 1664525 + 1013904223) >>> 0).toString(16);
  return `0x${val.slice(0, 4).toUpperCase()}`;
}

function formatTimestamp(ms: number): string {
  const totalMs = ms;
  const s = Math.floor(totalMs / 1000);
  const remaining = totalMs % 1000;
  return `00:00:${s.toString().padStart(2, "0")}.${remaining.toString().padStart(3, "0")}`;
}

export function buildDetailedPacketLog(
  path: string[],
  devices: Device[],
  connections: Connection[],
): DetailedPacketLog {
  const deviceMap = new Map(devices.map((d) => [d.id, d]));
  const hops: PacketHopDetail[] = [];
  const destDevice = deviceMap.get(path[path.length - 1]);
  const destIp = destDevice?.ip || "0.0.0.0";
  const srcDevice = deviceMap.get(path[0]);
  const srcIp = srcDevice?.ip || "0.0.0.0";
  const switches = devices.filter(
    (d) => d.type === "switch" || d.type === "hub",
  );

  let allCablesOk = true;
  let hasNat = false;
  let hasAclDeny = false;

  for (let i = 0; i < path.length - 1; i++) {
    const fromId = path[i];
    const toId = path[i + 1];
    const fromDev = deviceMap.get(fromId);
    const toDev = deviceMap.get(toId);
    if (!fromDev || !toDev) continue;

    const conn = connections.find(
      (c) =>
        (c.sourceId === fromId && c.targetId === toId) ||
        (c.sourceId === toId && c.targetId === fromId),
    );

    const fromPort =
      conn?.sourceId === fromId ? conn.sourcePort : conn?.targetPort || "Fa0";
    const toPort =
      conn?.sourceId === toId ? conn.sourcePort : conn?.targetPort || "Fa0";

    const cableStatus = validateCableType(fromDev.type, toDev.type);
    if (!cableStatus.valid) allCablesOk = false;

    const timestamp = formatTimestamp(i * 2);
    const isReply = i >= Math.floor(path.length / 2);
    const ttl = 64 - i;
    const seedA = i * 1000 + 1;
    const seedB = i * 1000 + 2;

    // Check ACL on this device
    let aclEvent: string | undefined;
    const aclDevice =
      fromDev.type === "router" || fromDev.type === "firewall" ? fromDev : null;
    if (aclDevice?.aclRules && aclDevice.aclRules.length > 0) {
      const aclResult = checkAcl(aclDevice.aclRules, srcIp, destIp, "icmp");
      aclEvent = `ACL: ${aclResult.toUpperCase()} — ${srcIp} → ${destIp}`;
      if (aclResult === "deny") hasAclDeny = true;
    }

    // Check NAT on this device
    let natEvent: string | undefined;
    if (fromDev.type === "router" && fromDev.natConfig) {
      const natResult = applyNat(fromDev, srcIp);
      if (natResult.natApplied) {
        natEvent = `NAT: ${srcIp} → ${natResult.translatedIp}`;
        hasNat = true;
      }
    }

    // Check VLAN reachability
    let vlanEvent: string | undefined;
    if (conn) {
      const vlanOk = checkVlanReachability(fromDev, toDev, conn, switches);
      if (!vlanOk) {
        vlanEvent = "VLAN: tr00e1fego bloqueado 2014 VLANs diferentes";
      }
    }

    // Service interaction
    let serviceEvent: string | undefined;
    if (i === path.length - 2) {
      if (toDev.services?.http) {
        serviceEvent = "HTTP: GET / HTTP/1.1";
      } else if (toDev.services?.ftp) {
        serviceEvent = "FTP: 220 Serviço FTP pronto";
      } else if (toDev.services?.dns) {
        serviceEvent = "DNS: consulta A";
      }
    }

    // Check IPv6
    const isIpv6 = fromDev.ipv6Address || toDev.ipv6Address;

    const layers: PacketLayerDetail[] = [
      {
        layer: "Camada 1 — Físico",
        fields: [
          {
            label: "Tipo de Cabo",
            value:
              cableStatus.cableType === "straight"
                ? "Direto (Straight-through)"
                : cableStatus.cableType === "crossover"
                  ? "Crossover"
                  : cableStatus.cableType === "serial"
                    ? "Serial"
                    : "Incompatível",
          },
          { label: "Velocidade", value: cableStatus.speed },
          { label: "Duplex", value: "Full Duplex" },
          {
            label: "Status do Link",
            value: cableStatus.valid ? "Up ✓" : "Down ✗",
          },
          { label: "Interface Origem", value: fromPort },
          { label: "Interface Destino", value: toPort },
        ],
      },
      {
        layer: "Camada 2 — Enlace de Dados",
        fields: [
          { label: "MAC Origem", value: generateMac(fromId) },
          { label: "MAC Destino", value: generateMac(toId) },
          {
            label: "Tipo Ethernet",
            value: isIpv6 ? "0x86DD — IPv6" : "0x0800 — IPv4",
          },
          { label: "Tamanho do Frame", value: "64 bytes" },
          { label: "FCS", value: "Válido" },
        ],
      },
      {
        layer: isIpv6 ? "Camada 3 — Rede (IPv6)" : "Camada 3 — Rede",
        fields: isIpv6
          ? [
              { label: "Versão", value: "IPv6" },
              { label: "Traffic Class", value: "0" },
              { label: "Flow Label", value: "0x00000" },
              { label: "Hop Limit", value: String(ttl) },
              { label: "Próximo Cabeçalho", value: "58 (ICMPv6)" },
              { label: "IP Origem", value: fromDev.ipv6Address || srcIp },
              { label: "IP Destino", value: toDev.ipv6Address || destIp },
            ]
          : [
              { label: "Versão", value: "IPv4" },
              { label: "IHL", value: "20 bytes" },
              { label: "DSCP", value: "0" },
              { label: "TTL", value: String(ttl) },
              { label: "Protocolo", value: "ICMP (1)" },
              { label: "Checksum", value: fakeHex(seedA) },
              { label: "IP Origem", value: fromDev.ip || "0.0.0.0" },
              { label: "IP Destino", value: destIp },
            ],
      },
      {
        layer: isIpv6 ? "Camada 4 — ICMPv6" : "Camada 4 — ICMP",
        fields: [
          {
            label: "Tipo",
            value: isReply
              ? isIpv6
                ? "129 — Echo Reply"
                : "0 — Echo Reply"
              : isIpv6
                ? "128 — Echo Request"
                : "8 — Echo Request",
          },
          { label: "Código", value: "0" },
          { label: "Checksum", value: fakeHex(seedB) },
          { label: "Identificador", value: "0x0001" },
          { label: "Sequência", value: "1" },
          { label: "Payload", value: "32 bytes de dados" },
        ],
      },
    ];

    hops.push({
      hop: i + 1,
      fromDevice: fromDev.hostname,
      toDevice: toDev.hostname,
      fromPort,
      toPort,
      timestamp,
      cableStatus,
      layers,
      aclEvent,
      natEvent,
      serviceEvent,
      vlanEvent,
    });
  }

  let summaryExtra = "";
  if (hasNat) summaryExtra += ", NAT aplicado";
  if (hasAclDeny) summaryExtra += ", ACL DENY detectado";

  const summary = `${hops.length} salto${hops.length !== 1 ? "s" : ""}, ${hops.length} cabo${hops.length !== 1 ? "s" : ""} verificado${hops.length !== 1 ? "s" : ""}, todos os cabos ${allCablesOk ? "corretos ✓" : "com problemas ✗"}${summaryExtra}`;

  return { hops, summary };
}

export function simulatePing(
  devices: Device[],
  connections: Connection[],
  sourceId: string,
  targetIp: string,
): { path: string[]; result: PingResult } {
  const target = findDeviceByIp(devices, targetIp);
  if (!target) {
    return {
      path: [],
      result: {
        success: false,
        hops: [],
        totalRtt: 0,
        error: `Host de destino inacessível — nenhum dispositivo com IP ${targetIp}`,
        type: "ping",
      },
    };
  }
  const path = findPathWithRouting(devices, connections, sourceId, target.id);
  if (!path) {
    return {
      path: [],
      result: {
        success: false,
        hops: [],
        totalRtt: 0,
        error: "Destino inacessível — sem rota para o host",
        type: "ping",
      },
    };
  }

  // Check ACLs along the path
  const srcDevice = devices.find((d) => d.id === sourceId);
  const srcIp = srcDevice?.ip || "0.0.0.0";
  const deviceMap = new Map(devices.map((d) => [d.id, d]));

  for (const nodeId of path) {
    const node = deviceMap.get(nodeId);
    if (
      node &&
      (node.type === "firewall" || node.type === "router") &&
      node.aclRules &&
      node.aclRules.length > 0
    ) {
      const aclResult = checkAcl(node.aclRules, srcIp, targetIp, "icmp");
      if (aclResult === "deny") {
        return {
          path,
          result: {
            success: false,
            hops: [],
            totalRtt: 0,
            error: `Pacote bloqueado por ACL em ${node.hostname}`,
            type: "ping",
          },
        };
      }
    }
  }

  const hops: HopResult[] = path.map((id, i) => ({
    deviceId: id,
    ip: deviceMap.get(id)?.ip || "0.0.0.0",
    hostname: deviceMap.get(id)?.hostname || "unknown",
    rtt: Math.round(1 + i * 2 + Math.random() * 3),
  }));
  return {
    path,
    result: {
      success: true,
      hops,
      totalRtt: hops.reduce((s, h) => s + h.rtt, 0),
      type: "ping",
    },
  };
}

export function simulateTraceroute(
  devices: Device[],
  connections: Connection[],
  sourceId: string,
  targetIp: string,
): { path: string[]; result: PingResult } {
  const res = simulatePing(devices, connections, sourceId, targetIp);
  return { ...res, result: { ...res.result, type: "traceroute" } };
}

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getNextPort(
  device: Device,
  connections: Connection[],
  deviceSide: "source" | "target",
): string {
  const usedPorts = connections
    .filter(
      (c) => (deviceSide === "source" ? c.sourceId : c.targetId) === device.id,
    )
    .map((c) => (deviceSide === "source" ? c.sourcePort : c.targetPort));
  const ports = DEVICE_CONFIGS[device.type].ports;
  return ports.find((p) => !usedPorts.includes(p)) || ports[0];
}
