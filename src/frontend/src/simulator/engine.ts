import type { Connection, Device, HopResult, PingResult } from "./types";
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
        error: `Destination host unreachable — no device with IP ${targetIp}`,
        type: "ping",
      },
    };
  }
  const path = findPath(devices, connections, sourceId, target.id);
  if (!path) {
    return {
      path: [],
      result: {
        success: false,
        hops: [],
        totalRtt: 0,
        error: "Destination unreachable — no route to host",
        type: "ping",
      },
    };
  }
  const deviceMap = new Map(devices.map((d) => [d.id, d]));
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
