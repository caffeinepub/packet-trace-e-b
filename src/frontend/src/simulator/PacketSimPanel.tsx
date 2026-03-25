import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Play,
  Route,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { simulatePing, simulateTraceroute } from "./engine";
import type { Connection, Device, PingResult } from "./types";

interface PacketSimPanelProps {
  sourceDevice: Device | null;
  devices: Device[];
  connections: Connection[];
  isAnimating: boolean;
  lastResult: PingResult | null;
  onStartSim: (path: string[], result: PingResult) => void;
}

export function PacketSimPanel({
  sourceDevice,
  devices,
  connections,
  isAnimating,
  lastResult,
  onStartSim,
}: PacketSimPanelProps) {
  const [targetIp, setTargetIp] = useState("");
  const [mode, setMode] = useState<"ping" | "traceroute">("ping");
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(!isMobile);

  // Expand automatically when a result arrives on mobile
  useEffect(() => {
    if (lastResult && isMobile) setExpanded(true);
  }, [lastResult, isMobile]);

  const handleRun = () => {
    if (!sourceDevice || !targetIp.trim()) return;
    const sim =
      mode === "ping"
        ? simulatePing(devices, connections, sourceDevice.id, targetIp.trim())
        : simulateTraceroute(
            devices,
            connections,
            sourceDevice.id,
            targetIp.trim(),
          );
    onStartSim(sim.path, sim.result);
  };

  const canRun = !!sourceDevice && !!targetIp.trim() && !isAnimating;

  return (
    <div
      data-ocid="pkt.panel"
      className="border-t border-border bg-card shrink-0"
    >
      {/* Header — always visible, acts as collapse toggle on mobile */}
      <div className="px-4 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Simulação de Pacote
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-ocid="pkt.ping.tab"
            onClick={() => setMode("ping")}
            className={`text-xs px-2 py-0.5 rounded transition-colors ${
              mode === "ping"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Ping
          </button>
          <button
            type="button"
            data-ocid="pkt.traceroute.tab"
            onClick={() => setMode("traceroute")}
            className={`text-xs px-2 py-0.5 rounded transition-colors ${
              mode === "traceroute"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Traceroute
          </button>
          {/* Collapse toggle — mobile only */}
          <button
            type="button"
            data-ocid="pkt.toggle"
            onClick={() => setExpanded((p) => !p)}
            className="md:hidden ml-1 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
            aria-label={expanded ? "Recolher painel" : "Expandir painel"}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Collapsible body */}
      {expanded && (
        <div className="p-3 space-y-3 max-h-56 md:max-h-none overflow-y-auto">
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground w-12 shrink-0">
              Origem:
            </div>
            <div className="text-xs font-mono text-foreground">
              {sourceDevice
                ? `${sourceDevice.hostname} (${sourceDevice.ip || "no ip"})`
                : "Selecione um dispositivo"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground w-12 shrink-0">
              Destino:
            </div>
            <Input
              data-ocid="pkt.input"
              value={targetIp}
              onChange={(e) => setTargetIp(e.target.value)}
              placeholder="IP ex: 192.168.1.1"
              className="h-7 text-xs font-mono"
              onKeyDown={(e) => e.key === "Enter" && canRun && handleRun()}
            />
          </div>

          {devices.filter(
            (d) => d.id !== sourceDevice?.id && d.ip && d.ip !== "0.0.0.0",
          ).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {devices
                .filter(
                  (d) =>
                    d.id !== sourceDevice?.id && d.ip && d.ip !== "0.0.0.0",
                )
                .slice(0, 6)
                .map((d) => (
                  <button
                    type="button"
                    key={d.id}
                    onClick={() => setTargetIp(d.ip)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-secondary hover:bg-accent font-mono text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {d.ip}
                  </button>
                ))}
            </div>
          )}

          <Button
            data-ocid="pkt.primary_button"
            onClick={handleRun}
            disabled={!canRun}
            size="sm"
            className="w-full h-7 text-xs"
          >
            {isAnimating ? (
              <>
                <Loader2
                  size={12}
                  className="mr-1 animate-spin"
                  aria-hidden="true"
                />{" "}
                Simulando...
              </>
            ) : mode === "ping" ? (
              <>
                <Play size={12} className="mr-1" aria-hidden="true" /> Executar
                Ping
              </>
            ) : (
              <>
                <Route size={12} className="mr-1" aria-hidden="true" /> Executar
                Traceroute
              </>
            )}
          </Button>

          {lastResult && !isAnimating && (
            <div
              data-ocid={
                lastResult.success ? "pkt.success_state" : "pkt.error_state"
              }
              className={`rounded-lg border p-2.5 text-xs font-mono ${
                lastResult.success
                  ? "border-green-500/30 bg-green-500/10"
                  : "border-destructive/30 bg-destructive/10"
              }`}
            >
              <div
                className={`flex items-center gap-1.5 font-semibold mb-1.5 ${
                  lastResult.success ? "text-green-400" : "text-destructive"
                }`}
              >
                {lastResult.success ? (
                  <CheckCircle size={12} aria-hidden="true" />
                ) : (
                  <XCircle size={12} aria-hidden="true" />
                )}
                {lastResult.success
                  ? `${
                      lastResult.type === "ping" ? "Ping" : "Traceroute"
                    } bem-sucedido — ${lastResult.totalRtt}ms`
                  : lastResult.error}
              </div>
              {lastResult.success && (
                <ScrollArea className="max-h-24">
                  <div className="space-y-0.5">
                    {lastResult.hops.map((hop, i) => (
                      <div
                        key={hop.deviceId}
                        className="flex items-center gap-2 text-muted-foreground"
                      >
                        <span className="w-4 text-right">{i + 1}</span>
                        <span className="text-foreground">{hop.ip}</span>
                        <span className="text-xs opacity-70">
                          {hop.hostname}
                        </span>
                        <span className="ml-auto">{hop.rtt}ms</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
