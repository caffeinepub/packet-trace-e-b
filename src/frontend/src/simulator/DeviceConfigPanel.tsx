import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { CLITerminal } from "./CLITerminal";
import { DeviceIcon } from "./DeviceIcon";
import { validateCableType } from "./engine";
import { generateId } from "./engine";
import type {
  AclRule,
  Connection,
  Device,
  DhcpPool,
  DnsRecord,
  RoutingEntry,
  ServiceConfig,
  VlanConfig,
} from "./types";
import { DEVICE_CONFIGS } from "./types";

interface DeviceConfigPanelProps {
  device: Device | null;
  devices: Device[];
  connections: Connection[];
  onSave: (updated: Device) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  defaultTab?: string;
  onPingRequest?: (targetIp: string) => void;
}

function getDefaultServices(): ServiceConfig {
  return {
    http: false,
    ftp: false,
    dhcp: false,
    dns: false,
    ospfEnabled: false,
    ripEnabled: false,
    ospfProcessId: 1,
    ospfAreaId: 0,
  };
}

export function DeviceConfigPanel({
  device,
  devices,
  connections,
  onSave,
  onClose,
  onDelete,
  defaultTab = "geral",
  onPingRequest,
}: DeviceConfigPanelProps) {
  const [form, setForm] = useState<Device | null>(null);
  const [activeTab, setActiveTab] = useState(defaultTab);

  // New VLAN form
  const [newVlanId, setNewVlanId] = useState("");
  const [newVlanName, setNewVlanName] = useState("");

  // New ACL rule form
  const [newAcl, setNewAcl] = useState<Partial<AclRule>>({
    action: "permit",
    protocol: "any",
    sourceIp: "any",
    sourceMask: "0.0.0.0",
    destIp: "any",
    destMask: "0.0.0.0",
    description: "",
  });

  // New route form
  const [newRoute, setNewRoute] = useState<Partial<RoutingEntry>>({
    network: "",
    mask: "255.255.255.0",
    nextHop: "",
    interface: "Fa0/0",
    protocol: "static",
    metric: 1,
  });

  // New DNS record form
  const [newDns, setNewDns] = useState<Partial<DnsRecord>>({
    hostname: "",
    ip: "",
    type: "A",
  });

  useEffect(() => {
    setForm(device ? { ...device } : null);
    setActiveTab(defaultTab);
  }, [device, defaultTab]);

  if (!device || !form) return null;

  const cfg = DEVICE_CONFIGS[device.type];

  const update = <K extends keyof Device>(field: K, value: Device[K]) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleSave = () => {
    if (form) onSave(form);
  };

  const handleDeviceUpdate = (updated: Device) => {
    setForm(updated);
    onSave(updated);
  };

  // Build connection info per port
  const deviceConnections = connections.filter(
    (c) => c.sourceId === device.id || c.targetId === device.id,
  );
  const portConnMap = new Map<
    string,
    {
      otherHostname: string;
      otherPort: string;
      cableColor: string;
      cableType: string;
    }
  >();
  for (const c of deviceConnections) {
    const isSrc = c.sourceId === device.id;
    const myPort = isSrc ? c.sourcePort : c.targetPort;
    const otherId = isSrc ? c.targetId : c.sourceId;
    const otherPort = isSrc ? c.targetPort : c.sourcePort;
    const otherDev = devices.find((d) => d.id === otherId);
    const cable = otherDev
      ? validateCableType(device.type, otherDev.type)
      : null;
    portConnMap.set(myPort, {
      otherHostname: otherDev?.hostname || otherId,
      otherPort,
      cableColor: cable?.color || "#888",
      cableType:
        cable?.cableType === "straight"
          ? "Direto"
          : cable?.cableType === "crossover"
            ? "Crossover"
            : cable?.cableType === "serial"
              ? "Serial"
              : "Incompatível",
    });
  }

  const isRouter = device.type === "router";
  const isSwitch = device.type === "switch" || device.type === "hub";
  const isFirewall = device.type === "firewall";
  const isServer = device.type === "server";
  const showServices = isRouter || isServer;
  const showVlans = isSwitch;
  const showRouting = isRouter;
  const showAcl = isRouter || isFirewall;
  // NAT configuration available on routers (reserved for future use)
  const _showNat = isRouter;

  const services = form.services || getDefaultServices();

  return (
    <div
      data-ocid="config.panel"
      className="w-80 border-l border-border bg-card flex flex-col shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: cfg.bgColor }}
          >
            <DeviceIcon type={device.type} size={14} />
          </div>
          <div>
            <p className="text-xs font-semibold">{form.hostname}</p>
            <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
          </div>
        </div>
        <button
          type="button"
          data-ocid="config.close_button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X size={14} />
        </button>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList
          className="flex-shrink-0 mx-2 mt-1.5 mb-0 h-7 bg-secondary rounded-md p-0.5 grid"
          style={{
            gridTemplateColumns: `repeat(${2 + (showServices ? 1 : 0) + (showVlans ? 1 : 0) + (showRouting ? 1 : 0) + (showAcl ? 1 : 0)}, 1fr)`,
          }}
        >
          <TabsTrigger
            value="geral"
            data-ocid="config.tab"
            className="text-[10px] h-6 px-1"
          >
            Geral
          </TabsTrigger>
          <TabsTrigger
            value="cli"
            data-ocid="config.tab"
            className="text-[10px] h-6 px-1"
          >
            CLI
          </TabsTrigger>
          {showServices && (
            <TabsTrigger
              value="servicos"
              data-ocid="config.tab"
              className="text-[10px] h-6 px-1"
            >
              Serviços
            </TabsTrigger>
          )}
          {showVlans && (
            <TabsTrigger
              value="vlans"
              data-ocid="config.tab"
              className="text-[10px] h-6 px-1"
            >
              VLANs
            </TabsTrigger>
          )}
          {showRouting && (
            <TabsTrigger
              value="roteamento"
              data-ocid="config.tab"
              className="text-[10px] h-6 px-1"
            >
              Rotas
            </TabsTrigger>
          )}
          {showAcl && (
            <TabsTrigger
              value="acl"
              data-ocid="config.tab"
              className="text-[10px] h-6 px-1"
            >
              ACL
            </TabsTrigger>
          )}
        </TabsList>

        {/* GERAL */}
        <TabsContent value="geral" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Hostname</Label>
                <Input
                  data-ocid="config.input"
                  value={form.hostname}
                  onChange={(e) => update("hostname", e.target.value)}
                  className="h-7 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Endereço IP</Label>
                <Input
                  value={form.ip}
                  onChange={(e) => update("ip", e.target.value)}
                  className="h-7 text-xs font-mono"
                  placeholder="192.168.1.x"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Máscara de Sub-rede</Label>
                <Input
                  value={form.subnetMask}
                  onChange={(e) => update("subnetMask", e.target.value)}
                  className="h-7 text-xs font-mono"
                  placeholder="255.255.255.0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Gateway Padrão</Label>
                <Input
                  value={form.gateway}
                  onChange={(e) => update("gateway", e.target.value)}
                  className="h-7 text-xs font-mono"
                  placeholder="192.168.1.1"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Endereço IPv6</Label>
                <Input
                  value={form.ipv6Address || ""}
                  onChange={(e) => update("ipv6Address", e.target.value)}
                  className="h-7 text-xs font-mono"
                  placeholder="2001:db8::1"
                />
              </div>
              {form.ipv6Address && (
                <div className="space-y-1">
                  <Label className="text-xs">Prefixo IPv6</Label>
                  <Input
                    value={String(form.ipv6Prefix ?? 64)}
                    onChange={(e) =>
                      update(
                        "ipv6Prefix",
                        Number.parseInt(e.target.value) || 64,
                      )
                    }
                    className="h-7 text-xs font-mono"
                    placeholder="64"
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">MAC Address</Label>
                <div className="h-7 flex items-center px-2 rounded border border-border bg-secondary text-[10px] font-mono text-muted-foreground">
                  {device.id
                    .split("")
                    .reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0)
                    .toString(16)
                    .padStart(12, "0")
                    .match(/.{2}/g)
                    ?.join(":")
                    .toUpperCase()}
                </div>
              </div>

              {/* Interfaces */}
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Interfaces ({cfg.ports.length} porta
                  {cfg.ports.length !== 1 ? "s" : ""})
                </Label>
                <div className="space-y-0.5">
                  {cfg.ports.slice(0, 12).map((port) => {
                    const conn = portConnMap.get(port);
                    const isUp = !!conn;
                    return (
                      <div
                        key={port}
                        className="flex items-center justify-between px-2 py-1 rounded bg-secondary text-xs font-mono"
                      >
                        <span style={{ color: cfg.color }} className="shrink-0">
                          {port}
                        </span>
                        <div className="flex items-center gap-1 ml-2 min-w-0">
                          {isUp ? (
                            <>
                              <span className="text-green-400 shrink-0">
                                ● Up
                              </span>
                              <span className="text-muted-foreground text-[10px] truncate">
                                → {conn.otherHostname}
                              </span>
                              <span
                                className="text-[9px] shrink-0 px-0.5 rounded"
                                style={{
                                  color: conn.cableColor,
                                  border: `1px solid ${conn.cableColor}44`,
                                }}
                              >
                                {conn.cableType}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">
                              ○ Down
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {cfg.ports.length > 12 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{cfg.ports.length - 12} portas
                    </p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="rounded border border-border bg-secondary p-2 space-y-0.5 text-[10px] font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Portas ativas:</span>
                  <span className="text-green-400">
                    {portConnMap.size} / {cfg.ports.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Conexões:</span>
                  <span className="text-foreground">
                    {deviceConnections.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span style={{ color: cfg.color }}>{cfg.label}</span>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* CLI TERMINAL */}
        <TabsContent value="cli" className="flex-1 overflow-hidden mt-0 p-2">
          <CLITerminal
            device={form}
            devices={devices}
            connections={connections}
            onDeviceUpdate={handleDeviceUpdate}
            onPingRequest={(ip) => onPingRequest?.(ip)}
          />
        </TabsContent>

        {/* SERVIÇOS */}
        {showServices && (
          <TabsContent value="servicos" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Serviços Ativos
                  </Label>
                  {(
                    [
                      ["http", "HTTP", "Servidor Web"],
                      ["ftp", "FTP", "Transferência de Arquivos"],
                      ["dhcp", "DHCP", "Atribuição de IPs"],
                      ["dns", "DNS", "Resolução de Nomes"],
                    ] as [keyof ServiceConfig, string, string][]
                  ).map(([key, label, desc]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-2 rounded bg-secondary"
                    >
                      <div>
                        <p className="text-xs font-semibold">{label}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {desc}
                        </p>
                      </div>
                      <Switch
                        data-ocid="config.switch"
                        checked={!!services[key]}
                        onCheckedChange={(checked) => {
                          const updated = { ...services, [key]: checked };
                          update("services", updated);
                        }}
                      />
                    </div>
                  ))}
                </div>

                {isRouter && (
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Protocolos de Roteamento
                    </Label>
                    <div className="flex items-center justify-between p-2 rounded bg-secondary">
                      <div>
                        <p className="text-xs font-semibold">RIP</p>
                        <p className="text-[10px] text-muted-foreground">
                          Routing Information Protocol
                        </p>
                      </div>
                      <Switch
                        data-ocid="config.switch"
                        checked={!!services.ripEnabled}
                        onCheckedChange={(checked) =>
                          update("services", {
                            ...services,
                            ripEnabled: checked,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-secondary">
                      <div>
                        <p className="text-xs font-semibold">OSPF</p>
                        <p className="text-[10px] text-muted-foreground">
                          Open Shortest Path First
                        </p>
                      </div>
                      <Switch
                        data-ocid="config.switch"
                        checked={!!services.ospfEnabled}
                        onCheckedChange={(checked) =>
                          update("services", {
                            ...services,
                            ospfEnabled: checked,
                          })
                        }
                      />
                    </div>
                    {services.ospfEnabled && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Process ID</Label>
                          <Input
                            value={String(services.ospfProcessId || 1)}
                            onChange={(e) =>
                              update("services", {
                                ...services,
                                ospfProcessId:
                                  Number.parseInt(e.target.value) || 1,
                              })
                            }
                            className="h-7 text-xs font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Area ID</Label>
                          <Input
                            value={String(services.ospfAreaId || 0)}
                            onChange={(e) =>
                              update("services", {
                                ...services,
                                ospfAreaId:
                                  Number.parseInt(e.target.value) || 0,
                              })
                            }
                            className="h-7 text-xs font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* DHCP Pool config */}
                {services.dhcp && (
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Pools DHCP
                    </Label>
                    {(form.dhcpPools || []).map((pool, idx) => (
                      <div
                        key={pool.poolName}
                        className="p-2 rounded border border-border bg-secondary space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold font-mono">
                            {pool.poolName}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() => {
                              const pools = [...(form.dhcpPools || [])];
                              pools.splice(idx, 1);
                              update("dhcpPools", pools);
                            }}
                          >
                            <Trash2 size={10} />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                          <div>
                            <Label className="text-[10px]">Rede</Label>
                            <Input
                              value={pool.networkAddr}
                              onChange={(e) => {
                                const pools = [...(form.dhcpPools || [])];
                                pools[idx] = {
                                  ...pools[idx],
                                  networkAddr: e.target.value,
                                };
                                update("dhcpPools", pools);
                              }}
                              className="h-6 text-[10px] font-mono mt-0.5"
                              placeholder="192.168.1.0"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px]">Gateway</Label>
                            <Input
                              value={pool.defaultRouter}
                              onChange={(e) => {
                                const pools = [...(form.dhcpPools || [])];
                                pools[idx] = {
                                  ...pools[idx],
                                  defaultRouter: e.target.value,
                                };
                                update("dhcpPools", pools);
                              }}
                              className="h-6 text-[10px] font-mono mt-0.5"
                              placeholder="192.168.1.1"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px]">IP Inicial</Label>
                            <Input
                              value={pool.startIp}
                              onChange={(e) => {
                                const pools = [...(form.dhcpPools || [])];
                                pools[idx] = {
                                  ...pools[idx],
                                  startIp: e.target.value,
                                };
                                update("dhcpPools", pools);
                              }}
                              className="h-6 text-[10px] font-mono mt-0.5"
                              placeholder="192.168.1.10"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px]">IP Final</Label>
                            <Input
                              value={pool.endIp}
                              onChange={(e) => {
                                const pools = [...(form.dhcpPools || [])];
                                pools[idx] = {
                                  ...pools[idx],
                                  endIp: e.target.value,
                                };
                                update("dhcpPools", pools);
                              }}
                              className="h-6 text-[10px] font-mono mt-0.5"
                              placeholder="192.168.1.100"
                            />
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {pool.assignedIps.length} IPs atribuídos
                        </div>
                      </div>
                    ))}
                    <Button
                      data-ocid="config.button"
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-xs"
                      onClick={() => {
                        const newPool: DhcpPool = {
                          poolName: `Pool${(form.dhcpPools || []).length + 1}`,
                          networkAddr: "192.168.1.0",
                          mask: "255.255.255.0",
                          defaultRouter: form.ip || "192.168.1.1",
                          dnsServer: "",
                          startIp: "192.168.1.10",
                          endIp: "192.168.1.100",
                          leaseTime: 86400,
                          assignedIps: [],
                        };
                        update("dhcpPools", [
                          ...(form.dhcpPools || []),
                          newPool,
                        ]);
                      }}
                    >
                      <Plus size={10} className="mr-1" /> Adicionar Pool
                    </Button>
                  </div>
                )}

                {/* DNS records */}
                {services.dns && (
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Registros DNS
                    </Label>
                    <div className="rounded border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[10px] h-6 px-2">
                              Hostname
                            </TableHead>
                            <TableHead className="text-[10px] h-6 px-2">
                              IP
                            </TableHead>
                            <TableHead className="text-[10px] h-6 px-2 w-8" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(form.dnsRecords || []).map((rec, recIdx) => (
                            <TableRow key={rec.hostname || recIdx}>
                              <TableCell className="text-[10px] py-1 px-2 font-mono">
                                {rec.hostname}
                              </TableCell>
                              <TableCell className="text-[10px] py-1 px-2 font-mono">
                                {rec.ip}
                              </TableCell>
                              <TableCell className="py-1 px-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0"
                                  onClick={() => {
                                    const recs = [...(form.dnsRecords || [])];
                                    recs.splice(recIdx, 1);
                                    update("dnsRecords", recs);
                                  }}
                                >
                                  <Trash2 size={8} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input
                        value={newDns.hostname || ""}
                        onChange={(e) =>
                          setNewDns((p) => ({ ...p, hostname: e.target.value }))
                        }
                        className="h-7 text-[10px] font-mono"
                        placeholder="servidor.local"
                      />
                      <Input
                        value={newDns.ip || ""}
                        onChange={(e) =>
                          setNewDns((p) => ({ ...p, ip: e.target.value }))
                        }
                        className="h-7 text-[10px] font-mono"
                        placeholder="192.168.1.1"
                      />
                    </div>
                    <Button
                      data-ocid="config.button"
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-xs"
                      onClick={() => {
                        if (!newDns.hostname || !newDns.ip) return;
                        const rec: DnsRecord = {
                          hostname: newDns.hostname,
                          ip: newDns.ip,
                          type: "A",
                        };
                        update("dnsRecords", [...(form.dnsRecords || []), rec]);
                        setNewDns({ hostname: "", ip: "", type: "A" });
                      }}
                    >
                      <Plus size={10} className="mr-1" /> Adicionar Registro
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        )}

        {/* VLANs */}
        {showVlans && (
          <TabsContent value="vlans" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  VLANs Configuradas
                </Label>
                <div className="space-y-1.5">
                  {(form.vlans || []).map((vlan, idx) => (
                    <div
                      key={vlan.id}
                      className="p-2 rounded border border-border bg-secondary"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1 h-4"
                          >
                            VLAN {vlan.id}
                          </Badge>
                          <span className="text-xs font-semibold">
                            {vlan.name}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-destructive"
                          onClick={() => {
                            const vlans = [...(form.vlans || [])];
                            vlans.splice(idx, 1);
                            update("vlans", vlans);
                          }}
                        >
                          <Trash2 size={10} />
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Portas na VLAN</Label>
                        <div className="flex flex-wrap gap-1">
                          {cfg.ports.slice(0, 12).map((port) => {
                            const isInVlan = vlan.ports.includes(port);
                            return (
                              <button
                                key={port}
                                type="button"
                                onClick={() => {
                                  const vlans = [...(form.vlans || [])];
                                  const v = { ...vlans[idx] };
                                  if (isInVlan) {
                                    v.ports = v.ports.filter((p) => p !== port);
                                  } else {
                                    v.ports = [...v.ports, port];
                                  }
                                  vlans[idx] = v;
                                  update("vlans", vlans);
                                }}
                                className={`text-[9px] px-1.5 py-0.5 rounded font-mono transition-colors ${isInVlan ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground border border-border hover:bg-secondary"}`}
                              >
                                {port}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add VLAN */}
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Nova VLAN
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px]">ID</Label>
                      <Input
                        value={newVlanId}
                        onChange={(e) => setNewVlanId(e.target.value)}
                        className="h-7 text-xs font-mono"
                        placeholder="10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Nome</Label>
                      <Input
                        value={newVlanName}
                        onChange={(e) => setNewVlanName(e.target.value)}
                        className="h-7 text-xs font-mono"
                        placeholder="VLAN10"
                      />
                    </div>
                  </div>
                  <Button
                    data-ocid="config.button"
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={() => {
                      const id = Number.parseInt(newVlanId);
                      if (Number.isNaN(id) || !newVlanName) return;
                      const newVlan: VlanConfig = {
                        id,
                        name: newVlanName,
                        ports: [],
                      };
                      update("vlans", [...(form.vlans || []), newVlan]);
                      setNewVlanId("");
                      setNewVlanName("");
                    }}
                  >
                    <Plus size={10} className="mr-1" /> Criar VLAN
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        )}

        {/* ROTEAMENTO */}
        {showRouting && (
          <TabsContent
            value="roteamento"
            className="flex-1 overflow-hidden mt-0"
          >
            <ScrollArea className="h-full">
              <div className="p-3 space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Tabela de Roteamento
                </Label>

                {/* Connected route */}
                {form.ip && (
                  <div className="p-1.5 rounded bg-secondary font-mono text-[10px]">
                    <span className="text-green-400">C</span>{" "}
                    <span className="text-foreground">
                      {form.ip}/{form.subnetMask || "255.255.255.0"}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      diretamente conectada
                    </span>
                  </div>
                )}

                {(form.routingTable || []).map((route, routeIdx) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: routing entries need index key
                    key={routeIdx}
                    className="flex items-center justify-between p-1.5 rounded bg-secondary font-mono text-[10px] gap-1"
                  >
                    <span
                      style={{
                        color:
                          route.protocol === "static"
                            ? "#F59E0B"
                            : route.protocol === "ospf"
                              ? "#4B9EFF"
                              : "#22C55E",
                      }}
                    >
                      {route.protocol === "connected"
                        ? "C"
                        : route.protocol === "static"
                          ? "S"
                          : route.protocol === "ospf"
                            ? "O"
                            : "R"}
                    </span>
                    <span className="text-foreground flex-1">
                      {route.network}/{route.mask}
                    </span>
                    <span className="text-muted-foreground">
                      via {route.nextHop}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => {
                        const routes = [...(form.routingTable || [])];
                        routes.splice(routeIdx, 1);
                        update("routingTable", routes);
                      }}
                    >
                      <Trash2 size={8} />
                    </Button>
                  </div>
                ))}

                {/* Add route form */}
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Rota Estática
                  </Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Rede Destino</Label>
                      <Input
                        value={newRoute.network || ""}
                        onChange={(e) =>
                          setNewRoute((p) => ({
                            ...p,
                            network: e.target.value,
                          }))
                        }
                        className="h-7 text-[10px] font-mono"
                        placeholder="10.0.0.0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Máscara</Label>
                      <Input
                        value={newRoute.mask || ""}
                        onChange={(e) =>
                          setNewRoute((p) => ({ ...p, mask: e.target.value }))
                        }
                        className="h-7 text-[10px] font-mono"
                        placeholder="255.255.255.0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Próximo Salto</Label>
                      <Input
                        value={newRoute.nextHop || ""}
                        onChange={(e) =>
                          setNewRoute((p) => ({
                            ...p,
                            nextHop: e.target.value,
                          }))
                        }
                        className="h-7 text-[10px] font-mono"
                        placeholder="192.168.1.1"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Interface</Label>
                      <Input
                        value={newRoute.interface || ""}
                        onChange={(e) =>
                          setNewRoute((p) => ({
                            ...p,
                            interface: e.target.value,
                          }))
                        }
                        className="h-7 text-[10px] font-mono"
                        placeholder="Fa0/0"
                      />
                    </div>
                  </div>
                  <Button
                    data-ocid="config.button"
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={() => {
                      if (!newRoute.network || !newRoute.nextHop) return;
                      const route: RoutingEntry = {
                        network: newRoute.network || "",
                        mask: newRoute.mask || "255.255.255.0",
                        nextHop: newRoute.nextHop || "",
                        interface: newRoute.interface || "Fa0/0",
                        protocol: "static",
                        metric: newRoute.metric || 1,
                      };
                      update("routingTable", [
                        ...(form.routingTable || []),
                        route,
                      ]);
                      setNewRoute({
                        network: "",
                        mask: "255.255.255.0",
                        nextHop: "",
                        interface: "Fa0/0",
                        protocol: "static",
                        metric: 1,
                      });
                    }}
                  >
                    <Plus size={10} className="mr-1" /> Adicionar Rota
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        )}

        {/* ACL */}
        {showAcl && (
          <TabsContent value="acl" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Regras ACL
                </Label>

                {(form.aclRules || []).length === 0 && (
                  <div
                    data-ocid="config.empty_state"
                    className="text-center py-4 text-[11px] text-muted-foreground"
                  >
                    Nenhuma regra ACL configurada
                  </div>
                )}

                <div className="space-y-1">
                  {(form.aclRules || []).map((rule, idx) => (
                    <div
                      key={rule.id}
                      className="flex items-center gap-1.5 p-1.5 rounded bg-secondary"
                    >
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1 h-4 shrink-0 ${
                          rule.action === "permit"
                            ? "border-green-500/60 text-green-400"
                            : "border-destructive/60 text-destructive"
                        }`}
                      >
                        {rule.action.toUpperCase()}
                      </Badge>
                      <span className="text-[10px] font-mono text-muted-foreground flex-1 truncate">
                        {rule.protocol} {rule.sourceIp}→{rule.destIp}
                      </span>
                      <Button
                        data-ocid="config.delete_button"
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => {
                          const rules = [...(form.aclRules || [])];
                          rules.splice(idx, 1);
                          update("aclRules", rules);
                        }}
                      >
                        <Trash2 size={8} />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Add ACL Rule */}
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Nova Regra
                  </Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Ação</Label>
                      <select
                        value={newAcl.action}
                        onChange={(e) =>
                          setNewAcl((p) => ({
                            ...p,
                            action: e.target.value as AclRule["action"],
                          }))
                        }
                        className="h-7 w-full rounded border border-border bg-background text-xs px-2 font-mono"
                      >
                        <option value="permit">permit</option>
                        <option value="deny">deny</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Protocolo</Label>
                      <select
                        value={newAcl.protocol}
                        onChange={(e) =>
                          setNewAcl((p) => ({
                            ...p,
                            protocol: e.target.value as AclRule["protocol"],
                          }))
                        }
                        className="h-7 w-full rounded border border-border bg-background text-xs px-2 font-mono"
                      >
                        <option value="any">any</option>
                        <option value="icmp">icmp</option>
                        <option value="tcp">tcp</option>
                        <option value="udp">udp</option>
                        <option value="ip">ip</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">IP Origem</Label>
                      <Input
                        value={newAcl.sourceIp || ""}
                        onChange={(e) =>
                          setNewAcl((p) => ({ ...p, sourceIp: e.target.value }))
                        }
                        className="h-7 text-[10px] font-mono"
                        placeholder="any"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">IP Destino</Label>
                      <Input
                        value={newAcl.destIp || ""}
                        onChange={(e) =>
                          setNewAcl((p) => ({ ...p, destIp: e.target.value }))
                        }
                        className="h-7 text-[10px] font-mono"
                        placeholder="any"
                      />
                    </div>
                  </div>
                  <Input
                    value={newAcl.description || ""}
                    onChange={(e) =>
                      setNewAcl((p) => ({ ...p, description: e.target.value }))
                    }
                    className="h-7 text-[10px] font-mono"
                    placeholder="Descrição (opcional)"
                  />
                  <Button
                    data-ocid="config.button"
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={() => {
                      const rule: AclRule = {
                        id: generateId(),
                        action:
                          (newAcl.action as AclRule["action"]) || "permit",
                        protocol:
                          (newAcl.protocol as AclRule["protocol"]) || "any",
                        sourceIp: newAcl.sourceIp || "any",
                        sourceMask: newAcl.sourceMask || "0.0.0.0",
                        destIp: newAcl.destIp || "any",
                        destMask: newAcl.destMask || "0.0.0.0",
                        description: newAcl.description || "",
                      };
                      update("aclRules", [...(form.aclRules || []), rule]);
                      setNewAcl({
                        action: "permit",
                        protocol: "any",
                        sourceIp: "any",
                        sourceMask: "0.0.0.0",
                        destIp: "any",
                        destMask: "0.0.0.0",
                        description: "",
                      });
                    }}
                  >
                    <Plus size={10} className="mr-1" /> Adicionar Regra
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        )}
      </Tabs>

      {/* Footer */}
      <div className="p-2 border-t border-border flex gap-2">
        <Button
          data-ocid="config.save_button"
          onClick={handleSave}
          size="sm"
          className="flex-1 bg-primary text-primary-foreground hover:opacity-90 h-7 text-xs"
        >
          <Save size={10} className="mr-1" />
          Salvar
        </Button>
        <Button
          data-ocid="config.delete_button"
          onClick={() => onDelete(device.id)}
          size="sm"
          variant="destructive"
          className="px-2 h-7"
        >
          <Trash2 size={10} />
        </Button>
      </div>
    </div>
  );
}
