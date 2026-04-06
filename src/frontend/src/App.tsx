import { useState } from "react";
import CoursePage from "./pages/CoursePage";
import LandingPage from "./pages/LandingPage";
import SimulatorPage from "./pages/SimulatorPage";

type Route = "landing" | "simulator" | "course";

export default function App() {
  const [route, setRoute] = useState<Route>("landing");

  if (route === "simulator") {
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <SimulatorPage onBack={() => setRoute("landing")} />
      </div>
    );
  }

  if (route === "course") {
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <CoursePage onBack={() => setRoute("landing")} />
      </div>
    );
  }

  return (
    <div className="landing-scroll">
      <LandingPage
        onOpenSimulator={() => setRoute("simulator")}
        onOpenCourse={() => setRoute("course")}
      />
    </div>
  );
}
