import { motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { DeviceIcon } from "./DeviceIcon";
import type { Connection, Device, PacketAnimState } from "./types";
import { DEVICE_CONFIGS, DEVICE_SIZE } from "./types";

interface SimulatorCanvasProps {
  devices: Device[];
  connections: Connection[];
  selectedDeviceId: string | null;
  connectMode: boolean;
  connectSourceId: string | null;
  packetAnim: PacketAnimState | null;
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

export function SimulatorCanvas({
  devices,
  connections,
  selectedDeviceId,
  connectMode,
  connectSourceId,
  packetAnim,
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

  // Auto-fit devices on first render
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
            return (
              <line
                key={c.id}
                x1={src.x}
                y1={src.y}
                x2={dst.x}
                y2={dst.y}
                stroke="oklch(0.45 0.04 250)"
                strokeWidth={2}
              />
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
          {packetAnim?.active && packetPathPoints.length >= 2 && (
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
          {connections.map((c) => {
            const src = getDeviceCenter(c.sourceId);
            const dst = getDeviceCenter(c.targetId);
            return (
              <text
                key={`label-${c.id}`}
                x={(src.x + dst.x) / 2}
                y={(src.y + dst.y) / 2 - 5}
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
          const borderColor =
            isSelected || isConnectSource ? cfg.color : `${cfg.color}55`;
          const boxShadow = isSelected
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
                zIndex: isSelected ? 10 : 1,
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
    </div>
  );
}
