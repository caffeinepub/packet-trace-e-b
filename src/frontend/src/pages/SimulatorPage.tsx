import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ChevronLeft,
  FolderOpen,
  Link2,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { DeviceConfigPanel } from "../simulator/DeviceConfigPanel";
import { DevicePalette } from "../simulator/DevicePalette";
import { PacketSimPanel } from "../simulator/PacketSimPanel";
import { SimulatorCanvas } from "../simulator/SimulatorCanvas";
import { generateId } from "../simulator/engine";
import type {
  Connection,
  Device,
  PacketAnimState,
  PingResult,
  SavedTopology,
} from "../simulator/types";
import { DEVICE_CONFIGS } from "../simulator/types";

const STORAGE_KEY = "pkt-topologies";

// Compact positions that fit well on mobile screens
function makeSampleTopology(): {
  devices: Device[];
  connections: Connection[];
} {
  const d1: Device = {
    id: "d1",
    type: "router",
    hostname: "Router0",
    ip: "192.168.1.1",
    subnetMask: "255.255.255.0",
    gateway: "",
    x: 80,
    y: 120,
    interfaces: [],
  };
  const d2: Device = {
    id: "d2",
    type: "switch",
    hostname: "Switch0",
    ip: "192.168.1.2",
    subnetMask: "255.255.255.0",
    gateway: "192.168.1.1",
    x: 240,
    y: 120,
    interfaces: [],
  };
  const d3: Device = {
    id: "d3",
    type: "pc",
    hostname: "PC0",
    ip: "192.168.1.10",
    subnetMask: "255.255.255.0",
    gateway: "192.168.1.1",
    x: 370,
    y: 40,
    interfaces: [],
  };
  const d4: Device = {
    id: "d4",
    type: "pc",
    hostname: "PC1",
    ip: "192.168.1.11",
    subnetMask: "255.255.255.0",
    gateway: "192.168.1.1",
    x: 370,
    y: 200,
    interfaces: [],
  };
  const d5: Device = {
    id: "d5",
    type: "server",
    hostname: "Servidor0",
    ip: "192.168.1.100",
    subnetMask: "255.255.255.0",
    gateway: "192.168.1.1",
    x: 240,
    y: 260,
    interfaces: [],
  };
  const c1: Connection = {
    id: "c1",
    sourceId: "d1",
    targetId: "d2",
    sourcePort: "Fa0/0",
    targetPort: "Fa0/0",
  };
  const c2: Connection = {
    id: "c2",
    sourceId: "d2",
    targetId: "d3",
    sourcePort: "Fa0/1",
    targetPort: "Fa0",
  };
  const c3: Connection = {
    id: "c3",
    sourceId: "d2",
    targetId: "d4",
    sourcePort: "Fa0/2",
    targetPort: "Fa0",
  };
  const c4: Connection = {
    id: "c4",
    sourceId: "d2",
    targetId: "d5",
    sourcePort: "Fa0/3",
    targetPort: "Fa0",
  };
  return { devices: [d1, d2, d3, d4, d5], connections: [c1, c2, c3, c4] };
}

interface SimulatorPageProps {
  onBack: () => void;
}

export default function SimulatorPage({ onBack }: SimulatorPageProps) {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const isMobile = useIsMobile();

  const initial = makeSampleTopology();
  const [devices, setDevices] = useState<Device[]>(initial.devices);
  const [connections, setConnections] = useState<Connection[]>(
    initial.connections,
  );
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [packetAnim, setPacketAnim] = useState<PacketAnimState | null>(null);
  const [lastResult, setLastResult] = useState<PingResult | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [configSheetOpen, setConfigSheetOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [topoName, setTopoName] = useState("Minha Topologia");
  const [savedTopologies, setSavedTopologies] = useState<SavedTopology[]>(
    () => {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      } catch {
        return [];
      }
    },
  );

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) || null;

  const handleAddDevice = useCallback(
    (type: keyof typeof DEVICE_CONFIGS) => {
      const cfg = DEVICE_CONFIGS[type];
      const id = generateId();
      const count = devices.filter((d) => d.type === type).length;
      const newDevice: Device = {
        id,
        type,
        hostname: `${cfg.label}${count}`,
        ip: cfg.defaultIp,
        subnetMask: "255.255.255.0",
        gateway: "",
        x: 60 + Math.random() * 280,
        y: 60 + Math.random() * 200,
        interfaces: [],
      };
      setDevices((prev) => [...prev, newDevice]);
      setSelectedDeviceId(id);
      if (isMobile) setConfigSheetOpen(true);
      toast.success(`${cfg.label} adicionado`);
    },
    [devices, isMobile],
  );

  const handleDeviceMove = useCallback((id: string, x: number, y: number) => {
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, x, y } : d)));
  }, []);

  const handleDeviceSelect = useCallback(
    (id: string | null) => {
      if (connectMode) {
        if (!connectSourceId) setConnectSourceId(id);
      } else {
        setSelectedDeviceId(id);
        if (id && isMobile) setConfigSheetOpen(true);
      }
    },
    [connectMode, connectSourceId, isMobile],
  );

  const handleConnect = useCallback(
    (srcId: string, dstId: string) => {
      const exists = connections.some(
        (c) =>
          (c.sourceId === srcId && c.targetId === dstId) ||
          (c.sourceId === dstId && c.targetId === srcId),
      );
      if (exists) {
        toast.error("Conexão já existe");
        setConnectSourceId(null);
        return;
      }
      const src = devices.find((d) => d.id === srcId)!;
      const dst = devices.find((d) => d.id === dstId)!;
      const srcPorts = DEVICE_CONFIGS[src.type].ports;
      const dstPorts = DEVICE_CONFIGS[dst.type].ports;
      const usedSrc = connections
        .filter((c) => c.sourceId === srcId)
        .map((c) => c.sourcePort);
      const usedDst = connections
        .filter((c) => c.targetId === dstId)
        .map((c) => c.targetPort);
      const srcPort = srcPorts.find((p) => !usedSrc.includes(p)) || srcPorts[0];
      const dstPort = dstPorts.find((p) => !usedDst.includes(p)) || dstPorts[0];
      const conn: Connection = {
        id: generateId(),
        sourceId: srcId,
        targetId: dstId,
        sourcePort: srcPort,
        targetPort: dstPort,
      };
      setConnections((prev) => [...prev, conn]);
      setConnectSourceId(null);
      toast.success(`Conectado: ${srcPort} ↔ ${dstPort}`);
    },
    [connections, devices],
  );

  const handleSaveDevice = useCallback((updated: Device) => {
    setDevices((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    toast.success("Configuração salva");
  }, []);

  const handleDeleteDevice = useCallback((id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    setConnections((prev) =>
      prev.filter((c) => c.sourceId !== id && c.targetId !== id),
    );
    setSelectedDeviceId(null);
    setConfigSheetOpen(false);
    toast.success("Dispositivo removido");
  }, []);

  const handleStartSim = useCallback((path: string[], result: PingResult) => {
    if (path.length >= 2) setPacketAnim({ active: true, path, result });
    else setLastResult(result);
  }, []);

  const handleAnimationComplete = useCallback(() => {
    if (packetAnim?.result) setLastResult(packetAnim.result);
    setPacketAnim(null);
  }, [packetAnim]);

  const handleSaveTopology = () => {
    const topo: SavedTopology = {
      id: generateId(),
      name: topoName,
      description: `${devices.length} dispositivos, ${connections.length} conexões`,
      devices,
      connections,
      savedAt: Date.now(),
    };
    const updated = [...savedTopologies, topo];
    setSavedTopologies(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSaveDialogOpen(false);
    toast.success("Topologia salva!");
  };

  const handleLoadTopology = (topo: SavedTopology) => {
    setDevices(topo.devices);
    setConnections(topo.connections);
    setSelectedDeviceId(null);
    setConnectMode(false);
    setConnectSourceId(null);
    setLoadDialogOpen(false);
    toast.success(`Topologia "${topo.name}" carregada`);
  };

  const handleNewTopology = () => {
    const fresh = makeSampleTopology();
    setDevices(fresh.devices);
    setConnections(fresh.connections);
    setSelectedDeviceId(null);
    setConnectMode(false);
    setConnectSourceId(null);
    setLastResult(null);
    toast.success("Nova topologia criada");
  };

  const handleClear = () => {
    setDevices([]);
    setConnections([]);
    setSelectedDeviceId(null);
    setConnectMode(false);
    setConnectSourceId(null);
    setLastResult(null);
  };

  const toggleConnectMode = () => {
    setConnectMode((prev) => !prev);
    setConnectSourceId(null);
    if (!connectMode)
      toast("Modo de conexão ativado — toque no dispositivo de origem");
  };

  const isLoggingIn = loginStatus === "logging-in";

  const configPanel = selectedDevice ? (
    <DeviceConfigPanel
      device={selectedDevice}
      onSave={handleSaveDevice}
      onClose={() => {
        setSelectedDeviceId(null);
        setConfigSheetOpen(false);
      }}
      onDelete={handleDeleteDevice}
    />
  ) : null;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <Toaster theme="dark" />

      <header className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-card shrink-0">
        <button
          type="button"
          data-ocid="toolbar.back.button"
          onClick={onBack}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm px-2 py-1 rounded hover:bg-secondary mr-1"
        >
          <ChevronLeft size={14} />
          <span className="hidden sm:inline">Início</span>
        </button>

        <div className="flex items-center gap-1">
          <Button
            data-ocid="toolbar.new.button"
            size="sm"
            variant="outline"
            onClick={handleNewTopology}
            className="h-7 text-xs px-2"
          >
            <RefreshCw size={12} />
          </Button>
          <Button
            data-ocid="toolbar.save.button"
            size="sm"
            variant="outline"
            onClick={() => setSaveDialogOpen(true)}
            className="h-7 text-xs px-2"
          >
            <Save size={12} />
          </Button>
          <Button
            data-ocid="toolbar.load.button"
            size="sm"
            variant="outline"
            onClick={() => setLoadDialogOpen(true)}
            className="h-7 text-xs px-2"
          >
            <FolderOpen size={12} />
          </Button>
          <Button
            data-ocid="toolbar.clear.button"
            size="sm"
            variant="outline"
            onClick={handleClear}
            className="h-7 text-xs px-2 text-destructive hover:text-destructive"
          >
            <Trash2 size={12} />
          </Button>
        </div>

        <div className="h-5 w-px bg-border mx-1" />

        <button
          type="button"
          data-ocid="toolbar.connect.toggle"
          onClick={toggleConnectMode}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs h-7 transition-colors ${
            connectMode
              ? "bg-primary text-primary-foreground"
              : "border border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Link2 size={12} />
          <span className="hidden sm:inline">
            {connectMode ? (connectSourceId ? "Destino" : "Origem") : "Ligar"}
          </span>
        </button>

        {selectedDeviceId && (
          <button
            type="button"
            data-ocid="toolbar.delete.button"
            onClick={() => handleDeleteDevice(selectedDeviceId)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs h-7 border border-destructive/50 text-destructive hover:bg-destructive/10"
          >
            <Trash2 size={12} />
          </button>
        )}

        <div className="ml-auto flex items-center gap-1">
          <Button
            data-ocid="toolbar.auth.button"
            size="sm"
            variant="outline"
            onClick={() => (identity ? clear() : login())}
            className="h-7 text-xs px-2"
            disabled={isLoggingIn}
          >
            {identity ? <LogOut size={12} /> : <LogIn size={12} />}
          </Button>
          <Button
            data-ocid="palette.add.button"
            size="sm"
            className="h-7 text-xs bg-primary text-primary-foreground hover:opacity-90 md:hidden px-2"
            onClick={() => setPaletteOpen((p) => !p)}
          >
            <Plus size={12} />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <DevicePalette
          onAddDevice={handleAddDevice}
          isOpen={paletteOpen}
          onToggle={() => setPaletteOpen((p) => !p)}
        />

        <div className="flex flex-col flex-1 overflow-hidden pb-24 md:pb-0">
          <SimulatorCanvas
            devices={devices}
            connections={connections}
            selectedDeviceId={selectedDeviceId}
            connectMode={connectMode}
            connectSourceId={connectSourceId}
            packetAnim={packetAnim}
            onDeviceSelect={handleDeviceSelect}
            onDeviceMove={handleDeviceMove}
            onConnect={handleConnect}
            onAnimationComplete={handleAnimationComplete}
          />
          <PacketSimPanel
            sourceDevice={selectedDevice}
            devices={devices}
            connections={connections}
            isAnimating={packetAnim?.active ?? false}
            lastResult={lastResult}
            onStartSim={handleStartSim}
          />
        </div>

        {selectedDevice && !isMobile && configPanel}
      </div>

      {isMobile && (
        <Sheet
          open={configSheetOpen && !!selectedDevice}
          onOpenChange={(open) => {
            setConfigSheetOpen(open);
            if (!open) setSelectedDeviceId(null);
          }}
        >
          <SheetContent
            side="bottom"
            data-ocid="config.sheet"
            className="h-[85vh] flex flex-col p-0 rounded-t-2xl"
          >
            <SheetHeader className="px-4 pt-4 pb-2 border-b border-border shrink-0">
              <SheetTitle className="text-sm">
                {selectedDevice?.hostname ?? "Configurar"}
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">{configPanel}</div>
          </SheetContent>
        </Sheet>
      )}

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent data-ocid="save.dialog" className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Salvar Topologia</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              data-ocid="save.input"
              value={topoName}
              onChange={(e) => setTopoName(e.target.value)}
              placeholder="Nome da topologia"
            />
            <p className="text-xs text-muted-foreground">
              {devices.length} dispositivos · {connections.length} conexões
            </p>
          </div>
          <DialogFooter>
            <Button
              data-ocid="save.cancel_button"
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              data-ocid="save.confirm_button"
              onClick={handleSaveTopology}
              className="bg-primary text-primary-foreground"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogContent data-ocid="load.dialog" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Carregar Topologia</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-72 overflow-y-auto">
            {savedTopologies.length === 0 ? (
              <div
                data-ocid="load.empty_state"
                className="text-center py-8 text-muted-foreground text-sm"
              >
                Nenhuma topologia salva
              </div>
            ) : (
              savedTopologies.map((topo, i) => (
                <button
                  type="button"
                  key={topo.id}
                  data-ocid={`load.item.${i + 1}`}
                  onClick={() => handleLoadTopology(topo)}
                  className="w-full text-left p-3 rounded-lg border border-border hover:bg-secondary transition-colors"
                >
                  <p className="font-semibold text-sm">{topo.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {topo.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(topo.savedAt).toLocaleString("pt-BR")}
                  </p>
                </button>
              ))
            )}
          </div>
          <DialogFooter>
            <Button
              data-ocid="load.close_button"
              variant="outline"
              onClick={() => setLoadDialogOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
