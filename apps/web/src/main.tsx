import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import Home from "./Home";
import "../../shared/styles.css";
import "../../shared/mission-styles.css";
const Runner = lazy(() => import("./Runner"));
const Crowd = lazy(() => import("./Crowd"));
const path = location.pathname.replace(/\/+$/, "") || "/";
const page =
  path === "/play" ? (
    <Runner />
  ) : path === "/crowd" ? (
    <Crowd />
  ) : path === "/" ? (
    <Home />
  ) : (
    <main className="crowd-shell">
      <h1>Route not found.</h1>
      <a href="/">Return to RIFT RUN ↗</a>
    </main>
  );
createRoot(document.getElementById("root")!).render(
  <Suspense
    fallback={
      <main className="crowd-shell">
        <p className="loading-state">Loading the venue…</p>
      </main>
    }
  >
    {page}
  </Suspense>,
);
