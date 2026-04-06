import { motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { DeviceIcon } from "./DeviceIcon";
import { validateCableType } from "./engine";
import type {
  Connection,
  Device,
  PacketAnimState,
  SimulationMode,
} from "./types";
import { DEVICE_CONFIGS, DEVICE_SIZE } from "./types";

interface SimulatorCanvasProps {
  devices: Device[];
  connections: Connection[];
  selectedDeviceId: string | null;
  connectMode: boolean;
  connectSourceId: string | null;
  packetAnim: PacketAnimState | null;
  simulationMode: SimulationMode;
  currentSimStep: number;
  onDeviceSelect: (id: string | null) => void;
  onDeviceMove: (id: string, x: number, y: number) => void;
  onConnect: (sourceId: string, targetId: string) => void;
  onAnimationComplete: () => void;
}

const WORLD_W = 3000;
const WORLD_H = 2000;

function fitDevicesToView(devices: Device[], viewW: number, viewH: number) {
  if (devices.length === 0) return { zoom: 0.7, pan: { x: 30, y: 50 } };
  const pad = 56;
  const minX = Math.min(...devices.map((d) => d.x));
  const maxX = Math.max(...devices.map((d) => d.x + DEVICE_SIZE));
  const minY = Math.min(...devices.map((d) => d.y));
  const maxY = Math.max(...devices.map((d) => d.y + DEVICE_SIZE + 20));
  const cw = maxX - minX;
  const ch = maxY - minY;
  const zoom = Math.max(
    0.3,
    Math.min(1.4, Math.min((viewW - pad * 2) / cw, (viewH - pad * 2) / ch)),
  );
  return {
    zoom,
    pan: {
      x: pad - minX * zoom + (viewW - pad * 2 - cw * zoom) / 2,
      y: pad - minY * zoom + (viewH - pad * 2 - ch * zoom) / 2,
    },
  };
}

function isWirelessConnection(
  conn: Connection,
  devices: Map<string, Device>,
): boolean {
  const src = devices.get(conn.sourceId);
  const dst = devices.get(conn.targetId);
  if (!src || !dst) return false;
  if (src.type === "access-point" || dst.type === "access-point") return true;
  if (src.type === "smartphone" || dst.type === "smartphone") return true;
  if (conn.sourcePort.toLowerCase().includes("wlan")) return true;
  if (conn.targetPort.toLowerCase().includes("wlan")) return true;
  return false;
}

export function SimulatorCanvas({
  devices,
  connections,
  selectedDeviceId,
  connectMode,
  connectSourceId,
  packetAnim,
  simulationMode,
  currentSimStep,
  onDeviceSelect,
  onDeviceMove,
  onConnect,
  onAnimationComplete,
}: SimulatorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 30, y: 50 });
  const [zoom, setZoom] = useState(0.7);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const fittedRef = useRef(false);

  const dragRef = useRef<{
    type: "device" | "canvas";
    deviceId?: string;
    startScreenX: number;
    startScreenY: number;
    startDeviceX?: number;
    startDeviceY?: number;
    startPanX?: number;
    startPanY?: number;
    hasMoved: boolean;
  } | null>(null);

  const pinchRef = useRef<{ pointerId: number; x: number; y: number }[]>([]);
  const lastPinchDist = useRef(0);

  useLayoutEffect(() => {
    if (fittedRef.current || devices.length === 0) return;
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    const fit = fitDevicesToView(devices, width, height);
    setZoom(fit.zoom);
    setPan(fit.pan);
    fittedRef.current = true;
  }, [devices]);

  const screenToWorld = useCallback(
    (sx: number, sy: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (sx - rect.left - pan.x) / zoom,
        y: (sy - rect.top - pan.y) / zoom,
      };
    },
    [pan, zoom],
  );

  const getDeviceCenter = useCallback(
    (id: string) => {
      const d = devices.find((dev) => dev.id === id);
      if (!d) return { x: 0, y: 0 };
      return { x: d.x + DEVICE_SIZE / 2, y: d.y + DEVICE_SIZE / 2 };
    },
    [devices],
  );

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.3, Math.min(2.5, zoom * factor));
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setPan((p) => ({
        x: cx - (cx - p.x) * (newZoom / zoom),
        y: cy - (cy - p.y) * (newZoom / zoom),
      }));
      setZoom(newZoom);
    },
    [zoom],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, deviceId?: string) => {
      pinchRef.current = pinchRef.current.filter(
        (p) => p.pointerId !== e.pointerId,
      );
      pinchRef.current.push({
        pointerId: e.pointerId,
        x: e.clientX,
        y: e.clientY,
      });
      if (pinchRef.current.length === 2) {
        const [a, b] = pinchRef.current;
        lastPinchDist.current = Math.hypot(b.x - a.x, b.y - a.y);
        return;
      }
      if (deviceId) {
        const d = devices.find((dev) => dev.id === deviceId);
        if (!d) return;
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        dragRef.current = {
          type: "device",
          deviceId,
          startScreenX: e.clientX,
          startScreenY: e.clientY,
          startDeviceX: d.x,
          startDeviceY: d.y,
          hasMoved: false,
        };
      } else {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        dragRef.current = {
          type: "canvas",
          startScreenX: e.clientX,
          startScreenY: e.clientY,
          startPanX: pan.x,
          startPanY: pan.y,
          hasMoved: false,
        };
      }
    },
    [devices, pan],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const idx = pinchRef.current.findIndex(
        (p) => p.pointerId === e.pointerId,
      );
      if (idx >= 0)
        pinchRef.current[idx] = {
          pointerId: e.pointerId,
          x: e.clientX,
          y: e.clientY,
        };

      if (pinchRef.current.length === 2) {
        const [a, b] = pinchRef.current;
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        if (lastPinchDist.current > 0) {
          const factor = dist / lastPinchDist.current;
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            const cx = (a.x + b.x) / 2 - rect.left;
            const cy = (a.y + b.y) / 2 - rect.top;
            setZoom((z) => {
              const newZ = Math.max(0.3, Math.min(2.5, z * factor));
              setPan((p) => ({
                x: cx - (cx - p.x) * (newZ / z),
                y: cy - (cy - p.y) * (newZ / z),
              }));
              return newZ;
            });
          }
        }
        lastPinchDist.current = dist;
        return;
      }

      if (!dragRef.current) {
        setMousePos(screenToWorld(e.clientX, e.clientY));
        return;
      }
      const dx = e.clientX - dragRef.current.startScreenX;
      const dy = e.clientY - dragRef.current.startScreenY;
      if (Math.hypot(dx, dy) > 3) dragRef.current.hasMoved = true;

      if (dragRef.current.type === "device" && dragRef.current.deviceId) {
        onDeviceMove(
          dragRef.current.deviceId,
          Math.max(0, (dragRef.current.startDeviceX ?? 0) + dx / zoom),
          Math.max(0, (dragRef.current.startDeviceY ?? 0) + dy / zoom),
        );
      } else if (dragRef.current.type === "canvas") {
        setPan({
          x: (dragRef.current.startPanX ?? 0) + dx,
          y: (dragRef.current.startPanY ?? 0) + dy,
        });
      }
    },
    [zoom, onDeviceMove, screenToWorld],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent, deviceId?: string) => {
      pinchRef.current = pinchRef.current.filter(
        (p) => p.pointerId !== e.pointerId,
      );
      lastPinchDist.current = 0;
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag) return;
      if (!drag.hasMoved) {
        if (deviceId) {
          if (connectMode) {
            if (!connectSourceId) onDeviceSelect(deviceId);
            else if (connectSourceId !== deviceId)
              onConnect(connectSourceId, deviceId);
          } else {
            onDeviceSelect(deviceId === selectedDeviceId ? null : deviceId);
          }
        } else {
          onDeviceSelect(null);
        }
      }
    },
    [connectMode, connectSourceId, selectedDeviceId, onDeviceSelect, onConnect],
  );

  const packetPathPoints =
    packetAnim?.path.map((id) => getDeviceCenter(id)) ?? [];
  const packetXs = packetPathPoints.map((p) => p.x);
  const packetYs = packetPathPoints.map((p) => p.y);
  const connectSource = connectSourceId
    ? devices.find((d) => d.id === connectSourceId)
    : null;

  const deviceMap = new Map(devices.map((d) => [d.id, d]));

  // Build active path segment set
  const activeSegments = new Set<string>();
  if (packetAnim?.active && packetAnim.path.length >= 2) {
    for (let i = 0; i < packetAnim.path.length - 1; i++) {
      const a = packetAnim.path[i];
      const b = packetAnim.path[i + 1];
      activeSegments.add(`${a}|${b}`);
      activeSegments.add(`${b}|${a}`);
    }
  }

  // In simulation mode, highlight only current step segment
  const currentStepSegments = new Set<string>();
  if (
    simulationMode === "simulation" &&
    packetAnim?.path &&
    currentSimStep > 0
  ) {
    const stepIdx = currentSimStep - 1;
    if (stepIdx < packetAnim.path.length - 1) {
      const a = packetAnim.path[stepIdx];
      const b = packetAnim.path[stepIdx + 1];
      currentStepSegments.add(`${a}|${b}`);
      currentStepSegments.add(`${b}|${a}`);
    }
  }

  return (
    <div
      ref={containerRef}
      data-ocid="canvas.canvas_target"
      className="relative flex-1 overflow-hidden bg-background select-none"
      style={{
        cursor: connectMode ? "crosshair" : "default",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
      onPointerDown={(e) => handlePointerDown(e)}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => handlePointerUp(e)}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.07 }}
      >
        <defs>
          <pattern
            id="grid"
            width={40 * zoom}
            height={40 * zoom}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x % (40 * zoom)},${pan.y % (40 * zoom)})`}
          >
            <path
              d={`M ${40 * zoom} 0 L 0 0 0 ${40 * zoom}`}
              fill="none"
              stroke="#A9B3C2"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Simulation mode indicator */}
      {simulationMode === "simulation" && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-amber-500/20 border border-amber-500/50 text-amber-400 text-[10px] font-mono px-2 py-1 rounded">
          🔴 MODO SIMULAÇÃO
        </div>
      )}

      <div
        className="absolute"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          width: WORLD_W,
          height: WORLD_H,
        }}
      >
        <svg
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          width={WORLD_W}
          height={WORLD_H}
          style={{ overflow: "visible" }}
        >
          {connections.map((c) => {
            const src = getDeviceCenter(c.sourceId);
            const dst = getDeviceCenter(c.targetId);
            const srcDev = deviceMap.get(c.sourceId);
            const dstDev = deviceMap.get(c.targetId);
            const cableStatus =
              srcDev && dstDev
                ? validateCableType(srcDev.type, dstDev.type)
                : null;
            const overrideColor =
              c.cableTypeOverride === "straight"
                ? "#22C55E"
                : c.cableTypeOverride === "crossover"
                  ? "#F59E0B"
                  : c.cableTypeOverride === "serial"
                    ? "#4B9EFF"
                    : null;

            const isWifi = isWirelessConnection(c, deviceMap);
            const wifiColor = "#8B5CF6";
            const strokeColor = isWifi
              ? wifiColor
              : (overrideColor ?? cableStatus?.color ?? "#4B6A9B");

            const midX = (src.x + dst.x) / 2;
            const midY = (src.y + dst.y) / 2;
            const isActive =
              activeSegments.has(`${c.sourceId}|${c.targetId}`) ||
              activeSegments.has(`${c.targetId}|${c.sourceId}`);
            const isCurrentStep =
              currentStepSegments.has(`${c.sourceId}|${c.targetId}`) ||
              currentStepSegments.has(`${c.targetId}|${c.sourceId}`);

            return (
              <g key={c.id}>
                <line
                  x1={src.x}
                  y1={src.y}
                  x2={dst.x}
                  y2={dst.y}
                  stroke={isCurrentStep ? "#FFD700" : strokeColor}
                  strokeWidth={isCurrentStep ? 4 : isActive ? 3 : 2.5}
                  strokeOpacity={isActive || isCurrentStep ? 1 : 0.8}
                  strokeDasharray={isWifi ? "8,5" : undefined}
                />
                {!isWifi && (
                  <circle
                    cx={midX}
                    cy={midY}
                    r={4}
                    fill={cableStatus?.valid ? "#22C55E" : "#EF4444"}
                  >
                    <title>
                      Cabo{" "}
                      {cableStatus?.cableType === "straight"
                        ? "Direto"
                        : cableStatus?.cableType === "crossover"
                          ? "Crossover"
                          : cableStatus?.cableType === "serial"
                            ? "Serial"
                            : "Incompatível"}{" "}
                      — {cableStatus?.speed} —{" "}
                      {cableStatus?.valid ? "Correto" : "Incorreto"}
                    </title>
                  </circle>
                )}
                {isWifi && (
                  <text
                    x={midX}
                    y={midY - 2}
                    textAnchor="middle"
                    fill={wifiColor}
                    fontSize={9}
                    fontFamily="monospace"
                    opacity={0.8}
                  >
                    WiFi
                  </text>
                )}
              </g>
            );
          })}

          {connectMode && connectSource && (
            <line
              x1={connectSource.x + DEVICE_SIZE / 2}
              y1={connectSource.y + DEVICE_SIZE / 2}
              x2={mousePos.x}
              y2={mousePos.y}
              stroke="oklch(0.68 0.19 45 / 0.6)"
              strokeWidth={2}
              strokeDasharray="6,4"
            />
          )}

          {/* Main packet ball animation - only in realtime mode */}
          {packetAnim?.active &&
            simulationMode === "realtime" &&
            packetPathPoints.length >= 2 && (
              <motion.circle
                r={8}
                fill="#F47A2A"
                stroke="#fff"
                strokeWidth={2}
                initial={{ cx: packetXs[0], cy: packetYs[0] }}
                animate={{ cx: packetXs, cy: packetYs }}
                transition={{
                  duration: Math.max(1, packetAnim.path.length) * 0.6,
                  ease: "linear",
                }}
                onAnimationComplete={onAnimationComplete}
              />
            )}

          {/* Per-cable traveling dots when active - realtime mode */}
          {packetAnim?.active &&
            simulationMode === "realtime" &&
            packetAnim.path.length >= 2 &&
            packetAnim.path.slice(0, -1).map((srcId, i) => {
              const dstId = packetAnim.path[i + 1];
              const src = getDeviceCenter(srcId);
              const dst = getDeviceCenter(dstId);
              const totalDuration = Math.max(1, packetAnim.path.length) * 0.6;
              const segDuration = totalDuration / (packetAnim.path.length - 1);
              return (
                <motion.circle
                  key={`seg-${srcId}-${dstId}`}
                  r={5}
                  fill="#FB923C"
                  stroke="#fff"
                  strokeWidth={1.5}
                  initial={{ cx: src.x, cy: src.y, opacity: 0 }}
                  animate={{
                    cx: [src.x, dst.x],
                    cy: [src.y, dst.y],
                    opacity: [1, 1, 0],
                  }}
                  transition={{
                    duration: segDuration,
                    delay: i * segDuration,
                    ease: "linear",
                  }}
                />
              );
            })}

          {/* Simulation mode: show packet at current step */}
          {simulationMode === "simulation" &&
            currentSimStep > 0 &&
            packetAnim?.path &&
            (() => {
              const stepIdx = currentSimStep - 1;
              if (stepIdx >= packetAnim.path.length) return null;
              const pos = getDeviceCenter(packetAnim.path[stepIdx]);
              return (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={10}
                  fill="#F47A2A"
                  stroke="#FFD700"
                  strokeWidth={2.5}
                />
              );
            })()}

          {connections.map((c) => {
            const src = getDeviceCenter(c.sourceId);
            const dst = getDeviceCenter(c.targetId);
            return (
              <text
                key={`label-${c.id}`}
                x={(src.x + dst.x) / 2}
                y={(src.y + dst.y) / 2 - 8}
                textAnchor="middle"
                fill="oklch(0.6 0.02 250)"
                fontSize={9}
                fontFamily="monospace"
              >
                {c.sourcePort}↔{c.targetPort}
              </text>
            );
          })}
        </svg>

        {devices.map((device) => {
          const cfg = DEVICE_CONFIGS[device.type];
          const isSelected = device.id === selectedDeviceId;
          const isConnectSource = device.id === connectSourceId;
          // Highlight current step device
          const isCurrentStepDevice =
            simulationMode === "simulation" &&
            currentSimStep > 0 &&
            packetAnim?.path &&
            packetAnim.path[currentSimStep - 1] === device.id;
          const borderColor = isCurrentStepDevice
            ? "#FFD700"
            : isSelected || isConnectSource
              ? cfg.color
              : `${cfg.color}55`;
          const boxShadow = isCurrentStepDevice
            ? "0 0 0 3px #FFD70066, 0 4px 20px #FFD70033"
            : isSelected
              ? `0 0 0 3px ${cfg.color}44, 0 4px 20px ${cfg.color}33`
              : isConnectSource
                ? "0 0 0 3px oklch(0.68 0.19 45 / 0.5)"
                : "0 2px 8px rgba(0,0,0,0.5)";
          return (
            <div
              key={device.id}
              data-ocid="canvas.device.button"
              style={{
                position: "absolute",
                left: device.x,
                top: device.y,
                width: DEVICE_SIZE,
                height: DEVICE_SIZE,
                cursor: connectMode ? "pointer" : "grab",
                touchAction: "none",
                zIndex: isSelected || isCurrentStepDevice ? 10 : 1,
              }}
              onPointerDown={(e) => handlePointerDown(e, device.id)}
              onPointerUp={(e) => handlePointerUp(e, device.id)}
            >
              <div
                className="relative w-full h-full flex flex-col items-center justify-center rounded-xl transition-all"
                style={{
                  backgroundColor: cfg.bgColor,
                  border: `2px solid ${borderColor}`,
                  boxShadow,
                }}
              >
                <DeviceIcon type={device.type} size={26} />
              </div>
              <div
                className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono"
                style={{ color: cfg.color }}
              >
                {device.hostname}
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-4 right-4 text-[11px] text-muted-foreground bg-card/80 px-2 py-1 rounded font-mono">
        {Math.round(zoom * 100)}%
      </div>

      {/* Cable legend */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1 bg-card/80 px-2 py-1.5 rounded text-[10px] font-mono">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-[#22C55E]" />
          <span className="text-muted-foreground">Direto</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-[#F59E0B]" />
          <span className="text-muted-foreground">Crossover</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-[#4B9EFF]" />
          <span className="text-muted-foreground">Serial</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 border-t-2 border-dashed border-[#8B5CF6]" />
          <span className="text-muted-foreground">WiFi</span>
        </div>
      </div>
    </div>
  );
}
