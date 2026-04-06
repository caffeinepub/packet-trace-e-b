import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  List,
  RotateCcw,
  Trophy,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useActor } from "../hooks/useActor";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number; // 0=A 1=B 2=C 3=D
}

interface Module {
  id: number;
  title: string;
  description: string;
  content: React.ReactNode;
  quiz: QuizQuestion[];
}

interface ModuleProgressState {
  completed: boolean;
  score: number;
  completedAt: string;
}

type ProgressMap = Record<number, ModuleProgressState>;

const STORAGE_KEY = "pte-course-progress";
const PASS_SCORE = 70;

// ─── Module Content ───────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="font-heading text-lg font-semibold text-primary mb-3">
        {title}
      </h3>
      <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 my-3 text-sm text-foreground leading-relaxed">
      {children}
    </div>
  );
}

function TableRow2({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-1.5 border-b border-border last:border-0">
      <span className="font-semibold text-foreground min-w-[140px]">
        {label}
      </span>
      <span className="text-muted-foreground">{value}</span>
    </div>
  );
}

const OSI_LAYERS = [
  {
    n: 7,
    name: "Aplicação",
    func: "Interface com o utilizador",
    proto: "HTTP, FTP, DNS, SMTP",
    pdu: "Dados",
  },
  {
    n: 6,
    name: "Apresentação",
    func: "Formatação, encriptação, compressão",
    proto: "SSL/TLS, JPEG, MPEG",
    pdu: "Dados",
  },
  {
    n: 5,
    name: "Sessão",
    func: "Controlo de sessões e diálogos",
    proto: "NetBIOS, RPC, SQL",
    pdu: "Dados",
  },
  {
    n: 4,
    name: "Transporte",
    func: "Entrega confiável ponto a ponto",
    proto: "TCP, UDP",
    pdu: "Segmento",
  },
  {
    n: 3,
    name: "Rede",
    func: "Endereçamento lógico e roteamento",
    proto: "IP, ICMP, ARP",
    pdu: "Pacote",
  },
  {
    n: 2,
    name: "Enlace de Dados",
    func: "Endereçamento físico (MAC)",
    proto: "Ethernet, WiFi, PPP",
    pdu: "Frame",
  },
  {
    n: 1,
    name: "Físico",
    func: "Transmissão de bits no meio físico",
    proto: "Cabos, Hub, Sinais",
    pdu: "Bits",
  },
];

const MODULE_CONTENT: Record<number, React.ReactNode> = {
  1: (
    <div>
      <Section title="O que é uma Rede de Computadores?">
        <p>
          Uma rede de computadores é um conjunto de dispositivos eletrónicos
          (computadores, smartphones, servidores, etc.) interligados entre si,
          capazes de partilhar recursos e informação.
        </p>
        <p>
          Exemplos do dia-a-dia: a rede doméstica com o teu router e telemóvel,
          a rede de uma empresa com centenas de computadores, ou a própria
          Internet (a maior rede do mundo).
        </p>
      </Section>
      <Section title="Tipos de Redes">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              type: "LAN",
              full: "Local Area Network",
              desc: "Rede local — casa, escritório, escola. Alta velocidade, baixa latência.",
            },
            {
              type: "WAN",
              full: "Wide Area Network",
              desc: "Rede de longa distância — cobre países ou continentes. A Internet é a maior WAN.",
            },
            {
              type: "MAN",
              full: "Metropolitan Area Network",
              desc: "Rede metropolitana — cobre uma cidade. Ex: rede de fibra ótica de um município.",
            },
            {
              type: "PAN",
              full: "Personal Area Network",
              desc: "Rede pessoal — Bluetooth entre telemóvel e auriculares, alcance de poucos metros.",
            },
          ].map((r) => (
            <div
              key={r.type}
              className="bg-card border border-border rounded-lg p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-primary">{r.type}</span>
                <span className="text-xs text-muted-foreground">
                  — {r.full}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{r.desc}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Modelo OSI — 7 Camadas">
        <p className="mb-3">
          O modelo OSI (Open Systems Interconnection) é um modelo conceptual que
          divide as funções de comunicação em 7 camadas. Cada camada tem
          responsabilidades específicas.
        </p>
        <div className="space-y-2">
          {OSI_LAYERS.map((l) => (
            <div
              key={l.n}
              className="bg-card border border-border rounded-lg p-3 flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {l.n}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-foreground">
                    {l.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    PDU: {l.pdu}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{l.func}</p>
                <p className="text-xs text-primary/70">Protocolos: {l.proto}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Modelo TCP/IP — 4 Camadas">
        <p className="mb-3">
          O modelo TCP/IP é o modelo prático usado na Internet. Agrupa as 7
          camadas do OSI em apenas 4:
        </p>
        <div className="space-y-2">
          {[
            {
              name: "Aplicação",
              osi: "Camadas 5, 6, 7 do OSI",
              proto: "HTTP, FTP, DNS, SMTP, SSH",
            },
            { name: "Transporte", osi: "Camada 4 do OSI", proto: "TCP, UDP" },
            {
              name: "Internet",
              osi: "Camada 3 do OSI",
              proto: "IP, ICMP, ARP",
            },
            {
              name: "Acesso à Rede",
              osi: "Camadas 1 e 2 do OSI",
              proto: "Ethernet, WiFi, cabos físicos",
            },
          ].map((l) => (
            <div
              key={l.name}
              className="bg-card border border-border rounded-lg p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-foreground">{l.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {l.osi}
                </span>
              </div>
              <p className="text-xs text-primary/70">{l.proto}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Encapsulamento de Dados">
        <p>
          Quando envias dados pela rede, cada camada OSI{" "}
          <strong className="text-foreground">adiciona informação</strong>{" "}
          (headers/trailers) ao dado original — isso chama-se encapsulamento.
        </p>
        <InfoBox>
          Aplicação → Dados → Segmento (TCP/UDP) → Pacote (IP) → Frame
          (Ethernet) → Bits (cabo)
          <br />
          Quando chega ao destino, cada camada{" "}
          <strong>remove o seu header</strong> (desencapsulamento).
        </InfoBox>
      </Section>
    </div>
  ),
  2: (
    <div>
      <Section title="Router (Roteador)">
        <p>
          Opera na <strong className="text-foreground">Camada 3</strong> (Rede)
          do modelo OSI. A sua principal função é{" "}
          <strong className="text-foreground">
            interligar redes diferentes
          </strong>{" "}
          e decidir o melhor caminho para cada pacote.
        </p>
        <InfoBox>
          Exemplo: o teu router doméstico liga a tua rede local (192.168.1.x) à
          Internet. Ele sabe para onde enviar cada pacote com base na tabela de
          rotas.
        </InfoBox>
        <div className="space-y-1.5">
          <TableRow2 label="Camada OSI" value="Camada 3 — Rede" />
          <TableRow2 label="Endereçamento" value="IP (Lógico)" />
          <TableRow2 label="Função principal" value="Roteamento entre redes" />
          <TableRow2 label="Protocolos" value="RIP, OSPF, BGP, EIGRP" />
        </div>
      </Section>
      <Section title="Switch">
        <p>
          Opera na <strong className="text-foreground">Camada 2</strong>{" "}
          (Enlace) do OSI. Liga dispositivos dentro da{" "}
          <strong className="text-foreground">mesma rede local</strong> e usa
          uma <strong className="text-foreground">tabela MAC</strong> para saber
          a qual porto enviar cada frame.
        </p>
        <InfoBox>
          Ao contrário do Hub, o Switch envia dados APENAS para o porto correto
          — não faz broadcast para todos. Isso aumenta muito a eficiência da
          rede.
        </InfoBox>
        <div className="space-y-1.5">
          <TableRow2 label="Camada OSI" value="Camada 2 — Enlace" />
          <TableRow2 label="Endereçamento" value="MAC (Físico)" />
          <TableRow2
            label="Função principal"
            value="Ligar dispositivos na mesma rede"
          />
          <TableRow2
            label="Tabela MAC"
            value="Aprende dinamicamente qual MAC está em qual porto"
          />
        </div>
      </Section>
      <Section title="Hub">
        <p>
          Opera na <strong className="text-foreground">Camada 1</strong>{" "}
          (Físico). É o dispositivo mais simples — quando recebe um sinal num
          porto,{" "}
          <strong className="text-foreground">
            repete para TODOS os outros portos
          </strong>{" "}
          (broadcast).
        </p>
        <InfoBox>
          Os Hubs são praticamente obsoletos. Causam muitas colisões e são
          ineficientes. Foram substituídos pelos Switches. Ainda aparecem em
          simuladores para fins educativos.
        </InfoBox>
      </Section>
      <Section title="PC / Workstation">
        <p>
          O cliente de rede. Envia e recebe dados. Tem um endereço IP e um
          endereço MAC. Usa software (browser, cliente de email, etc.) para
          comunicar com servidores.
        </p>
      </Section>
      <Section title="Servidor">
        <p>Fornece serviços à rede. Tipos comuns:</p>
        <div className="space-y-1.5">
          <TableRow2
            label="Servidor Web"
            value="Aloja sites e aplicações (HTTP/HTTPS)"
          />
          <TableRow2
            label="Servidor DNS"
            value="Resolve nomes (google.com → 142.250.x.x)"
          />
          <TableRow2
            label="Servidor DHCP"
            value="Atribui IPs automaticamente"
          />
          <TableRow2 label="Servidor FTP" value="Transferência de ficheiros" />
        </div>
      </Section>
      <Section title="Firewall">
        <p>
          Dispositivo de segurança que{" "}
          <strong className="text-foreground">filtra o tráfego</strong> com base
          em regras. Pode operar em diferentes camadas:
        </p>
        <div className="space-y-1.5">
          <TableRow2
            label="Packet filtering"
            value="Filtra por IP, porto, protocolo"
          />
          <TableRow2
            label="Stateful inspection"
            value="Acompanha o estado das ligações"
          />
          <TableRow2
            label="Application layer"
            value="Inspeciona conteúdo das aplicações"
          />
        </div>
      </Section>
      <Section title="Access Point (WiFi)">
        <p>
          Fornece conectividade sem fio (WiFi). Liga dispositivos sem fio à rede
          com fio.
        </p>
        <div className="space-y-1.5">
          <TableRow2 label="SSID" value="Nome da rede WiFi" />
          <TableRow2 label="2.4 GHz" value="Maior alcance, menor velocidade" />
          <TableRow2
            label="5 GHz"
            value="Menor alcance, maior velocidade, menos interferência"
          />
          <TableRow2
            label="Standards"
            value="802.11n, 802.11ac, 802.11ax (WiFi 6)"
          />
        </div>
      </Section>
    </div>
  ),
  3: (
    <div>
      <Section title="Tipos de Cabos">
        <div className="space-y-4">
          <div
            className="bg-card border-l-4 rounded-lg p-4"
            style={{ borderColor: "#22C55E" }}
          >
            <h4 className="font-semibold text-foreground mb-2">
              🟢 Cabo Direto (Straight-Through)
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              Usado para ligar dispositivos{" "}
              <strong className="text-foreground">de tipos diferentes</strong>.
              O par de fios vai direto de um lado para o outro (pin 1→1, 2→2,
              etc.)
            </p>
            <div className="space-y-1">
              <TableRow2 label="PC → Switch" value="✓ Cabo direto" />
              <TableRow2 label="Router → Switch" value="✓ Cabo direto" />
              <TableRow2
                label="PC → Router (via Switch)"
                value="✓ Cabo direto"
              />
            </div>
          </div>
          <div
            className="bg-card border-l-4 rounded-lg p-4"
            style={{ borderColor: "#F59E0B" }}
          >
            <h4 className="font-semibold text-foreground mb-2">
              🟡 Cabo Crossover
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              Usado para ligar dispositivos do{" "}
              <strong className="text-foreground">mesmo tipo</strong>. Os pares
              TX e RX são cruzados.
            </p>
            <div className="space-y-1">
              <TableRow2 label="Switch → Switch" value="✓ Cabo crossover" />
              <TableRow2 label="PC → PC (direto)" value="✓ Cabo crossover" />
              <TableRow2
                label="Router → Router (direto)"
                value="✓ Cabo crossover"
              />
            </div>
          </div>
          <div
            className="bg-card border-l-4 rounded-lg p-4"
            style={{ borderColor: "#4B9EFF" }}
          >
            <h4 className="font-semibold text-foreground mb-2">
              🔵 Cabo Serial
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              Usado em ligações{" "}
              <strong className="text-foreground">WAN entre routers</strong>.
              Requer interface serial (S0/0, S0/1) nos routers.
            </p>
            <div className="space-y-1">
              <TableRow2 label="Router → Router (WAN)" value="✓ Cabo serial" />
              <TableRow2
                label="Velocidade"
                value="Mais lento que Ethernet, mas comum em WAN"
              />
            </div>
          </div>
          <div
            className="bg-card border-l-4 rounded-lg p-4"
            style={{ borderColor: "#A855F7" }}
          >
            <h4 className="font-semibold text-foreground mb-2">
              🟣 Cabo Auto (Auto-MDIX)
            </h4>
            <p className="text-sm text-muted-foreground">
              Detecta automaticamente se precisa de ser direto ou crossover.
              Switches e routers modernos suportam Auto-MDIX, eliminando a
              necessidade de escolher o tipo certo.
            </p>
          </div>
        </div>
      </Section>
      <Section title="Portas de Rede">
        <div className="space-y-1.5">
          <TableRow2
            label="FastEthernet (Fa)"
            value="100 Mbps — 100BASE-TX, mais comum em simuladores"
          />
          <TableRow2
            label="GigabitEthernet (Gi)"
            value="1 Gbps — padrão atual em redes modernas"
          />
          <TableRow2
            label="Serial (S)"
            value="Para ligações WAN, velocidade configurável"
          />
          <TableRow2
            label="Nomenclatura"
            value="Fa0/0, Fa0/1, Gi0/0, S0/0/0, etc."
          />
        </div>
      </Section>
      <Section title="Como Conectar no Simulador">
        <InfoBox>
          <strong>Passo a passo para criar uma ligação:</strong>
          <br />
          1. Clica no botão de ligação (ícone de cabo) na barra de ferramentas
          <br />
          2. Clica no primeiro dispositivo — aparece um painel com as portas
          disponíveis
          <br />
          3. Seleciona a porta de origem (ex: Fa0/0 — Livre)
          <br />
          4. Clica no segundo dispositivo — seleciona a porta de destino
          <br />
          5. Escolhe o tipo de cabo (Direto, Crossover, Serial ou Auto)
          <br />
          6. Confirma — o cabo aparece no canvas com a cor correspondente
        </InfoBox>
        <p>
          Portas marcadas como <strong className="text-green-400">Livre</strong>{" "}
          estão disponíveis. Portas{" "}
          <strong className="text-red-400">Ocupadas</strong> já têm uma ligação.
        </p>
      </Section>
    </div>
  ),
  4: (
    <div>
      <Section title="Endereçamento IPv4">
        <p>
          Um endereço IPv4 é composto por{" "}
          <strong className="text-foreground">32 bits</strong>, escrito como 4
          números decimais separados por pontos, cada um entre 0 e 255.
        </p>
        <InfoBox>
          Exemplo: <strong>192.168.1.100</strong>
          <br />
          Em binário: 11000000.10101000.00000001.01100100
        </InfoBox>
        <div className="space-y-1.5">
          <TableRow2
            label="Classe A"
            value="1.0.0.0 – 126.255.255.255 — Redes grandes (ex: empresas globais)"
          />
          <TableRow2
            label="Classe B"
            value="128.0.0.0 – 191.255.255.255 — Redes médias"
          />
          <TableRow2
            label="Classe C"
            value="192.0.0.0 – 223.255.255.255 — Redes pequenas (mais comum)"
          />
          <TableRow2
            label="Classe D"
            value="224.0.0.0 – 239.255.255.255 — Multicast"
          />
          <TableRow2
            label="Classe E"
            value="240.0.0.0 – 255.255.255.255 — Reservado/investigação"
          />
        </div>
      </Section>
      <Section title="Endereços Privados vs Públicos">
        <p>
          Endereços <strong className="text-foreground">privados</strong> são
          usados dentro de redes locais e não são roteados na Internet:
        </p>
        <div className="space-y-1.5">
          <TableRow2 label="10.0.0.0/8" value="10.0.0.0 – 10.255.255.255" />
          <TableRow2
            label="172.16.0.0/12"
            value="172.16.0.0 – 172.31.255.255"
          />
          <TableRow2
            label="192.168.0.0/16"
            value="192.168.0.0 – 192.168.255.255 (mais usado em casa)"
          />
        </div>
        <p className="mt-2">
          Endereços <strong className="text-foreground">públicos</strong> são
          únicos na Internet e são atribuídos pelos ISPs.
        </p>
      </Section>
      <Section title="Máscara de Sub-rede">
        <p>
          Define qual parte do endereço IP é a{" "}
          <strong className="text-foreground">rede</strong> e qual é o{" "}
          <strong className="text-foreground">host</strong>:
        </p>
        <div className="space-y-1.5">
          <TableRow2 label="/8 — 255.0.0.0" value="16.777.214 hosts por rede" />
          <TableRow2 label="/16 — 255.255.0.0" value="65.534 hosts por rede" />
          <TableRow2
            label="/24 — 255.255.255.0"
            value="254 hosts por rede (mais comum)"
          />
          <TableRow2 label="/25 — 255.255.255.128" value="126 hosts por rede" />
          <TableRow2
            label="/30 — 255.255.255.252"
            value="2 hosts (ligações ponto-a-ponto)"
          />
        </div>
      </Section>
      <Section title="Gateway Padrão">
        <p>
          O <strong className="text-foreground">gateway padrão</strong> é o
          endereço IP do router na rede local. Quando um dispositivo quer
          comunicar com um endereço fora da sua rede, envia o pacote para o
          gateway.
        </p>
        <InfoBox>
          Exemplo: PC com IP 192.168.1.10/24, Gateway 192.168.1.1. Para falar
          com 8.8.8.8 (Google DNS), o PC envia para 192.168.1.1 (router), que
          sabe como chegar lá.
        </InfoBox>
      </Section>
      <Section title="DHCP — Atribuição Automática de IPs">
        <p>
          O DHCP (Dynamic Host Configuration Protocol) atribui automaticamente
          IPs, máscaras e gateways. Processo{" "}
          <strong className="text-foreground">DORA</strong>:
        </p>
        <div className="space-y-1.5">
          <TableRow2
            label="D — Discover"
            value="Cliente envia broadcast a procurar servidores DHCP"
          />
          <TableRow2
            label="O — Offer"
            value="Servidor DHCP oferece um endereço IP disponível"
          />
          <TableRow2
            label="R — Request"
            value="Cliente solicita formalmente o IP oferecido"
          />
          <TableRow2
            label="A — Acknowledge"
            value="Servidor confirma e o cliente configura-se"
          />
        </div>
      </Section>
      <Section title="IPv6">
        <p>
          O IPv6 usa <strong className="text-foreground">128 bits</strong> (vs
          32 do IPv4), escrito em hexadecimal separado por dois pontos:
        </p>
        <InfoBox>
          Exemplo IPv6: <strong>2001:0db8:85a3:0000:0000:8a2e:0370:7334</strong>
          <br />
          Forma abreviada: <strong>2001:db8:85a3::8a2e:370:7334</strong>
        </InfoBox>
        <div className="space-y-1.5">
          <TableRow2
            label="Espaço de endereços"
            value="340 undecilhões de endereços (prático inesgotável)"
          />
          <TableRow2
            label="Auto-configuração"
            value="SLAAC — dispositivos configuram-se automaticamente"
          />
          <TableRow2
            label="Sem NAT"
            value="Cada dispositivo pode ter IP público único"
          />
          <TableRow2 label="Segurança" value="IPSec integrado no protocolo" />
        </div>
      </Section>
    </div>
  ),
  5: (
    <div>
      <Section title="Abrir o Simulador">
        <p>
          Acede ao simulador através do botão{" "}
          <strong className="text-foreground">"Abrir Simulador"</strong> na
          página principal. O simulador abre diretamente — sem instalação
          necessária.
        </p>
        <InfoBox>
          O simulador carrega automaticamente com uma topologia de exemplo
          pré-configurada. Podes usá-la para explorar ou limpá-la e começar do
          zero.
        </InfoBox>
      </Section>
      <Section title="Adicionar Dispositivos">
        <p>
          A barra lateral (ou barra inferior no telemóvel) contém a paleta de
          dispositivos:
        </p>
        <div className="space-y-1.5">
          <TableRow2 label="Router" value="Clica no ícone Router na paleta" />
          <TableRow2 label="Switch" value="Clica no ícone Switch" />
          <TableRow2 label="PC" value="Clica no ícone PC" />
          <TableRow2 label="Server" value="Ícone de servidor" />
          <TableRow2 label="Access Point" value="Ícone de WiFi" />
        </div>
        <p className="mt-2">
          Cada clique{" "}
          <strong className="text-foreground">
            adiciona o dispositivo ao canvas
          </strong>
          . Podes arrastá-lo para a posição desejada.
        </p>
      </Section>
      <Section title="Criar Ligações">
        <InfoBox>
          <strong>Como criar uma ligação:</strong>
          <br />
          1. Clica no botão de ligação (ícone 🔗) na barra de ferramentas
          <br />
          2. Clica no primeiro dispositivo
          <br />
          3. Aparece o painel de seleção de porta — escolhe a porta de origem
          <br />
          4. Clica no segundo dispositivo e escolhe a porta de destino
          <br />
          5. Seleciona o tipo de cabo (Auto, Direto, Crossover, Serial)
          <br />
          6. Confirma — o cabo aparece colorido no canvas
        </InfoBox>
      </Section>
      <Section title="Configurar IPs e Gateways">
        <p>Clica num dispositivo para abrir o painel de configuração:</p>
        <div className="space-y-1.5">
          <TableRow2
            label="Hostname"
            value="Nome do dispositivo na topologia"
          />
          <TableRow2 label="Endereço IP" value="Ex: 192.168.1.10" />
          <TableRow2 label="Máscara" value="Ex: 255.255.255.0 ou /24" />
          <TableRow2 label="Gateway" value="Ex: 192.168.1.1 (IP do router)" />
        </div>
      </Section>
      <Section title="Executar Ping">
        <p>Seleciona um dispositivo, abre o painel de simulação e:</p>
        <InfoBox>
          1. Insere o IP de destino (ex: 192.168.1.1)
          <br />
          2. Clica em <strong>"Ping"</strong>
          <br />
          3. Vês a animação do pacote a percorrer a rede
          <br />
          4. O resultado mostra: sucesso/falha, RTT em ms, pacotes perdidos
          <br />
          5. Clica em <strong>"Ver Detalhes do Pacote"</strong> para ver todas
          as camadas OSI
        </InfoBox>
      </Section>
      <Section title="Executar Traceroute">
        <p>
          Igual ao Ping mas seleciona{" "}
          <strong className="text-foreground">"Traceroute"</strong>. O resultado
          mostra cada salto (hop) no caminho até ao destino, com a latência de
          cada um.
        </p>
      </Section>
      <Section title="Ver Detalhes OSI">
        <p>
          Após um Ping, o botão{" "}
          <strong className="text-foreground">"Ver Detalhes do Pacote"</strong>{" "}
          abre um painel com:
        </p>
        <div className="space-y-1.5">
          <TableRow2
            label="Camada 1"
            value="Tipo de cabo, velocidade, duplex, status"
          />
          <TableRow2
            label="Camada 2"
            value="MAC origem/destino, tipo Ethernet, tamanho frame"
          />
          <TableRow2 label="Camada 3" value="IPs, TTL, protocolo, checksum" />
          <TableRow2
            label="Camada 4"
            value="ICMP tipo/código, checksum, sequência"
          />
        </div>
      </Section>
    </div>
  ),
  6: (
    <div>
      <Section title="Modos de Operação do Cisco IOS">
        <div className="space-y-2">
          {[
            {
              mode: "User EXEC",
              prompt: "Router>",
              desc: "Modo inicial. Apenas comandos básicos de visualização. Limitado.",
            },
            {
              mode: "Privileged EXEC",
              prompt: "Router#",
              desc: "Acesso total a comandos show e debug. Necessário para entrar em config.",
            },
            {
              mode: "Global Config",
              prompt: "Router(config)#",
              desc: "Configuração global do dispositivo (hostname, rotas, etc.)",
            },
            {
              mode: "Interface Config",
              prompt: "Router(config-if)#",
              desc: "Configuração de uma interface específica (IP, shutdown, etc.)",
            },
          ].map((m) => (
            <div
              key={m.mode}
              className="bg-card border border-border rounded-lg p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-foreground">{m.mode}</span>
                <code className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {m.prompt}
                </code>
              </div>
              <p className="text-xs text-muted-foreground">{m.desc}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Comandos Essenciais">
        {[
          { cmd: "enable", desc: "Entra no modo Privileged EXEC" },
          { cmd: "configure terminal", desc: "Entra no modo Global Config" },
          { cmd: "hostname ROUTER1", desc: "Define o nome do dispositivo" },
          {
            cmd: "interface FastEthernet0/0",
            desc: "Entra na configuração da interface Fa0/0",
          },
          {
            cmd: "ip address 192.168.1.1 255.255.255.0",
            desc: "Configura IP e máscara",
          },
          {
            cmd: "no shutdown",
            desc: "Activa a interface (por defeito estão desligadas)",
          },
          { cmd: "exit", desc: "Sai do modo atual" },
          {
            cmd: "end",
            desc: "Volta ao Privileged EXEC a partir de qualquer modo",
          },
          {
            cmd: "copy running-config startup-config",
            desc: "Guarda configuração na memória permanente",
          },
          { cmd: "write", desc: "Atalho para guardar configuração" },
        ].map((c) => (
          <div
            key={c.cmd}
            className="flex gap-3 py-2 border-b border-border last:border-0"
          >
            <code className="text-xs text-green-400 bg-background border border-border rounded px-2 py-1 shrink-0 font-mono">
              {c.cmd}
            </code>
            <span className="text-xs text-muted-foreground self-center">
              {c.desc}
            </span>
          </div>
        ))}
      </Section>
      <Section title="Comandos Show (Diagnóstico)">
        {[
          { cmd: "show running-config", desc: "Mostra a configuração ativa" },
          {
            cmd: "show ip interface brief",
            desc: "Resumo de todas as interfaces (IP, status Up/Down)",
          },
          { cmd: "show ip route", desc: "Tabela de rotas IP" },
          {
            cmd: "show version",
            desc: "Versão do IOS e informações do hardware",
          },
          { cmd: "show mac address-table", desc: "Tabela MAC do switch" },
        ].map((c) => (
          <div
            key={c.cmd}
            className="flex gap-3 py-2 border-b border-border last:border-0"
          >
            <code className="text-xs text-blue-400 bg-background border border-border rounded px-2 py-1 shrink-0 font-mono">
              {c.cmd}
            </code>
            <span className="text-xs text-muted-foreground self-center">
              {c.desc}
            </span>
          </div>
        ))}
      </Section>
      <Section title="Configuração Completa de um Router">
        <InfoBox>
          <code className="text-green-400 font-mono text-xs leading-relaxed whitespace-pre-wrap">{`Router> enable
Router# configure terminal
Router(config)# hostname R1
R1(config)# interface FastEthernet0/0
R1(config-if)# ip address 192.168.1.1 255.255.255.0
R1(config-if)# no shutdown
R1(config-if)# exit
R1(config)# ip route 192.168.2.0 255.255.255.0 10.0.0.2
R1(config)# end
R1# copy running-config startup-config`}</code>
        </InfoBox>
      </Section>
      <Section title="Ping via CLI">
        <p>Podes executar ping diretamente no CLI do router/PC:</p>
        <InfoBox>
          <code className="text-green-400 font-mono text-xs">{`R1# ping 192.168.2.1
!!!!! (5 respostas bem-sucedidas)
..... (5 timeouts — sem resposta)`}</code>
        </InfoBox>
      </Section>
    </div>
  ),
  7: (
    <div>
      <Section title="O que é o Ping?">
        <p>
          O Ping é uma ferramenta de diagnóstico que usa o protocolo{" "}
          <strong className="text-foreground">ICMP</strong> (Internet Control
          Message Protocol) para testar a conectividade entre dois dispositivos.
        </p>
        <div className="space-y-1.5">
          <TableRow2
            label="ICMP Echo Request"
            value="Pacote enviado pelo emissor"
          />
          <TableRow2 label="ICMP Echo Reply" value="Resposta do destinatário" />
          <TableRow2
            label="RTT"
            value="Round Trip Time — tempo de ida e volta em ms"
          />
        </div>
        <InfoBox>
          <strong>Interpretar resultados do Ping:</strong>
          <br />
          <code className="text-green-400">!</code> — Sucesso: recebeu resposta
          <br />
          <code className="text-yellow-400">.</code> — Timeout: sem resposta
          (host desligado, firewall, cabo errado)
          <br />
          <code className="text-red-400">U</code> — Unreachable: destino
          inacessível (sem rota)
        </InfoBox>
      </Section>
      <Section title="O que é o Traceroute?">
        <p>
          O Traceroute mapeia o caminho salto a salto até ao destino, usando o
          campo <strong className="text-foreground">TTL</strong> (Time To Live)
          de forma inteligente:
        </p>
        <InfoBox>
          O Traceroute envia pacotes com TTL=1, 2, 3, etc. Cada router
          decrementa o TTL em 1. Quando TTL=0, o router descarta o pacote e
          devolve uma mensagem ICMP "Time Exceeded". Assim revelamos cada salto
          no caminho!
        </InfoBox>
        <div className="space-y-1.5">
          <TableRow2 label="Salto 1" value="Primeiro router (gateway padrão)" />
          <TableRow2 label="Salto 2" value="Próximo router no caminho" />
          <TableRow2
            label="Salto final"
            value="Destino — responde com Echo Reply"
          />
          <TableRow2
            label="* * *"
            value="Router não responde (firewall) — não significa erro"
          />
        </div>
      </Section>
      <Section title="Problemas Comuns e Soluções">
        <div className="space-y-3">
          {[
            {
              prob: "Ping falha entre PC e router",
              causa: "IP incorreto, máscara errada, gateway em falta",
              sol: "Verificar configuração IP de ambos os dispositivos",
            },
            {
              prob: "Ping falha entre dois PCs no switch",
              causa: "IPs em redes diferentes, cabo errado",
              sol: "Verificar se ambos estão na mesma sub-rede",
            },
            {
              prob: "Interface Down no show",
              causa: "shutdown ativo (administrativamente desligado)",
              sol: "Usar 'no shutdown' na interface",
            },
            {
              prob: "Traceroute pára a meio",
              causa: "Router intermédio sem rota de retorno",
              sol: "Verificar rotas em todos os routers do caminho",
            },
            {
              prob: "DHCP não atribui IP",
              causa: "Pool DHCP não configurado, servidor inacessível",
              sol: "Verificar configuração do servidor DHCP e conectividade",
            },
          ].map((item) => (
            <div
              key={item.prob}
              className="bg-card border border-border rounded-lg p-3"
            >
              <p className="text-xs font-semibold text-red-400 mb-1">
                ⚠ {item.prob}
              </p>
              <p className="text-xs text-muted-foreground mb-1">
                <strong className="text-foreground">Causa:</strong> {item.causa}
              </p>
              <p className="text-xs text-green-400">
                <strong>Solução:</strong> {item.sol}
              </p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  ),
  8: (
    <div>
      <Section title="VLANs (Virtual LANs)">
        <p>
          As VLANs permitem{" "}
          <strong className="text-foreground">segmentar logicamente</strong> uma
          rede física num switch. Dispositivos em VLANs diferentes não comunicam
          diretamente — precisam de um router.
        </p>
        <InfoBox>
          Exemplo: Numa empresa, a VLAN 10 é para RH, VLAN 20 para TI, VLAN 30
          para convidados. Mesmo estando no mesmo switch físico, estão isoladas.
        </InfoBox>
        <div className="space-y-1.5">
          <TableRow2
            label="Access Port"
            value="Porto do switch ligado a um dispositivo final — pertence a uma VLAN"
          />
          <TableRow2
            label="Trunk Port"
            value="Porto entre switches — transporta múltiplas VLANs (tagged 802.1Q)"
          />
          <TableRow2
            label="VLAN 1"
            value="VLAN nativa — padrão em todos os switches"
          />
        </div>
      </Section>
      <Section title="NAT / PAT">
        <p>
          NAT (Network Address Translation) traduz endereços IP privados para
          públicos, permitindo que múltiplos dispositivos partilhem um único IP
          público.
        </p>
        <div className="space-y-1.5">
          <TableRow2
            label="NAT estático"
            value="Um IP privado → um IP público fixo"
          />
          <TableRow2
            label="NAT dinâmico"
            value="Pool de IPs privados → pool de IPs públicos"
          />
          <TableRow2
            label="PAT (Masquerade)"
            value="Muitos IPs privados → um IP público (diferenciado por porto)"
          />
          <TableRow2
            label="Inside local"
            value="IP privado do dispositivo (ex: 192.168.1.10)"
          />
          <TableRow2
            label="Outside global"
            value="IP público visto na Internet"
          />
        </div>
      </Section>
      <Section title="ACLs (Access Control Lists)">
        <p>
          As ACLs são listas de regras que permitem ou bloqueiam tráfego com
          base em critérios específicos.
        </p>
        <div className="space-y-1.5">
          <TableRow2
            label="Standard ACL"
            value="Filtra apenas por IP de origem (numeradas 1-99)"
          />
          <TableRow2
            label="Extended ACL"
            value="Filtra por IP origem/destino, protocolo e portos (numeradas 100-199)"
          />
          <TableRow2
            label="Named ACL"
            value="Como as extended mas com nomes descritivos"
          />
        </div>
        <InfoBox>
          <code className="text-green-400 font-mono text-xs">{`R1(config)# ip access-list extended BLOCK_HTTP
R1(config-ext-nacl)# deny tcp any host 192.168.1.100 eq 80
R1(config-ext-nacl)# permit ip any any`}</code>
        </InfoBox>
      </Section>
      <Section title="Protocolos de Roteamento">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-foreground mb-2">
              RIP (Routing Information Protocol)
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              Protocolo de{" "}
              <strong className="text-foreground">vetor de distância</strong>.
              Métrica baseada em contagem de saltos (max 15). Simples mas
              limitado.
            </p>
            <InfoBox>
              <code className="text-green-400 font-mono text-xs">{`R1(config)# router rip
R1(config-router)# version 2
R1(config-router)# network 192.168.1.0`}</code>
            </InfoBox>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">
              OSPF (Open Shortest Path First)
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              Protocolo de{" "}
              <strong className="text-foreground">estado de ligação</strong>.
              Constrói um mapa completo da rede. Mais rápido a convergir,
              escalável para redes grandes.
            </p>
            <InfoBox>
              <code className="text-green-400 font-mono text-xs">{`R1(config)# router ospf 1
R1(config-router)# network 192.168.1.0 0.0.0.255 area 0`}</code>
            </InfoBox>
          </div>
        </div>
      </Section>
      <Section title="WiFi no Simulador">
        <p>Para simular ligações sem fio:</p>
        <div className="space-y-1.5">
          <TableRow2
            label="Passo 1"
            value="Adiciona um Access Point ao canvas"
          />
          <TableRow2
            label="Passo 2"
            value="Liga o AP ao switch com cabo direto"
          />
          <TableRow2
            label="Passo 3"
            value="Adiciona um Smartphone ou PC com WiFi"
          />
          <TableRow2
            label="Passo 4"
            value="A ligação WiFi aparece como linha tracejada roxa"
          />
          <TableRow2
            label="Passo 5"
            value="Configura o IP no dispositivo sem fio"
          />
        </div>
      </Section>
    </div>
  ),
};

// ─── Quiz Data ─────────────────────────────────────────────────────────────────

const MODULES_QUIZ: Record<number, QuizQuestion[]> = {
  1: [
    {
      question: "Quantas camadas tem o modelo OSI?",
      options: ["4 camadas", "5 camadas", "7 camadas", "8 camadas"],
      correctIndex: 2,
    },
    {
      question: "Qual camada do OSI é responsável pelo endereçamento IP?",
      options: [
        "Camada 2 — Enlace",
        "Camada 3 — Rede",
        "Camada 4 — Transporte",
        "Camada 5 — Sessão",
      ],
      correctIndex: 1,
    },
    {
      question: "O que é o PDU da Camada 4 (Transporte)?",
      options: ["Frame", "Pacote", "Segmento", "Bits"],
      correctIndex: 2,
    },
    {
      question: "Qual modelo de rede tem apenas 4 camadas?",
      options: [
        "Modelo OSI",
        "Modelo TCP/IP",
        "Modelo Ethernet",
        "Modelo ICMP",
      ],
      correctIndex: 1,
    },
  ],
  2: [
    {
      question: "Qual dispositivo opera na Camada 2 do OSI?",
      options: ["Router", "Hub", "Switch", "Firewall"],
      correctIndex: 2,
    },
    {
      question: "Qual dispositivo conecta redes diferentes (Camada 3)?",
      options: ["Switch", "Hub", "Access Point", "Router"],
      correctIndex: 3,
    },
    {
      question: "O Hub envia dados para:",
      options: [
        "Apenas o destinatário",
        "Todos os portos (broadcast)",
        "Baseado no endereço IP",
        "Baseado no endereço MAC",
      ],
      correctIndex: 1,
    },
    {
      question: "O Access Point fornece que tipo de conectividade?",
      options: [
        "Ligação serial",
        "Sem fio (WiFi)",
        "Fibra óptica",
        "Cabo coaxial",
      ],
      correctIndex: 1,
    },
  ],
  3: [
    {
      question: "Qual cabo usar para ligar PC a Switch?",
      options: [
        "Cabo crossover",
        "Cabo serial",
        "Cabo direto (straight-through)",
        "Cabo de fibra",
      ],
      correctIndex: 2,
    },
    {
      question: "Qual cabo usar para ligar Switch a Switch?",
      options: ["Cabo direto", "Cabo crossover", "Cabo serial", "Cabo coaxial"],
      correctIndex: 1,
    },
    {
      question: "A porta FastEthernet suporta velocidades até:",
      options: ["10 Mbps", "100 Mbps", "1 Gbps", "10 Gbps"],
      correctIndex: 1,
    },
    {
      question: "O cabo Auto (Auto-MDIX):",
      options: [
        "Só funciona entre PCs",
        "Adapta-se automaticamente ao tipo necessário",
        "É igual ao cabo serial",
        "Não existe em equipamentos modernos",
      ],
      correctIndex: 1,
    },
  ],
  4: [
    {
      question: "Qual é um endereço de rede privada válido?",
      options: ["172.32.0.1", "192.169.1.1", "192.168.1.10", "11.0.0.1"],
      correctIndex: 2,
    },
    {
      question: "A máscara /24 é equivalente a:",
      options: ["255.255.0.0", "255.0.0.0", "255.255.255.0", "255.255.255.128"],
      correctIndex: 2,
    },
    {
      question: "O que faz o protocolo DHCP?",
      options: [
        "Resolve nomes de domínio",
        "Atribui endereços IP automaticamente",
        "Filtra pacotes na rede",
        "Roteia pacotes entre redes",
      ],
      correctIndex: 1,
    },
    {
      question: "Um endereço IPv6 tem quantos bits?",
      options: ["32 bits", "64 bits", "128 bits", "256 bits"],
      correctIndex: 2,
    },
  ],
  5: [
    {
      question: "No simulador, para ligar dois dispositivos deve-se:",
      options: [
        "Clicar em qualquer dispositivo",
        "Usar o modo de ligação e selecionar as portas",
        "Reiniciar o simulador primeiro",
        "Usar apenas o teclado",
      ],
      correctIndex: 1,
    },
    {
      question: "Após um Ping bem-sucedido, qual símbolo aparece no resultado?",
      options: [".", "U", "!", "X"],
      correctIndex: 2,
    },
    {
      question: "O que mostra o Traceroute?",
      options: [
        "Apenas o IP do destino final",
        "O caminho salto a salto até ao destino",
        "Apenas a latência total da ligação",
        "Os endereços MAC de todos os dispositivos",
      ],
      correctIndex: 1,
    },
    {
      question: "Para ver os detalhes OSI do pacote no simulador:",
      options: [
        "Clicar em qualquer sítio no canvas",
        "Fazer Ping e clicar em 'Ver Detalhes do Pacote'",
        "Abrir o terminal CLI",
        "Reiniciar a topologia",
      ],
      correctIndex: 1,
    },
  ],
  6: [
    {
      question: "Qual comando activa o modo Privileged EXEC no Cisco IOS?",
      options: ["configure terminal", "enable", "login", "sudo"],
      correctIndex: 1,
    },
    {
      question: "Para configurar o endereço IP de uma interface usa-se:",
      options: ["set ip address", "ip address", "configure ip", "interface ip"],
      correctIndex: 1,
    },
    {
      question: "O que faz o comando 'no shutdown'?",
      options: [
        "Desliga a interface completamente",
        "Apaga toda a configuração",
        "Activa a interface (liga-a)",
        "Reinicia o router",
      ],
      correctIndex: 2,
    },
    {
      question: "Para ver o estado resumido de todas as interfaces:",
      options: [
        "show running-config",
        "show ip route",
        "show ip interface brief",
        "display interfaces all",
      ],
      correctIndex: 2,
    },
  ],
  7: [
    {
      question: "O Ping usa qual protocolo?",
      options: ["TCP", "UDP", "ICMP", "ARP"],
      correctIndex: 2,
    },
    {
      question: "No resultado do Ping, o símbolo '.' significa:",
      options: [
        "Sucesso — recebeu resposta",
        "Timeout — sem resposta",
        "Erro de rota",
        "Porto fechado",
      ],
      correctIndex: 1,
    },
    {
      question: "O Traceroute usa o campo TTL para:",
      options: [
        "Calcular a velocidade da rede",
        "Identificar cada salto no caminho",
        "Autenticar os pacotes",
        "Comprimir os dados enviados",
      ],
      correctIndex: 1,
    },
    {
      question:
        "Se o Ping falha entre dois PCs no mesmo switch, provavelmente:",
      options: [
        "O switch está completamente avariado",
        "IPs incorretos ou sub-redes diferentes",
        "É necessário usar cabo serial",
        "IPv6 não é suportado",
      ],
      correctIndex: 1,
    },
  ],
  8: [
    {
      question: "O que fazem as VLANs?",
      options: [
        "Aumentam a velocidade física da rede",
        "Segmentam o tráfego logicamente",
        "Substituem o endereçamento IP",
        "Cifram os dados automaticamente",
      ],
      correctIndex: 1,
    },
    {
      question: "NAT significa:",
      options: [
        "Network Access Table",
        "Network Address Translation",
        "Node Authentication Token",
        "Network Analysis Tool",
      ],
      correctIndex: 1,
    },
    {
      question: "Uma ACL extended pode filtrar por:",
      options: [
        "Apenas IP de origem",
        "Apenas porto TCP/UDP",
        "IP origem, destino, protocolo e portos",
        "Apenas tipo de cabo físico",
      ],
      correctIndex: 2,
    },
    {
      question: "OSPF é um protocolo de roteamento do tipo:",
      options: [
        "Vetor de distância",
        "Estado de ligação",
        "Protocolo híbrido",
        "Roteamento estático",
      ],
      correctIndex: 1,
    },
  ],
};

// ─── Module List ───────────────────────────────────────────────────────────────

const MODULES: Module[] = [
  {
    id: 1,
    title: "Introdução às Redes",
    description: "OSI, TCP/IP, tipos de redes e encapsulamento",
    content: MODULE_CONTENT[1],
    quiz: MODULES_QUIZ[1],
  },
  {
    id: 2,
    title: "Dispositivos de Rede",
    description: "Router, Switch, Hub, PC, Servidor, Firewall, AP",
    content: MODULE_CONTENT[2],
    quiz: MODULES_QUIZ[2],
  },
  {
    id: 3,
    title: "Cabos e Ligações",
    description: "Tipos de cabo, portas e como conectar",
    content: MODULE_CONTENT[3],
    quiz: MODULES_QUIZ[3],
  },
  {
    id: 4,
    title: "Endereçamento IP",
    description: "IPv4, máscaras, gateway, DHCP e IPv6",
    content: MODULE_CONTENT[4],
    quiz: MODULES_QUIZ[4],
  },
  {
    id: 5,
    title: "Simulação Prática",
    description: "Usar o simulador Packet Trace E.B",
    content: MODULE_CONTENT[5],
    quiz: MODULES_QUIZ[5],
  },
  {
    id: 6,
    title: "CLI Cisco IOS",
    description: "Comandos essenciais e configuração",
    content: MODULE_CONTENT[6],
    quiz: MODULES_QUIZ[6],
  },
  {
    id: 7,
    title: "Diagnóstico de Rede",
    description: "Ping, Traceroute e resolução de problemas",
    content: MODULE_CONTENT[7],
    quiz: MODULES_QUIZ[7],
  },
  {
    id: 8,
    title: "Topologias Avançadas",
    description: "VLANs, NAT, ACLs, OSPF/RIP e WiFi",
    content: MODULE_CONTENT[8],
    quiz: MODULES_QUIZ[8],
  },
];

// ─── Quiz Component ────────────────────────────────────────────────────────────

function QuizPanel({
  questions,
  onComplete,
}: {
  questions: QuizQuestion[];
  onComplete: (score: number) => void;
}) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);

  const q = questions[current];
  const isCorrect = selected === q.correctIndex;

  function handleSubmit() {
    if (selected === null) return;
    setSubmitted(true);
  }

  function handleNext() {
    const newAnswers = [...answers, selected!];
    if (current + 1 < questions.length) {
      setAnswers(newAnswers);
      setCurrent(current + 1);
      setSelected(null);
      setSubmitted(false);
    } else {
      const correct = newAnswers.filter(
        (a, i) => a === questions[i].correctIndex,
      ).length;
      const score = Math.round((correct / questions.length) * 100);
      setFinished(true);
      onComplete(score);
    }
  }

  if (finished) return null;

  const LABELS = ["A", "B", "C", "D"];

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-heading font-semibold text-foreground">
          Quiz — Pergunta {current + 1}/{questions.length}
        </h4>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div
              key={String(i)}
              className={`w-2 h-2 rounded-full ${
                i < current
                  ? "bg-green-500"
                  : i === current
                    ? "bg-primary"
                    : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>
      <p className="text-foreground font-medium mb-4 leading-relaxed">
        {q.question}
      </p>
      <div className="space-y-2 mb-4">
        {q.options.map((opt, i) => {
          let cls =
            "border border-border bg-background text-foreground hover:border-primary/50 cursor-pointer";
          if (submitted) {
            if (i === q.correctIndex)
              cls =
                "border-green-500 bg-green-500/10 text-green-400 cursor-default";
            else if (i === selected)
              cls = "border-red-500 bg-red-500/10 text-red-400 cursor-default";
            else
              cls =
                "border-border bg-background text-muted-foreground cursor-default opacity-60";
          } else if (i === selected) {
            cls = "border-primary bg-primary/10 text-primary cursor-pointer";
          }
          return (
            <button
              key={String(i)}
              type="button"
              onClick={() => !submitted && setSelected(i)}
              className={`w-full text-left flex items-center gap-3 p-3 rounded-lg border transition-all ${cls}`}
            >
              <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-bold shrink-0">
                {LABELS[i]}
              </span>
              <span className="text-sm">{opt}</span>
              {submitted && i === q.correctIndex && (
                <CheckCircle2 size={16} className="ml-auto text-green-500" />
              )}
              {submitted && i === selected && i !== q.correctIndex && (
                <XCircle size={16} className="ml-auto text-red-500" />
              )}
            </button>
          );
        })}
      </div>
      {submitted && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-lg mb-3 text-sm ${
            isCorrect
              ? "bg-green-500/10 border border-green-500/30 text-green-400"
              : "bg-red-500/10 border border-red-500/30 text-red-400"
          }`}
        >
          {isCorrect
            ? "✓ Correto!"
            : `✗ Incorreto. Resposta correta: ${LABELS[q.correctIndex]}. ${q.options[q.correctIndex]}`}
        </motion.div>
      )}
      {!submitted ? (
        <Button
          onClick={handleSubmit}
          disabled={selected === null}
          className="w-full bg-primary text-primary-foreground hover:opacity-90"
        >
          Confirmar Resposta
        </Button>
      ) : (
        <Button
          onClick={handleNext}
          className="w-full bg-primary text-primary-foreground hover:opacity-90"
        >
          {current + 1 < questions.length
            ? "Próxima Pergunta"
            : "Ver Resultado"}
          <ChevronRight size={16} className="ml-1" />
        </Button>
      )}
    </div>
  );
}

// ─── Quiz Result ───────────────────────────────────────────────────────────────

function QuizResult({
  score,
  passed,
  onRetry,
  onNext,
}: {
  score: number;
  passed: boolean;
  onRetry: () => void;
  onNext: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-xl p-6 border text-center ${
        passed
          ? "bg-green-500/10 border-green-500/30"
          : "bg-red-500/10 border-red-500/30"
      }`}
    >
      <div className="text-4xl mb-2">{passed ? "🎉" : "📚"}</div>
      <h4
        className={`font-heading text-xl font-bold mb-1 ${passed ? "text-green-400" : "text-red-400"}`}
      >
        {passed ? "Módulo Concluído!" : "Precisas de Mais Prática"}
      </h4>
      <p className="text-muted-foreground text-sm mb-2">
        Resultado: <strong className="text-foreground">{score}%</strong>
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        {passed
          ? "Passaste com sucesso neste módulo."
          : "Mínimo para passar: 70%. Revê o conteúdo e tenta novamente."}
      </p>
      <div className="flex gap-2 justify-center">
        {!passed && (
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <RotateCcw size={14} />
            Tentar Novamente
          </Button>
        )}
        {passed && (
          <Button
            onClick={onNext}
            className="bg-primary text-primary-foreground hover:opacity-90 gap-2"
          >
            Próximo Módulo
            <ChevronRight size={14} />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Certificate ───────────────────────────────────────────────────────────────

function Certificate({ onBack }: { onBack: () => void }) {
  const today = new Date().toLocaleDateString("pt-PT", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div
        id="certificate-print"
        className="bg-card border-2 border-primary/40 rounded-2xl p-8 text-center relative overflow-hidden"
        style={{ boxShadow: "0 0 40px oklch(0.68 0.19 45 / 0.2)" }}
      >
        {/* Decorative corners */}
        <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-primary/60 rounded-tl-lg" />
        <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-primary/60 rounded-tr-lg" />
        <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-primary/60 rounded-bl-lg" />
        <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-primary/60 rounded-br-lg" />

        <Trophy size={48} className="text-primary mx-auto mb-4" />
        <div className="text-xs text-primary font-semibold tracking-widest uppercase mb-2">
          Certificado de Conclusão
        </div>
        <h2 className="font-heading text-2xl font-bold text-foreground mb-1">
          Dominar o Packet Trace E.B
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          Este certificado confirma que o estudante completou com sucesso todos
          os 8 módulos do curso de redes de computadores.
        </p>

        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-2 mb-6">
          <Award size={16} className="text-primary" />
          <span className="text-sm font-semibold text-primary">
            Estudante Certificado
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-left mb-6">
          {MODULES.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <CheckCircle2 size={12} className="text-green-400 shrink-0" />
              {m.title}
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">Concluído em {today}</p>
          <p className="text-xs font-semibold text-foreground mt-1">
            Packet Trace E.B
          </p>
        </div>
      </div>

      <div className="flex gap-3 justify-center mt-6">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft size={14} />
          Voltar ao Curso
        </Button>
        <Button
          onClick={() => window.print()}
          className="bg-primary text-primary-foreground hover:opacity-90 gap-2"
        >
          <Download size={14} />
          Imprimir Certificado
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Module Sidebar Item ───────────────────────────────────────────────────────

function ModuleSidebarItem({
  module,
  isActive,
  isCompleted,
  onClick,
}: {
  module: Module;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 ${
        isActive
          ? "bg-primary/15 border border-primary/30"
          : "hover:bg-card border border-transparent hover:border-border"
      }`}
    >
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
          isCompleted
            ? "bg-green-500/20 border border-green-500/50 text-green-400"
            : isActive
              ? "bg-primary/20 border border-primary/50 text-primary"
              : "bg-muted border border-border text-muted-foreground"
        }`}
      >
        {isCompleted ? <CheckCircle2 size={14} /> : module.id}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold leading-tight ${isActive ? "text-primary" : "text-foreground"}`}
        >
          {module.title}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
          {module.description}
        </p>
      </div>
    </button>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function CoursePage({ onBack }: { onBack: () => void }) {
  const { actor } = useActor();

  const [progress, setProgress] = useState<ProgressMap>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [activeModuleId, setActiveModuleId] = useState(1);
  const [quizKey, setQuizKey] = useState(0); // force remount quiz on retry
  const [quizResult, setQuizResult] = useState<{
    score: number;
    passed: boolean;
  } | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const completedCount = useMemo(
    () => Object.values(progress).filter((p) => p.completed).length,
    [progress],
  );
  const allCompleted = completedCount === MODULES.length;

  const activeModule = MODULES.find((m) => m.id === activeModuleId)!;
  const moduleProgress = progress[activeModuleId];

  const saveProgress = useCallback(
    (moduleId: number, score: number, completed: boolean) => {
      const newProgress: ProgressMap = {
        ...progress,
        [moduleId]: { completed, score, completedAt: new Date().toISOString() },
      };
      setProgress(newProgress);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
      // Try backend save
      if (actor) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (actor as any)
          .saveModuleProgress({
            moduleId: BigInt(moduleId),
            score: BigInt(score),
            completed,
          })
          .catch(() => {
            /* silent fail - localStorage is source of truth */
          });
      }
    },
    [progress, actor],
  );

  function handleQuizComplete(score: number) {
    const passed = score >= PASS_SCORE;
    setQuizResult({ score, passed });
    if (passed) {
      saveProgress(activeModuleId, score, true);
    }
  }

  function handleRetryQuiz() {
    setQuizResult(null);
    setQuizKey((k) => k + 1);
  }

  function handleNextModule() {
    const nextId = activeModuleId + 1;
    if (nextId <= MODULES.length) {
      setActiveModuleId(nextId);
      setQuizResult(null);
      setQuizKey((k) => k + 1);
    } else if (allCompleted) {
      setShowCertificate(true);
    }
  }

  function selectModule(id: number) {
    setActiveModuleId(id);
    setQuizResult(null);
    setQuizKey((k) => k + 1);
    setSidebarOpen(false);
  }

  const Sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} className="text-primary" />
          <span className="font-heading font-bold text-sm text-foreground">
            Módulos do Curso
          </span>
        </div>
        <Progress
          value={(completedCount / MODULES.length) * 100}
          className="h-2"
        />
        <p className="text-[10px] text-muted-foreground mt-1">
          {completedCount}/{MODULES.length} concluídos
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {MODULES.map((m) => (
            <ModuleSidebarItem
              key={m.id}
              module={m}
              isActive={m.id === activeModuleId}
              isCompleted={!!progress[m.id]?.completed}
              onClick={() => selectModule(m.id)}
            />
          ))}
        </div>
      </ScrollArea>
      {allCompleted && (
        <div className="p-3 border-t border-border">
          <Button
            onClick={() => setShowCertificate(true)}
            className="w-full bg-primary text-primary-foreground hover:opacity-90 gap-2"
          >
            <Trophy size={14} />
            Ver Certificado
          </Button>
        </div>
      )}
    </div>
  );

  if (showCertificate) {
    return (
      <div className="absolute inset-0 bg-background overflow-auto">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Certificate onBack={() => setShowCertificate(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-background overflow-hidden">
      {/* Top navbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 shrink-0">
        {/* Mobile sidebar trigger */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <List size={18} />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-72 p-0 bg-background border-border"
          >
            {Sidebar}
          </SheetContent>
        </Sheet>

        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2 text-muted-foreground hover:text-foreground shrink-0"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Voltar</span>
        </Button>

        <div className="flex-1 min-w-0">
          <h1 className="font-heading font-bold text-sm sm:text-base text-foreground truncate">
            Dominar o Packet Trace E.B
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <Progress
              value={(completedCount / MODULES.length) * 100}
              className="h-1 flex-1 max-w-[120px]"
            />
            <span className="text-[10px] text-muted-foreground shrink-0">
              {completedCount}/{MODULES.length} módulos
            </span>
          </div>
        </div>

        {allCompleted && (
          <Button
            size="sm"
            onClick={() => setShowCertificate(true)}
            className="bg-primary text-primary-foreground hover:opacity-90 gap-1.5 shrink-0"
          >
            <Trophy size={14} />
            <span className="hidden sm:inline">Certificado</span>
          </Button>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:flex w-72 shrink-0 border-r border-border flex-col">
          {Sidebar}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto px-4 py-6 pb-16">
            {/* Module header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  variant="outline"
                  className="text-[10px] text-primary border-primary/30"
                >
                  Módulo {activeModule.id} de {MODULES.length}
                </Badge>
                {moduleProgress?.completed && (
                  <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30 border">
                    <CheckCircle2 size={10} className="mr-1" />
                    Concluído
                  </Badge>
                )}
              </div>
              <h2 className="font-heading text-2xl font-bold text-foreground mb-1">
                {activeModule.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {activeModule.description}
              </p>
            </div>

            {/* Lesson content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeModuleId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-8">{activeModule.content}</div>

                {/* Quiz section */}
                <div className="border-t border-border pt-6">
                  <h3 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs">
                      ?
                    </span>
                    Quiz — Módulo {activeModule.id}
                  </h3>

                  {quizResult ? (
                    <QuizResult
                      score={quizResult.score}
                      passed={quizResult.passed}
                      onRetry={handleRetryQuiz}
                      onNext={handleNextModule}
                    />
                  ) : (
                    <QuizPanel
                      key={quizKey}
                      questions={activeModule.quiz}
                      onComplete={handleQuizComplete}
                    />
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
