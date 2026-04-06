# Packet Trace E.B — Curso Online

## Current State
- App has a landing page (`LandingPage.tsx`) and a full simulator (`SimulatorPage.tsx`)
- App routing is handled in `App.tsx` with `route` state: `"landing"` | `"simulator"`
- Backend stores topologies in ICP canister (createTopology, getTopology, listTopologies, updateTopology, deleteTopology)
- Authentication via Internet Identity
- No course, quiz, or certificate features exist yet

## Requested Changes (Diff)

### Add
- New route `"course"` in App.tsx
- `CoursePage.tsx` — full-page course with sidebar navigation and content area
- 8 course modules with full written content (Portuguese):
  1. Introdução às Redes — OSI model, TCP/IP, network types
  2. Dispositivos de Rede — Router, Switch, Hub, PC, Server, Firewall, Access Point
  3. Cabos e Ligações — cable types (direct, crossover, serial), ports, when to use each
  4. Endereçamento IP — IPv4, subnet masks, IPv6, DHCP
  5. Simulação Prática — how to use the simulator: add devices, connect cables, configure IPs
  6. CLI Cisco IOS — essential commands: enable, configure terminal, ip address, show commands
  7. Diagnóstico de Rede — Ping, Traceroute, interpreting results, reading OSI details
  8. Topologias Avançadas — VLANs, NAT, ACLs, OSPF/RIP, WiFi
- Quiz at the end of each module: 3-5 multiple choice questions
- Progress tracking stored per user in backend (module completion, quiz scores)
- Certificate of completion — shown/downloadable when all 8 modules are completed with passing quiz scores (≥70%)
- "Curso" button/link on the landing page
- Backend: course progress storage (saveModuleProgress, getProgress, hasCertificate)

### Modify
- `App.tsx` — add `"course"` route; add navigation to/from course page
- `LandingPage.tsx` — add "Curso" button in navbar and a course section/CTA
- `main.mo` — add course progress types and functions alongside topology functions

### Remove
- Nothing removed

## Implementation Plan
1. Update `main.mo` to add course progress storage (module scores per user, certificate eligibility)
2. Update `App.tsx` to support `"course"` route
3. Create `CoursePage.tsx` with:
   - Sidebar: module list with completion indicators
   - Content area: full lesson text for active module
   - Quiz panel: multiple choice questions after each lesson
   - Certificate view: shown on completion of all modules
4. Add course module content (all 8 modules) as static data in the frontend
5. Add "Curso" navigation link to LandingPage navbar and a course section
6. Wire backend progress saving to quiz completions via Internet Identity
