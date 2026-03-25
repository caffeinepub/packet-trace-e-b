import { useState } from "react";
import LandingPage from "./pages/LandingPage";
import SimulatorPage from "./pages/SimulatorPage";

type Route = "landing" | "simulator";

export default function App() {
  const [route, setRoute] = useState<Route>("landing");

  if (route === "simulator") {
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <SimulatorPage onBack={() => setRoute("landing")} />
      </div>
    );
  }

  return (
    <div className="landing-scroll">
      <LandingPage onOpenSimulator={() => setRoute("simulator")} />
    </div>
  );
}
