import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle,
  Cpu,
  GitBranch,
  Globe,
  Layers,
  Network,
  Play,
  Shield,
  Smartphone,
  Star,
  Wifi,
} from "lucide-react";
import { motion } from "motion/react";

interface LandingPageProps {
  onOpenSimulator: () => void;
}

const FEATURES = [
  {
    icon: Layers,
    color: "#4B9EFF",
    bg: "#0E2B5C",
    title: "Drag & Drop Intuitivo",
    desc: "Adicione e posicione dispositivos de rede com simples toques ou cliques. Interface projetada para mobile.",
  },
  {
    icon: Cpu,
    color: "#22C55E",
    bg: "#0B3A1F",
    title: "Configuração de Dispositivos",
    desc: "Configure IPs, máscaras, gateways e interfaces de roteadores, switches e endpoints.",
  },
  {
    icon: Play,
    color: "#F47A2A",
    bg: "#3A1500",
    title: "Simulação de Pacotes",
    desc: "Visualize pacotes percorrendo a rede em tempo real com animações hop-a-hop e resultados de RTT.",
  },
  {
    icon: GitBranch,
    color: "#A855F7",
    bg: "#2A1045",
    title: "Múltiplas Topologias",
    desc: "Salve e carregue diferentes topologias. Trabalhe com redes estrela, malha, anel e mais.",
  },
  {
    icon: Network,
    color: "#14B8A6",
    bg: "#0A2E2B",
    title: "Suporte a Protocolos",
    desc: "Simule ICMP (Ping), Traceroute, ARP e lógica de roteamento IP com tabelas de encaminhamento.",
  },
  {
    icon: Smartphone,
    color: "#F59E0B",
    bg: "#3A2000",
    title: "Mobile-First",
    desc: "Desenvolvido especificamente para smartphones. Pinch-to-zoom, gestos de toque e UI responsiva.",
  },
];

const TESTIMONIALS = [
  {
    name: "Carlos Menezes",
    role: "Estudante CCNA",
    text: "Finalmente posso estudar redes no celular durante o trajeto! A simulação de pacotes é incrível.",
    stars: 5,
  },
  {
    name: "Beatriz Santos",
    role: "Professora de Redes",
    text: "Uso com meus alunos nas aulas práticas. Interface intuitiva e muito próxima do Packet Tracer.",
    stars: 5,
  },
  {
    name: "Rafael Oliveira",
    role: "Técnico em TI",
    text: "Ótimo para demonstrar conceitos de rede para clientes. Roda direto no navegador!",
    stars: 5,
  },
];

const HOW_STEPS = [
  {
    step: "01",
    color: "#4B9EFF",
    title: "Adicione Dispositivos",
    desc: "Toque nos ícones da paleta para adicionar roteadores, switches, PCs e mais ao canvas.",
  },
  {
    step: "02",
    color: "#F47A2A",
    title: "Conecte e Configure",
    desc: "Use o modo de conexão para ligar dispositivos. Configure IPs e gateways no painel lateral.",
  },
  {
    step: "03",
    color: "#22C55E",
    title: "Simule Pacotes",
    desc: "Selecione um dispositivo, insira o IP de destino e execute ping ou traceroute com animação visual.",
  },
];

const SUPPORTED_DEVICES = [
  { label: "Router", color: "#4B9EFF", bg: "#0E2B5C", icon: Globe },
  { label: "Switch", color: "#22C55E", bg: "#0B3A1F", icon: Layers },
  { label: "Hub", color: "#F59E0B", bg: "#3A2000", icon: Network },
  { label: "PC", color: "#94A3B8", bg: "#1E2A3A", icon: Cpu },
  { label: "Server", color: "#14B8A6", bg: "#0A2E2B", icon: Shield },
  { label: "Smartphone", color: "#A855F7", bg: "#2A1045", icon: Smartphone },
  { label: "Firewall", color: "#EF4444", bg: "#3A0808", icon: Shield },
];

const NAV_LINKS = ["Início", "Recursos", "Como Funciona", "Download"];
const BENEFIT_BADGES = ["Sem instalação", "100% gratuito", "Mobile-first"];
const STATS = [
  ["100%", "Gratuito"],
  ["7+", "Dispositivos"],
  ["0", "Instalação"],
];

export default function LandingPage({ onOpenSimulator }: LandingPageProps) {
  const year = new Date().getFullYear();
  const utm = encodeURIComponent(window.location.hostname);

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Nav */}
      <nav className="nav-glass sticky top-0 z-50 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Network size={16} className="text-primary" aria-hidden="true" />
            </div>
            <span className="font-heading font-bold text-foreground text-sm sm:text-base">
              Packet Tracer Mobile
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((item) => (
              <button
                type="button"
                key={item}
                data-ocid="nav.link"
                onClick={onOpenSimulator}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {item}
              </button>
            ))}
          </div>

          <Button
            data-ocid="nav.primary_button"
            onClick={onOpenSimulator}
            className="bg-primary text-primary-foreground hover:opacity-90 text-sm h-8 px-4 orange-glow"
          >
            Abrir Simulador
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <motion.div
            className="flex-1"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-6">
              <Wifi size={12} className="text-primary" aria-hidden="true" />
              <span className="text-xs text-primary font-medium">
                Simulador de Redes Mobile
              </span>
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight mb-6">
              Simule Redes no <span className="text-primary">seu Celular</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
              Um simulador completo de redes de computadores que roda
              diretamente no navegador do seu smartphone. Configure
              dispositivos, trace rotas e visualize pacotes em tempo real.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                data-ocid="hero.primary_button"
                onClick={onOpenSimulator}
                className="bg-primary text-primary-foreground hover:opacity-90 h-11 px-6 text-base orange-glow"
              >
                Abrir Simulador
                <ArrowRight size={16} className="ml-2" aria-hidden="true" />
              </Button>
              <Button
                data-ocid="hero.secondary_button"
                variant="outline"
                className="h-11 px-6 text-base border-border hover:bg-secondary"
                onClick={onOpenSimulator}
              >
                <Play size={14} className="mr-2" aria-hidden="true" />
                Ver Demo
              </Button>
            </div>
            <div className="flex items-center gap-6 mt-8">
              {STATS.map(([val, label]) => (
                <div key={label}>
                  <p className="text-xl font-heading font-bold text-primary">
                    {val}
                  </p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="flex-1 w-full max-w-lg"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="relative">
              <div
                className="absolute inset-0 bg-primary/10 blur-3xl rounded-full"
                aria-hidden="true"
              />
              <div className="relative rounded-2xl border border-border overflow-hidden card-glow">
                <img
                  src="/assets/generated/hero-simulator-mockup.dim_700x500.png"
                  alt="Packet Tracer Mobile — Interface do Simulador"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Recursos para Redes
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Tudo que você precisa para aprender, praticar e demonstrar
              conceitos de redes de computadores.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={feat.title}
                data-ocid={`features.item.${i + 1}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="p-5 rounded-xl border border-border bg-card card-glow hover:border-border/80 transition-all"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{
                    backgroundColor: feat.bg,
                    border: `1px solid ${feat.color}33`,
                  }}
                >
                  <feat.icon
                    size={20}
                    style={{ color: feat.color }}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-2">
                  {feat.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feat.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Como Funciona
            </h2>
            <p className="text-muted-foreground">
              Três passos para simular sua primeira rede
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_STEPS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="p-6 rounded-xl border border-border bg-card card-glow"
              >
                <div
                  className="text-4xl font-heading font-extrabold mb-4"
                  style={{ color: step.color }}
                >
                  {step.step}
                </div>
                <h3 className="font-heading font-semibold text-lg text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported devices */}
      <section className="py-16 border-t border-border bg-card/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="font-heading text-2xl font-bold text-center text-foreground mb-10">
            Dispositivos Suportados
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {SUPPORTED_DEVICES.map((dev) => (
              <div
                key={dev.label}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border"
                style={{
                  borderColor: `${dev.color}33`,
                  backgroundColor: dev.bg,
                }}
              >
                <dev.icon
                  size={16}
                  style={{ color: dev.color }}
                  aria-hidden="true"
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: dev.color }}
                >
                  {dev.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-heading text-3xl font-bold text-foreground mb-3">
              O que Dizem os Usuários
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                data-ocid={`testimonials.item.${i + 1}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-5 rounded-xl border border-border bg-card card-glow"
              >
                <div
                  className="flex gap-0.5 mb-3"
                  aria-label={`${t.stars} estrelas`}
                >
                  {Array.from({ length: t.stars }, (_, j) => (
                    <Star
                      key={String(j)}
                      size={14}
                      className="text-primary fill-primary"
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  "{t.text}"
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <span
                      className="text-[10px] font-bold text-primary"
                      aria-hidden="true"
                    >
                      {t.name[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      {t.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {t.role}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 border-t border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-10 rounded-2xl border border-primary/20 bg-primary/5"
          >
            <h2 className="font-heading text-3xl font-bold text-foreground mb-4">
              Pronto para Simular sua Rede?
            </h2>
            <p className="text-muted-foreground mb-6">
              Gratuito, sem instalação, funciona no seu celular agora.
            </p>
            <Button
              data-ocid="cta.primary_button"
              onClick={onOpenSimulator}
              className="bg-primary text-primary-foreground hover:opacity-90 h-12 px-8 text-base orange-glow"
            >
              Começar Agora
              <ArrowRight size={16} className="ml-2" aria-hidden="true" />
            </Button>
            <div className="flex justify-center gap-4 mt-6">
              {BENEFIT_BADGES.map((b) => (
                <div
                  key={b}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground"
                >
                  <CheckCircle
                    size={14}
                    className="text-primary"
                    aria-hidden="true"
                  />
                  {b}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Network
                  size={14}
                  className="text-primary"
                  aria-hidden="true"
                />
              </div>
              <span className="font-heading font-bold text-sm">
                Packet Tracer Mobile
              </span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              © {year}. Built with ❤️ using{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${utm}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
