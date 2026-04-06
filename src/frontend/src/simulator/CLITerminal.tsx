import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef, useState } from "react";
import { generateId } from "./engine";
import type {
  AclRule,
  CliHistoryEntry,
  Connection,
  Device,
  DhcpPool,
  RoutingEntry,
} from "./types";

interface CLITerminalProps {
  device: Device;
  devices: Device[];
  connections: Connection[];
  onDeviceUpdate: (updated: Device) => void;
  onPingRequest: (targetIp: string) => void;
}

type CliMode =
  | "user"
  | "enable"
  | "config"
  | "config-if"
  | "config-router"
  | "config-dhcp"
  | "config-acl"
  | "config-vlan";

interface CliState {
  mode: CliMode;
  currentInterface: string;
  currentRouter: string;
  currentDhcpPool: string;
  currentAcl: string;
  currentVlan: number;
}

function getPrompt(hostname: string, mode: CliMode): string {
  switch (mode) {
    case "user":
      return `${hostname}>`;
    case "enable":
      return `${hostname}#`;
    case "config":
      return `${hostname}(config)#`;
    case "config-if":
      return `${hostname}(config-if)#`;
    case "config-router":
      return `${hostname}(config-router)#`;
    case "config-dhcp":
      return `${hostname}(dhcp-config)#`;
    case "config-acl":
      return `${hostname}(config-ext-nacl)#`;
    case "config-vlan":
      return `${hostname}(config-vlan)#`;
    default:
      return `${hostname}#`;
  }
}

function ipToNumber(ip: string): number {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4) return 0;
  return (
    ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
  );
}

function numberToIp(n: number): string {
  return [
    (n >>> 24) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 8) & 0xff,
    n & 0xff,
  ].join(".");
}

const BANNER = [
  "Packet Trace E.B - Cisco IOS Simulator",
  "Copyright (c) Packet Trace E.B. All rights reserved.",
  "",
  "Digite 'help' para lista de comandos.",
  "",
];

type LineType = "output" | "input" | "error" | "banner";

function getDefaultServices() {
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

const GLOBAL_COMMANDS = [
  "enable",
  "disable",
  "configure",
  "hostname",
  "interface",
  "ip",
  "router",
  "access-list",
  "vlan",
  "show",
  "ping",
  "traceroute",
  "clear",
  "exit",
  "end",
  "help",
];

const SHOW_COMMANDS = ["interfaces", "version", "ip", "vlan", "running-config"];

function getTabCompletions(inputStr: string, _mode: CliMode): string[] {
  const parts = inputStr.split(" ");
  const lastPart = parts[parts.length - 1].toLowerCase();
  if (parts.length === 1) {
    return GLOBAL_COMMANDS.filter(
      (c) => c.startsWith(lastPart) && c !== lastPart,
    );
  }
  if (parts[0] === "show" && parts.length === 2) {
    return SHOW_COMMANDS.filter(
      (c) => c.startsWith(lastPart) && c !== lastPart,
    );
  }
  return [];
}

export function CLITerminal({
  device,
  devices: _devices,
  connections,
  onDeviceUpdate,
  onPingRequest,
}: CLITerminalProps) {
  const [lines, setLines] = useState<{ text: string; type: LineType }[]>(
    BANNER.map((t) => ({ text: t, type: "banner" as LineType })),
  );
  const [input, setInput] = useState("");
  const [cliState, setCliState] = useState<CliState>({
    mode: "user",
    currentInterface: "",
    currentRouter: "",
    currentDhcpPool: "",
    currentAcl: "",
    currentVlan: 0,
  });
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const deviceRef = useRef(device);
  deviceRef.current = device;

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on device id change only
  useEffect(() => {
    setLines(BANNER.map((t) => ({ text: t, type: "banner" as LineType })));
    setInput("");
    setCliState({
      mode: "user",
      currentInterface: "",
      currentRouter: "",
      currentDhcpPool: "",
      currentAcl: "",
      currentVlan: 0,
    });
    setCmdHistory([]);
    setHistoryIdx(-1);
  }, [device.id]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll when lines change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const addLine = (text: string, type: LineType = "output") => {
    setLines((prev) => [...prev, { text, type }]);
  };

  const addLines = (texts: string[], type: LineType = "output") => {
    setLines((prev) => [...prev, ...texts.map((text) => ({ text, type }))]);
  };

  const processCommand = (
    cmd: string,
    state: CliState,
    currentDevice: Device,
  ): CliState => {
    const trimmed = cmd.trim();
    const parts = trimmed.toLowerCase().split(/\s+/);
    const rawParts = trimmed.split(/\s+/);
    const prompt = getPrompt(currentDevice.hostname, state.mode);

    addLine(`${prompt} ${trimmed}`, "input");

    if (!trimmed) return state;

    // Save CLI history
    const histEntry: CliHistoryEntry = {
      input: trimmed,
      output: "",
      timestamp: Date.now(),
    };
    onDeviceUpdate({
      ...currentDevice,
      cliHistory: [...(currentDevice.cliHistory || []), histEntry],
    });

    // Help
    if (parts[0] === "help" || parts[0] === "?") {
      addLines([
        "Comandos disponíveis:",
        "  enable / en              Modo privilegiado",
        "  disable                  Voltar ao modo usuário",
        "  configure terminal       Modo de configuração",
        "  exit / end               Sair do modo atual",
        "  hostname <nome>          Alterar hostname",
        "  interface <if>           Configurar interface",
        "  ip address <ip> <mask>   Definir endereço IP",
        "  ipv6 address <ip/pref>   Definir endereço IPv6",
        "  no shutdown              Ativar interface",
        "  shutdown                 Desativar interface",
        "  show ip interface brief  Resumo de interfaces",
        "  show running-config      Configuração atual",
        "  show interfaces          Detalhes de interfaces",
        "  show ip route            Tabela de roteamento",
        "  show version             Informações do dispositivo",
        "  ping <ip>                Testar conectividade",
        "  traceroute <ip>          Rastrear rota",
        "  ip route <dest> <mask>   Adicionar rota estática",
        "  router rip               Configurar RIP",
        "  router ospf <id>         Configurar OSPF",
        "  ip dhcp pool <nome>      Configurar pool DHCP",
        "  vlan <id>                Configurar VLAN",
        "  access-list <n> ...      Criar ACL",
        "  clear                    Limpar tela",
      ]);
      return state;
    }

    if (parts[0] === "clear") {
      setLines(BANNER.map((t) => ({ text: t, type: "banner" as LineType })));
      return state;
    }

    // User mode
    if (state.mode === "user") {
      if (parts[0] === "enable" || parts[0] === "en") {
        addLine("");
        return { ...state, mode: "enable" };
      }
      if (parts[0] === "ping") {
        const ip = rawParts[1];
        if (!ip) {
          addLine("% Endereço IP requerido", "error");
          return state;
        }
        addLine(`Executando ping para ${ip}...`);
        addLine("Enviando 5 pacotes ICMP Echo Request...");
        onPingRequest(ip);
        return state;
      }
      if (parts[0] === "show") return handleShow(parts, state, currentDevice);
      addLine(
        "% Comando não disponível no modo usuário. Digite 'enable' primeiro.",
        "error",
      );
      return state;
    }

    // Enable mode
    if (state.mode === "enable") {
      if (parts[0] === "disable" || parts[0] === "exit") {
        addLine("");
        return { ...state, mode: "user" };
      }
      if (
        (parts[0] === "configure" && parts[1] === "terminal") ||
        (parts[0] === "conf" && parts[1] === "t")
      ) {
        addLine("Entrando no modo de configuração global.");
        return { ...state, mode: "config" };
      }
      if (parts[0] === "show") return handleShow(parts, state, currentDevice);
      if (parts[0] === "ping") {
        const ip = rawParts[1];
        if (!ip) {
          addLine("% Endereço IP requerido", "error");
          return state;
        }
        addLine(`Executando ping para ${ip}...`);
        onPingRequest(ip);
        return state;
      }
      if (parts[0] === "traceroute" || parts[0] === "tracert") {
        const ip = rawParts[1];
        if (!ip) {
          addLine("% Endereço IP requerido", "error");
          return state;
        }
        addLine(`Executando traceroute para ${ip}...`);
        onPingRequest(ip);
        return state;
      }
      addLine(`% Comando desconhecido: '${parts[0]}'`, "error");
      return state;
    }

    // Config mode
    if (state.mode === "config") {
      if (parts[0] === "exit" || parts[0] === "end") {
        addLine("");
        return { ...state, mode: "enable" };
      }
      if (parts[0] === "hostname" && rawParts[1]) {
        onDeviceUpdate({ ...currentDevice, hostname: rawParts[1] });
        addLine(`Hostname alterado para: ${rawParts[1]}`);
        return state;
      }
      if ((parts[0] === "interface" || parts[0] === "int") && rawParts[1]) {
        const ifName = rawParts.slice(1).join(" ");
        addLine(`Configurando interface ${ifName}`);
        return { ...state, mode: "config-if", currentInterface: ifName };
      }
      if (parts[0] === "ip" && parts[1] === "route") {
        const dest = rawParts[2];
        const mask = rawParts[3];
        const nextHop = rawParts[4];
        if (!dest || !mask || !nextHop) {
          addLine(
            "% Sintaxe: ip route <rede> <mascara> <proximo-salto>",
            "error",
          );
          return state;
        }
        const newRoute: RoutingEntry = {
          network: dest,
          mask,
          nextHop,
          interface: "Fa0/0",
          protocol: "static",
          metric: 1,
        };
        const filtered = (currentDevice.routingTable || []).filter(
          (r) => r.network !== dest || r.mask !== mask,
        );
        onDeviceUpdate({
          ...currentDevice,
          routingTable: [...filtered, newRoute],
        });
        addLine(`Rota estática adicionada: ${dest}/${mask} via ${nextHop}`);
        return state;
      }
      if (parts[0] === "no" && parts[1] === "ip" && parts[2] === "route") {
        const dest = rawParts[3];
        if (!dest) {
          addLine("% Rota não especificada", "error");
          return state;
        }
        onDeviceUpdate({
          ...currentDevice,
          routingTable: (currentDevice.routingTable || []).filter(
            (r) => r.network !== dest,
          ),
        });
        addLine(`Rota removida: ${dest}`);
        return state;
      }
      if (parts[0] === "router" && parts[1] === "rip") {
        const services = {
          ...(currentDevice.services || getDefaultServices()),
          ripEnabled: true,
        };
        onDeviceUpdate({ ...currentDevice, services });
        addLine("Protocolo RIP ativado.");
        return { ...state, mode: "config-router", currentRouter: "rip" };
      }
      if (parts[0] === "router" && parts[1] === "ospf") {
        const processId = Number.parseInt(rawParts[2] || "1");
        const services = {
          ...(currentDevice.services || getDefaultServices()),
          ospfEnabled: true,
          ospfProcessId: processId,
        };
        onDeviceUpdate({ ...currentDevice, services });
        addLine(`Protocolo OSPF processo ${processId} ativado.`);
        return {
          ...state,
          mode: "config-router",
          currentRouter: `ospf ${processId}`,
        };
      }
      if (parts[0] === "ip" && parts[1] === "dhcp" && parts[2] === "pool") {
        const poolName = rawParts[3];
        if (!poolName) {
          addLine("% Nome do pool requerido", "error");
          return state;
        }
        const existingPools = currentDevice.dhcpPools || [];
        if (!existingPools.find((p) => p.poolName === poolName)) {
          const newPool: DhcpPool = {
            poolName,
            networkAddr: "",
            mask: "255.255.255.0",
            defaultRouter: "",
            dnsServer: "",
            startIp: "",
            endIp: "",
            leaseTime: 86400,
            assignedIps: [],
          };
          onDeviceUpdate({
            ...currentDevice,
            dhcpPools: [...existingPools, newPool],
            services: {
              ...(currentDevice.services || getDefaultServices()),
              dhcp: true,
            },
          });
        }
        addLine(`Pool DHCP '${poolName}' criado/selecionado.`);
        return { ...state, mode: "config-dhcp", currentDhcpPool: poolName };
      }
      if (
        parts[0] === "ip" &&
        parts[1] === "dhcp" &&
        parts[2] === "excluded-address"
      ) {
        addLine(
          `Endereços excluídos: ${rawParts[3] || ""} - ${rawParts[4] || rawParts[3] || ""}`,
        );
        return state;
      }
      if (parts[0] === "vlan") {
        const vlanId = Number.parseInt(rawParts[1]);
        if (Number.isNaN(vlanId)) {
          addLine("% ID de VLAN inválido", "error");
          return state;
        }
        const existing = currentDevice.vlans || [];
        if (!existing.find((v) => v.id === vlanId)) {
          onDeviceUpdate({
            ...currentDevice,
            vlans: [
              ...existing,
              { id: vlanId, name: `VLAN${vlanId}`, ports: [] },
            ],
          });
        }
        addLine(`VLAN ${vlanId} configurada.`);
        return { ...state, mode: "config-vlan", currentVlan: vlanId };
      }
      if (parts[0] === "access-list") {
        const aclNum = rawParts[1];
        const action = parts[2] as "permit" | "deny";
        const protocol = (parts[3] as AclRule["protocol"]) || "any";
        const srcIp = rawParts[4] || "any";
        const srcMask = rawParts[5] || "0.0.0.0";
        const dstIp = rawParts[6] || "any";
        const dstMask = rawParts[7] || "0.0.0.0";
        if (!aclNum || (action !== "permit" && action !== "deny")) {
          addLine(
            "% Sintaxe: access-list <número> permit|deny <protocolo> <src> <dst>",
            "error",
          );
          return state;
        }
        const rule: AclRule = {
          id: generateId(),
          action,
          protocol,
          sourceIp: srcIp,
          sourceMask: srcMask,
          destIp: dstIp,
          destMask: dstMask,
          description: `ACL ${aclNum}`,
        };
        onDeviceUpdate({
          ...currentDevice,
          aclRules: [...(currentDevice.aclRules || []), rule],
        });
        addLine(
          `Regra ACL adicionada: ${action.toUpperCase()} ${protocol} ${srcIp} ${dstIp}`,
        );
        return state;
      }
      if (parts[0] === "ip" && parts[1] === "access-list") {
        const aclName = rawParts[3] || "";
        addLine(`Lista de acesso '${aclName}' selecionada.`);
        return { ...state, mode: "config-acl", currentAcl: aclName };
      }
      if (parts[0] === "ip" && parts[1] === "nat") {
        addLine(
          `NAT ${parts[2]} configurado em ${state.currentInterface || "Fa0/0"}.`,
        );
        return state;
      }
      addLine(`% Comando desconhecido: '${parts[0]}'`, "error");
      return state;
    }

    // Config-if mode
    if (state.mode === "config-if") {
      if (parts[0] === "exit") {
        addLine("");
        return { ...state, mode: "config" };
      }
      if (parts[0] === "end") {
        addLine("");
        return { ...state, mode: "enable" };
      }
      if (parts[0] === "ip" && parts[1] === "address") {
        const ip = rawParts[2];
        const mask = rawParts[3];
        if (!ip || !mask) {
          addLine("% Sintaxe: ip address <ip> <mascara>", "error");
          return state;
        }
        onDeviceUpdate({ ...currentDevice, ip, subnetMask: mask });
        addLine(`IP configurado: ${ip} ${mask}`);
        return state;
      }
      if (parts[0] === "ipv6" && parts[1] === "address") {
        const ipv6 = rawParts[2];
        if (!ipv6) {
          addLine("% Endereço IPv6 requerido", "error");
          return state;
        }
        const [addr, prefix] = ipv6.split("/");
        onDeviceUpdate({
          ...currentDevice,
          ipv6Address: addr,
          ipv6Prefix: Number.parseInt(prefix || "64"),
        });
        addLine(`Endereço IPv6 configurado: ${ipv6}`);
        return state;
      }
      if (parts[0] === "no" && parts[1] === "shutdown") {
        addLine(`Interface ${state.currentInterface} ativada (Up).`);
        return state;
      }
      if (parts[0] === "shutdown") {
        addLine(`Interface ${state.currentInterface} desativada (Down).`);
        return state;
      }
      if (parts[0] === "switchport" && parts[1] === "mode") {
        addLine(
          `Porta ${state.currentInterface} definida como modo ${parts[2]}.`,
        );
        return state;
      }
      if (
        parts[0] === "switchport" &&
        parts[1] === "access" &&
        parts[2] === "vlan"
      ) {
        addLine(
          `Porta ${state.currentInterface} atribuída à VLAN ${rawParts[3]}.`,
        );
        return state;
      }
      if (parts[0] === "ip" && parts[1] === "nat") {
        addLine(
          `Interface ${state.currentInterface} marcada como NAT ${parts[2]}.`,
        );
        return state;
      }
      addLine(`% Comando desconhecido: '${parts[0]}'`, "error");
      return state;
    }

    // Config-router mode
    if (state.mode === "config-router") {
      if (parts[0] === "exit") {
        addLine("");
        return { ...state, mode: "config" };
      }
      if (parts[0] === "end") {
        addLine("");
        return { ...state, mode: "enable" };
      }
      if (parts[0] === "network") {
        addLine(
          `Rede ${rawParts[1]} adicionada ao ${state.currentRouter.toUpperCase()}.`,
        );
        return state;
      }
      if (parts[0] === "version") {
        addLine(`RIP versão ${rawParts[1]} configurado.`);
        return state;
      }
      if (parts[0] === "area") {
        addLine(`Área OSPF ${rawParts[1]} configurada.`);
        return state;
      }
      addLine(
        `% Comando desconhecido no modo roteamento: '${parts[0]}'`,
        "error",
      );
      return state;
    }

    // Config-dhcp mode
    if (state.mode === "config-dhcp") {
      if (parts[0] === "exit") {
        addLine("");
        return { ...state, mode: "config" };
      }
      if (parts[0] === "end") {
        addLine("");
        return { ...state, mode: "enable" };
      }
      const existingPools = [...(deviceRef.current.dhcpPools || [])];
      const poolIdx = existingPools.findIndex(
        (p) => p.poolName === state.currentDhcpPool,
      );
      if (parts[0] === "network" && poolIdx >= 0) {
        const addr = rawParts[1];
        const mask = rawParts[2];
        const networkNum = ipToNumber(addr);
        const maskNum = ipToNumber(mask || "255.255.255.0");
        const startNum = (networkNum & maskNum) + 1;
        const endNum = (networkNum | (~maskNum >>> 0)) - 1;
        existingPools[poolIdx] = {
          ...existingPools[poolIdx],
          networkAddr: addr,
          mask: mask || "255.255.255.0",
          startIp: numberToIp(startNum),
          endIp: numberToIp(endNum > startNum + 50 ? startNum + 50 : endNum),
        };
        onDeviceUpdate({ ...deviceRef.current, dhcpPools: existingPools });
        addLine(`Rede do pool: ${addr} ${mask || "255.255.255.0"}`);
        return state;
      }
      if (parts[0] === "default-router" && poolIdx >= 0) {
        existingPools[poolIdx] = {
          ...existingPools[poolIdx],
          defaultRouter: rawParts[1],
        };
        onDeviceUpdate({ ...deviceRef.current, dhcpPools: existingPools });
        addLine(`Gateway padrão: ${rawParts[1]}`);
        return state;
      }
      if (parts[0] === "dns-server" && poolIdx >= 0) {
        existingPools[poolIdx] = {
          ...existingPools[poolIdx],
          dnsServer: rawParts[1],
        };
        onDeviceUpdate({ ...deviceRef.current, dhcpPools: existingPools });
        addLine(`Servidor DNS: ${rawParts[1]}`);
        return state;
      }
      if (parts[0] === "lease") {
        addLine(`Tempo de lease: ${rawParts[1]} dias`);
        return state;
      }
      addLine(`% Comando desconhecido no modo DHCP: '${parts[0]}'`, "error");
      return state;
    }

    // Config-acl mode
    if (state.mode === "config-acl") {
      if (parts[0] === "exit") {
        addLine("");
        return { ...state, mode: "config" };
      }
      if (parts[0] === "end") {
        addLine("");
        return { ...state, mode: "enable" };
      }
      if (parts[0] === "permit" || parts[0] === "deny") {
        const action = parts[0] as "permit" | "deny";
        const protocol = (parts[1] as AclRule["protocol"]) || "any";
        const rule: AclRule = {
          id: generateId(),
          action,
          protocol,
          sourceIp: rawParts[2] || "any",
          sourceMask: rawParts[3] || "0.0.0.0",
          destIp: rawParts[4] || "any",
          destMask: rawParts[5] || "0.0.0.0",
          description: state.currentAcl,
        };
        onDeviceUpdate({
          ...deviceRef.current,
          aclRules: [...(deviceRef.current.aclRules || []), rule],
        });
        addLine(`Regra adicionada: ${action.toUpperCase()} ${protocol}`);
        return state;
      }
      addLine(`% Comando desconhecido na ACL: '${parts[0]}'`, "error");
      return state;
    }

    // Config-vlan mode
    if (state.mode === "config-vlan") {
      if (parts[0] === "exit") {
        addLine("");
        return { ...state, mode: "config" };
      }
      if (parts[0] === "end") {
        addLine("");
        return { ...state, mode: "enable" };
      }
      if (parts[0] === "name") {
        const existing = [...(deviceRef.current.vlans || [])];
        const idx = existing.findIndex((v) => v.id === state.currentVlan);
        if (idx >= 0) {
          existing[idx] = { ...existing[idx], name: rawParts[1] };
          onDeviceUpdate({ ...deviceRef.current, vlans: existing });
        }
        addLine(`VLAN ${state.currentVlan} nomeada: ${rawParts[1]}`);
        return state;
      }
      addLine(`% Comando desconhecido no modo VLAN: '${parts[0]}'`, "error");
      return state;
    }

    addLine(`% Comando desconhecido: '${parts[0]}'`, "error");
    return state;
  };

  const handleShow = (
    parts: string[],
    state: CliState,
    currentDevice: Device,
  ): CliState => {
    const sub = parts[1];
    const sub2 = parts[2];

    if (sub === "ip" && sub2 === "interface" && parts[3] === "brief") {
      addLine("Interface              IP-Address      Status     Protocol");
      addLine("-".repeat(60));
      const deviceConns = connections.filter(
        (c) =>
          c.sourceId === currentDevice.id || c.targetId === currentDevice.id,
      );
      const usedPorts = deviceConns.map((c) =>
        c.sourceId === currentDevice.id ? c.sourcePort : c.targetPort,
      );
      const mainPort = "Fa0/0";
      const isUp = usedPorts.includes(mainPort);
      addLine(
        `${mainPort.padEnd(22)} ${(currentDevice.ip || "unassigned").padEnd(15)} ${isUp ? "up" : "down".padEnd(10)} ${isUp ? "up" : "down"}`,
      );
      if (currentDevice.ipv6Address) {
        addLine(
          `  IPv6: ${currentDevice.ipv6Address}/${currentDevice.ipv6Prefix ?? 64}`,
        );
      }
      return state;
    }

    if (sub === "running-config" || sub === "run") {
      addLines([
        "Building configuration...",
        "Current configuration:",
        "!",
        `hostname ${currentDevice.hostname}`,
        "!",
        "interface Fa0/0",
        ` ip address ${currentDevice.ip || "0.0.0.0"} ${currentDevice.subnetMask || "255.255.255.0"}`,
        ...(currentDevice.ipv6Address
          ? [
              ` ipv6 address ${currentDevice.ipv6Address}/${currentDevice.ipv6Prefix ?? 64}`,
            ]
          : []),
        " no shutdown",
        "!",
        ...(currentDevice.routingTable
          ?.filter((r) => r.protocol === "static")
          .map((r) => `ip route ${r.network} ${r.mask} ${r.nextHop}`) || []),
        ...(currentDevice.services?.ripEnabled
          ? ["router rip", " version 2", "!"]
          : []),
        ...(currentDevice.services?.ospfEnabled
          ? [`router ospf ${currentDevice.services.ospfProcessId || 1}`, "!"]
          : []),
        ...(currentDevice.aclRules?.map(
          (rule) =>
            `access-list 1 ${rule.action} ${rule.protocol} ${rule.sourceIp} ${rule.destIp}`,
        ) || []),
        "end",
      ]);
      return state;
    }

    if (sub === "interfaces") {
      addLines([
        "FastEthernet0/0 is up, line protocol is up",
        `  Hardware is FastEthernet, address is ${currentDevice.id.replace(/-/g, "").slice(0, 12).padEnd(12, "0").toUpperCase().match(/.{2}/g)?.join(":") || "00:00:00:00:00:00"}`,
        `  Internet address is ${currentDevice.ip || "0.0.0.0"}/${currentDevice.subnetMask || "255.255.255.0"}`,
        "  MTU 1500 bytes, BW 100000 Kbit/sec",
        "  Full-duplex, 100Mb/s",
      ]);
      return state;
    }

    if (sub === "ip" && sub2 === "route") {
      addLine("Codes: C - connected, S - static, R - RIP, O - OSPF");
      addLine("");
      const routes = currentDevice.routingTable || [];
      if (routes.length === 0 && currentDevice.ip) {
        const netParts = currentDevice.ip.split(".").map(Number);
        const maskParts = (currentDevice.subnetMask || "255.255.255.0")
          .split(".")
          .map(Number);
        const network = netParts.map((n, i) => n & maskParts[i]).join(".");
        addLine(
          `C    ${network}/${currentDevice.subnetMask || "255.255.255.0"} is directly connected, Fa0/0`,
        );
      }
      for (const r of routes) {
        const code =
          r.protocol === "connected"
            ? "C"
            : r.protocol === "static"
              ? "S"
              : r.protocol === "rip"
                ? "R"
                : "O";
        addLine(
          `${code}    ${r.network}/${r.mask} [${r.metric}/0] via ${r.nextHop}, ${r.interface}`,
        );
      }
      return state;
    }

    if (sub === "version") {
      addLines([
        "Packet Trace E.B IOS Simulator",
        `System image file is "flash:ios-simulator.bin"`,
        "",
        `Device Type: ${currentDevice.type.toUpperCase()}`,
        `Hostname: ${currentDevice.hostname}`,
        `IP Address: ${currentDevice.ip || "not configured"}`,
        ...(currentDevice.ipv6Address
          ? [
              `IPv6 Address: ${currentDevice.ipv6Address}/${currentDevice.ipv6Prefix ?? 64}`,
            ]
          : []),
        "Uptime: 0 days, 1 hours, 0 minutes",
      ]);
      return state;
    }

    if (sub === "vlan") {
      addLine("VLAN   Nome               Status    Portas");
      addLine("------ ------------------ --------- --------------------");
      const vlans = currentDevice.vlans || [];
      if (vlans.length === 0) addLine("1      default            active");
      for (const v of vlans) {
        addLine(
          `${String(v.id).padEnd(6)} ${v.name.padEnd(18)} active    ${v.ports.join(", ")}`,
        );
      }
      return state;
    }

    addLine(
      `% Subcomando show desconhecido: '${parts.slice(1).join(" ")}'`,
      "error",
    );
    return state;
  };

  const handleSubmit = () => {
    const cmd = input;
    setInput("");
    const newHistory = [cmd, ...cmdHistory].slice(0, 50);
    setCmdHistory(newHistory);
    setHistoryIdx(-1);
    setCliState((prev) => processCommand(cmd, prev, deviceRef.current));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIdx = Math.min(historyIdx + 1, cmdHistory.length - 1);
      setHistoryIdx(newIdx);
      if (cmdHistory[newIdx] !== undefined) setInput(cmdHistory[newIdx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIdx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(newIdx);
      if (newIdx === -1) setInput("");
      else if (cmdHistory[newIdx] !== undefined) setInput(cmdHistory[newIdx]);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const completions = getTabCompletions(input.trim(), cliState.mode);
      if (completions.length === 1) {
        const pts = input.split(" ");
        pts[pts.length - 1] = completions[0];
        setInput(pts.join(" "));
      } else if (completions.length > 1) {
        addLine(
          `${getPrompt(device.hostname, cliState.mode)} ${input}`,
          "input",
        );
        addLine(completions.join("  "));
      }
    }
  };

  const prompt = getPrompt(device.hostname, cliState.mode);

  return (
    <div
      data-ocid="cli.editor"
      className="flex flex-col bg-black rounded-lg overflow-hidden font-mono text-xs border border-border cursor-text"
      style={{ minHeight: "280px", maxHeight: "480px" }}
    >
      {/* Terminal output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-0.5 cursor-text"
        style={{ minHeight: "200px", maxHeight: "380px" }}
      >
        {lines.map((line, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: stable terminal lines
            key={i}
            className={
              line.type === "banner"
                ? "text-green-400 opacity-70"
                : line.type === "input"
                  ? "text-green-300"
                  : line.type === "error"
                    ? "text-red-400"
                    : "text-green-200"
            }
            style={{ whiteSpace: "pre-wrap", lineHeight: "1.5" }}
          >
            {line.text || "\u00a0"}
          </div>
        ))}
      </div>

      {/* Input row */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-green-900/40 bg-black">
        <span className="text-green-400 shrink-0 select-none text-xs">
          {prompt}
        </span>
        <input
          ref={inputRef}
          data-ocid="cli.input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-green-300 outline-none caret-green-400 text-xs font-mono"
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
        />
      </div>
    </div>
  );
}
