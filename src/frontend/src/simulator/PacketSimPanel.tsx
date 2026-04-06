import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Package,
  Play,
  Route,
  SkipForward,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  buildDetailedPacketLog,
  simulatePing,
  simulateTraceroute,
} from "./engine";
import type {
  Connection,
  DetailedPacketLog,
  Device,
  PacketHopDetail,
  PingResult,
  SimulationMode,
} from "./types";

interface PacketSimPanelProps {
  sourceDevice: Device | null;
  devices: Device[];
  connections: Connection[];
  isAnimating: boolean;
  lastResult: PingResult | null;
  simulationMode: SimulationMode;
  currentSimStep: number;
  simPaused: boolean;
  onStartSim: (path: string[], result: PingResult) => void;
  onNextStep: () => void;
}

export function PacketSimPanel({
  sourceDevice,
  devices,
  connections,
  isAnimating,
  lastResult,
  simulationMode,
  currentSimStep,
  simPaused,
  onStartSim,
  onNextStep,
}: PacketSimPanelProps) {
  const [targetIp, setTargetIp] = useState("");
  const [mode, setMode] = useState<"ping" | "traceroute">("ping");
  const [ipVersion, setIpVersion] = useState<"ipv4" | "ipv6">("ipv4");
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(!isMobile);
  const [showDetails, setShowDetails] = useState(false);
  const [detailedLog, setDetailedLog] = useState<DetailedPacketLog | null>(
    null,
  );
  const prevSourceIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastResult && isMobile) setExpanded(true);
  }, [lastResult, isMobile]);

  // Reset detail log when source device changes
  const currentSourceId = sourceDevice?.id ?? null;
  if (prevSourceIdRef.current !== currentSourceId) {
    prevSourceIdRef.current = currentSourceId;
    setDetailedLog(null);
    setShowDetails(false);
  }

  const handleRun = () => {
    if (!sourceDevice || !targetIp.trim()) return;
    setDetailedLog(null);

    // If IPv6, find device by IPv6 address
    let simSourceId = sourceDevice.id;
    if (ipVersion === "ipv6") {
      const target = devices.find((d) => d.ipv6Address === targetIp.trim());
      if (!target) {
        onStartSim([], {
          success: false,
          hops: [],
          totalRtt: 0,
          error: `Nenhum dispositivo com IPv6 ${targetIp.trim()}`,
          type: "ping",
        });
        return;
      }
    }

    const sim =
      mode === "ping"
        ? simulatePing(devices, connections, simSourceId, targetIp.trim())
        : simulateTraceroute(
            devices,
            connections,
            simSourceId,
            targetIp.trim(),
          );
    if (sim.result.success && sim.path.length >= 2) {
      const log = buildDetailedPacketLog(sim.path, devices, connections);
      setDetailedLog(log);
    }
    onStartSim(sim.path, sim.result);
  };

  const canRun = !!sourceDevice && !!targetIp.trim() && !isAnimating;

  const cableTypeLabel = (t: string) => {
    if (t === "straight") return "Direto";
    if (t === "crossover") return "Crossover";
    if (t === "serial") return "Serial";
    return "Incompatível";
  };

  // Current PDU hop in simulation mode
  const currentHop: PacketHopDetail | null =
    simulationMode === "simulation" && detailedLog && currentSimStep > 0
      ? (detailedLog.hops[currentSimStep - 1] ?? null)
      : null;

  const totalSteps = detailedLog?.hops.length ?? 0;

  return (
    <div
      data-ocid="pkt.panel"
      className="border-t border-border bg-card shrink-0"
    >
      {/* Header */}
      <div className="px-3 py-1.5 border-b border-border flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Simulação de Pacote
        </span>
        <div className="flex items-center gap-1">
          {/* Sim mode indicator */}
          {simulationMode === "simulation" && (
            <Badge
              variant="outline"
              className="text-[9px] px-1 h-4 border-amber-500/60 text-amber-400"
            >
              PASSO A PASSO
            </Badge>
          )}
          <button
            type="button"
            data-ocid="pkt.ping.tab"
            onClick={() => setMode("ping")}
            className={`text-[11px] px-1.5 py-0.5 rounded transition-colors ${
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
            className={`text-[11px] px-1.5 py-0.5 rounded transition-colors ${
              mode === "traceroute"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Traceroute
          </button>
          <button
            type="button"
            data-ocid="pkt.toggle"
            onClick={() => setExpanded((p) => !p)}
            className="md:hidden ml-1 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
            aria-label={expanded ? "Recolher painel" : "Expandir painel"}
          >
            {expanded ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 space-y-2.5 max-h-[60vh] md:max-h-none overflow-y-auto">
          <div className="flex items-center gap-2">
            <div className="text-[11px] text-muted-foreground w-12 shrink-0">
              Origem:
            </div>
            <div className="text-[11px] font-mono text-foreground truncate">
              {sourceDevice
                ? `${sourceDevice.hostname} (${sourceDevice.ip || "sem ip"})`
                : "Selecione um dispositivo"}
            </div>
          </div>

          {/* IP Version selector */}
          <div className="flex items-center gap-1.5">
            <div className="text-[11px] text-muted-foreground w-12 shrink-0">
              Versão:
            </div>
            <button
              type="button"
              onClick={() => setIpVersion("ipv4")}
              className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                ipVersion === "ipv4"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              IPv4
            </button>
            <button
              type="button"
              onClick={() => setIpVersion("ipv6")}
              className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                ipVersion === "ipv6"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              IPv6
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-[11px] text-muted-foreground w-12 shrink-0">
              Destino:
            </div>
            <Input
              data-ocid="pkt.input"
              value={targetIp}
              onChange={(e) => setTargetIp(e.target.value)}
              placeholder={
                ipVersion === "ipv6" ? "ex: 2001:db8::1" : "ex: 192.168.1.1"
              }
              className="h-7 text-[11px] font-mono"
              onKeyDown={(e) => e.key === "Enter" && canRun && handleRun()}
            />
          </div>

          {/* Quick IP buttons */}
          {devices.filter(
            (d) =>
              d.id !== sourceDevice?.id &&
              (ipVersion === "ipv4"
                ? d.ip && d.ip !== "0.0.0.0"
                : !!d.ipv6Address),
          ).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {devices
                .filter(
                  (d) =>
                    d.id !== sourceDevice?.id &&
                    (ipVersion === "ipv4"
                      ? d.ip && d.ip !== "0.0.0.0"
                      : !!d.ipv6Address),
                )
                .slice(0, 6)
                .map((d) => (
                  <button
                    type="button"
                    key={d.id}
                    onClick={() =>
                      setTargetIp(
                        ipVersion === "ipv6" ? d.ipv6Address || "" : d.ip,
                      )
                    }
                    className="text-[10px] px-1.5 py-0.5 rounded bg-secondary hover:bg-accent font-mono text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {ipVersion === "ipv6" ? d.ipv6Address : d.ip}
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

          {/* Step counter in simulation mode */}
          {simulationMode === "simulation" && totalSteps > 0 && (
            <div className="flex items-center justify-between p-2 rounded bg-amber-500/10 border border-amber-500/30">
              <span className="text-[11px] text-amber-400 font-mono">
                Passo {currentSimStep} de {totalSteps}
              </span>
              {simPaused && currentSimStep <= totalSteps && (
                <Button
                  data-ocid="pkt.button"
                  size="sm"
                  variant="outline"
                  className="h-6 text-[11px] px-2 border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                  onClick={onNextStep}
                >
                  <SkipForward size={10} className="mr-1" />
                  Próximo Passo
                </Button>
              )}
            </div>
          )}

          {/* PDU Inspector for simulation mode */}
          {simulationMode === "simulation" && currentHop && (
            <div className="border border-amber-500/30 rounded-lg overflow-hidden">
              <div className="px-2 py-1.5 bg-amber-500/10 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                🔍 PDU Inspector — Salto {currentSimStep}:{" "}
                {currentHop.fromDevice} → {currentHop.toDevice}
              </div>

              {/* Events */}
              {(currentHop.aclEvent ||
                currentHop.natEvent ||
                currentHop.serviceEvent ||
                currentHop.vlanEvent) && (
                <div className="px-2 py-1.5 border-t border-amber-500/20 space-y-0.5">
                  {currentHop.aclEvent && (
                    <div
                      className={`text-[10px] font-mono flex items-center gap-1 ${
                        currentHop.aclEvent.includes("DENY")
                          ? "text-red-400"
                          : "text-green-400"
                      }`}
                    >
                      ⚡ {currentHop.aclEvent}
                    </div>
                  )}
                  {currentHop.natEvent && (
                    <div className="text-[10px] font-mono text-blue-400">
                      ⇄ {currentHop.natEvent}
                    </div>
                  )}
                  {currentHop.vlanEvent && (
                    <div className="text-[10px] font-mono text-orange-400">
                      ⚠ {currentHop.vlanEvent}
                    </div>
                  )}
                  {currentHop.serviceEvent && (
                    <div className="text-[10px] font-mono text-cyan-400">
                      📡 {currentHop.serviceEvent}
                    </div>
                  )}
                </div>
              )}

              {/* Layers */}
              <Accordion type="multiple" className="w-full">
                {currentHop.layers.map((layer) => (
                  <AccordionItem
                    key={layer.layer}
                    value={layer.layer}
                    className="border-t border-amber-500/20"
                  >
                    <AccordionTrigger className="px-2 py-1.5 text-[10px] font-semibold text-amber-300 hover:no-underline">
                      {layer.layer}
                    </AccordionTrigger>
                    <AccordionContent className="px-2 pb-2">
                      <div className="space-y-0.5">
                        {layer.fields.map((field) => (
                          <div
                            key={field.label}
                            className="flex items-center justify-between text-[10px] font-mono py-0.5 border-b border-border/20"
                          >
                            <span className="text-muted-foreground">
                              {field.label}
                            </span>
                            <span
                              className="text-foreground font-medium ml-2 text-right"
                              style={{
                                color:
                                  field.label === "Status do Link"
                                    ? field.value.includes("Up")
                                      ? "#22C55E"
                                      : "#EF4444"
                                    : undefined,
                              }}
                            >
                              {field.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}

          {lastResult && !isAnimating && (
            <div
              data-ocid={
                lastResult.success ? "pkt.success_state" : "pkt.error_state"
              }
              className={`rounded-lg border p-2 text-xs font-mono ${
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
                    } concluído — ${lastResult.totalRtt}ms`
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
                        <span className="text-[10px] opacity-70">
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

          {/* Detailed packet log */}
          {lastResult?.success &&
            detailedLog &&
            !isAnimating &&
            simulationMode === "realtime" && (
              <div className="space-y-2">
                <button
                  type="button"
                  data-ocid="pkt.open_modal_button"
                  onClick={() => setShowDetails((p) => !p)}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-mono w-full"
                >
                  <Package size={12} />
                  {showDetails
                    ? "▲ Ocultar Detalhes"
                    : "▼ Ver Detalhes do Pacote"}
                </button>

                {showDetails && (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-secondary text-[10px] font-mono text-muted-foreground">
                      📊 {detailedLog.summary}
                    </div>

                    <div className="border-t border-border">
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/50">
                        📡 Log de Tráfego
                      </div>
                      <ScrollArea className="max-h-28">
                        <div className="p-2 space-y-1">
                          {detailedLog.hops.map((hop) => (
                            <div
                              key={hop.hop}
                              className="flex flex-col gap-0.5 text-[10px] font-mono border-b border-border/20 pb-1"
                            >
                              <div className="flex items-start gap-1.5">
                                <span
                                  className="w-1.5 h-1.5 rounded-full mt-1 shrink-0"
                                  style={{
                                    backgroundColor: hop.cableStatus.valid
                                      ? "#22C55E"
                                      : "#EF4444",
                                  }}
                                />
                                <span className="text-muted-foreground shrink-0">
                                  [{hop.timestamp}]
                                </span>
                                <span className="text-foreground">
                                  {hop.fromDevice} → {hop.toDevice}
                                </span>
                                <span
                                  className="ml-auto shrink-0"
                                  style={{ color: hop.cableStatus.color }}
                                >
                                  {cableTypeLabel(hop.cableStatus.cableType)}{" "}
                                  {hop.cableStatus.speed}
                                </span>
                              </div>
                              {hop.aclEvent && (
                                <span className="text-green-400 ml-4">
                                  ⚡ {hop.aclEvent}
                                </span>
                              )}
                              {hop.natEvent && (
                                <span className="text-blue-400 ml-4">
                                  ⇄ {hop.natEvent}
                                </span>
                              )}
                              {hop.serviceEvent && (
                                <span className="text-cyan-400 ml-4">
                                  📡 {hop.serviceEvent}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    <div className="border-t border-border">
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/50">
                        🔍 Detalhes por Salto
                      </div>
                      <Accordion type="multiple" className="w-full">
                        {detailedLog.hops.map((hop) => (
                          <AccordionItem
                            key={hop.hop}
                            value={String(hop.hop)}
                            className="border-t border-border/50 px-0"
                          >
                            <AccordionTrigger className="px-3 py-2 text-[10px] font-mono hover:no-underline">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{
                                    backgroundColor: hop.cableStatus.valid
                                      ? "#22C55E"
                                      : "#EF4444",
                                  }}
                                />
                                <span className="text-muted-foreground">
                                  Salto {hop.hop}:
                                </span>
                                <span className="text-foreground">
                                  {hop.fromDevice} → {hop.toDevice}
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-3 pb-2">
                              <div className="space-y-2">
                                {hop.layers.map((layer) => (
                                  <div key={layer.layer}>
                                    <div className="text-[9px] font-semibold text-primary uppercase tracking-wider mb-1">
                                      {layer.layer}
                                    </div>
                                    <div className="space-y-0.5">
                                      {layer.fields.map((field) => (
                                        <div
                                          key={field.label}
                                          className="flex items-center justify-between text-[10px] font-mono py-0.5 border-b border-border/30"
                                        >
                                          <span className="text-muted-foreground">
                                            {field.label}
                                          </span>
                                          <span
                                            className="text-foreground font-medium ml-2 text-right"
                                            style={{
                                              color:
                                                field.label === "Status do Link"
                                                  ? field.value.includes("Up")
                                                    ? "#22C55E"
                                                    : "#EF4444"
                                                  : undefined,
                                            }}
                                          >
                                            {field.value}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  </div>
                )}
              </div>
            )}
        </div>
      )}
    </div>
  );
}
