import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { validateCableType } from "./engine";
import type { Connection, Device } from "./types";
import { DEVICE_CONFIGS } from "./types";

const DEVICE_EMOJIS: Record<string, string> = {
  router: "🔀",
  switch: "🔌",
  hub: "📡",
  pc: "💻",
  server: "🖥️",
  smartphone: "📱",
  firewall: "🛡️",
  "access-point": "📶",
};

type CableChoice = "auto" | "straight" | "crossover" | "serial";

interface ConnectionDialogProps {
  open: boolean;
  srcDevice: Device;
  dstDevice: Device;
  connections: Connection[];
  onConfirm: (srcPort: string, dstPort: string, cableType: CableChoice) => void;
  onCancel: () => void;
}

function getUsedPorts(
  deviceId: string,
  connections: Connection[],
): Map<string, string> {
  const used = new Map<string, string>();
  for (const c of connections) {
    if (c.sourceId === deviceId) used.set(c.sourcePort, c.targetId);
    if (c.targetId === deviceId) used.set(c.targetPort, c.sourceId);
  }
  return used;
}

interface PortSelectorProps {
  device: Device;
  allDevices: Device[];
  connections: Connection[];
  selectedPort: string;
  onSelect: (port: string) => void;
}

function PortSelector({
  device,
  allDevices,
  connections,
  selectedPort,
  onSelect,
}: PortSelectorProps) {
  const ports = DEVICE_CONFIGS[device.type].ports;
  const usedPorts = getUsedPorts(device.id, connections);
  const devMap = new Map(allDevices.map((d) => [d.id, d]));

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{DEVICE_EMOJIS[device.type] ?? "📦"}</span>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {device.hostname}
          </p>
          <p className="text-xs text-muted-foreground">
            {DEVICE_CONFIGS[device.type].label}
          </p>
        </div>
      </div>
      <ScrollArea className="h-48 rounded-md border border-border">
        <div className="p-1.5 flex flex-col gap-1">
          {ports.map((port) => {
            const occupiedBy = usedPorts.get(port);
            const isOccupied = !!occupiedBy;
            const isSelected = selectedPort === port;
            const connectedHostname = occupiedBy
              ? (devMap.get(occupiedBy)?.hostname ?? occupiedBy)
              : null;

            return (
              <button
                key={port}
                type="button"
                disabled={isOccupied}
                data-ocid="connection.port.button"
                onClick={() => !isOccupied && onSelect(port)}
                className={[
                  "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono transition-all text-left",
                  isOccupied
                    ? "opacity-50 cursor-not-allowed bg-secondary/30"
                    : isSelected
                      ? "bg-primary/20 border border-primary text-primary-foreground ring-1 ring-primary"
                      : "bg-secondary/50 hover:bg-secondary cursor-pointer",
                ].join(" ")}
              >
                <span className="text-foreground">{port}</span>
                {isOccupied ? (
                  <div className="flex flex-col items-end gap-0.5">
                    <Badge
                      variant="outline"
                      className="text-[9px] py-0 px-1 h-4 border-orange-500/60 text-orange-400"
                    >
                      Ocupada
                    </Badge>
                    <span className="text-[9px] text-muted-foreground">
                      {connectedHostname}
                    </span>
                  </div>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[9px] py-0 px-1 h-4 border-green-500/60 text-green-400"
                  >
                    Livre
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

const CABLE_OPTIONS: {
  value: CableChoice;
  label: string;
  dot?: string;
}[] = [
  { value: "auto", label: "Auto (detectar)" },
  { value: "straight", label: "Direto", dot: "#22C55E" },
  { value: "crossover", label: "Crossover", dot: "#F59E0B" },
  { value: "serial", label: "Serial", dot: "#4B9EFF" },
];

function ConnectionDialogContent({
  srcDevice,
  dstDevice,
  connections,
  onConfirm,
  onCancel,
}: Omit<ConnectionDialogProps, "open">) {
  const allDevices = [srcDevice, dstDevice];

  const getFirstFreePort = (device: Device) => {
    const ports = DEVICE_CONFIGS[device.type].ports;
    const used = getUsedPorts(device.id, connections);
    return ports.find((p) => !used.has(p)) ?? ports[0];
  };

  const [srcPort, setSrcPort] = useState(() => getFirstFreePort(srcDevice));
  const [dstPort, setDstPort] = useState(() => getFirstFreePort(dstDevice));
  const [cableType, setCableType] = useState<CableChoice>("auto");

  const autoDetected = validateCableType(srcDevice.type, dstDevice.type);
  const autoLabel =
    autoDetected.cableType === "straight"
      ? "Direto"
      : autoDetected.cableType === "crossover"
        ? "Crossover"
        : "Serial";

  return (
    <>
      <div className="flex flex-col gap-4 py-2">
        <div className="grid grid-cols-2 gap-3">
          <PortSelector
            device={srcDevice}
            allDevices={allDevices}
            connections={connections}
            selectedPort={srcPort}
            onSelect={setSrcPort}
          />
          <PortSelector
            device={dstDevice}
            allDevices={allDevices}
            connections={connections}
            selectedPort={dstPort}
            onSelect={setDstPort}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Tipo de Cabo
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {CABLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                data-ocid="connection.cable.button"
                onClick={() => setCableType(opt.value)}
                className={[
                  "flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium border transition-all",
                  cableType === opt.value
                    ? "bg-primary/20 border-primary text-foreground ring-1 ring-primary"
                    : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
                ].join(" ")}
              >
                {opt.dot && (
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                    style={{ backgroundColor: opt.dot }}
                  />
                )}
                {opt.label}
              </button>
            ))}
          </div>
          {cableType === "auto" && (
            <p className="text-xs text-muted-foreground">
              Será detectado automaticamente:{" "}
              <span
                className="font-semibold"
                style={{ color: autoDetected.color }}
              >
                {autoLabel}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          variant="outline"
          data-ocid="connection.cancel_button"
          onClick={onCancel}
          size="sm"
        >
          Cancelar
        </Button>
        <Button
          data-ocid="connection.confirm_button"
          onClick={() => onConfirm(srcPort, dstPort, cableType)}
          size="sm"
          className="bg-primary text-primary-foreground hover:opacity-90"
        >
          Conectar
        </Button>
      </div>
    </>
  );
}

export function ConnectionDialog(props: ConnectionDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={props.open} onOpenChange={(o) => !o && props.onCancel()}>
        <SheetContent
          side="bottom"
          data-ocid="connection.sheet"
          className="rounded-t-2xl max-h-[92vh] flex flex-col p-0"
        >
          <SheetHeader className="px-4 pt-4 pb-2 border-b border-border shrink-0">
            <SheetTitle className="text-sm">Configurar Ligação</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <ConnectionDialogContent
              key={`${props.srcDevice.id}-${props.dstDevice.id}`}
              {...props}
            />
          </div>
          <SheetFooter className="sr-only" />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={props.open} onOpenChange={(o) => !o && props.onCancel()}>
      <DialogContent data-ocid="connection.dialog" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurar Ligação</DialogTitle>
        </DialogHeader>
        <ConnectionDialogContent
          key={`${props.srcDevice.id}-${props.dstDevice.id}`}
          {...props}
        />
        <DialogFooter className="sr-only" />
      </DialogContent>
    </Dialog>
  );
}
