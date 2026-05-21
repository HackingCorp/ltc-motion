import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { StudioApp } from "./App";
import { StudioErrorBoundary } from "./components/StudioErrorBoundary";
import { trackStudioEvent } from "./utils/studioTelemetry";
import "./styles/studio.css";

trackStudioEvent("session_start");

window.addEventListener("error", (event) => {
  trackStudioEvent("unhandled_error", {
    error_message: event.message,
    filename: event.filename ?? null,
    lineno: event.lineno ?? null,
    colno: event.colno ?? null,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  trackStudioEvent("unhandled_promise_rejection", {
    error_message: event.reason instanceof Error ? event.reason.message : String(event.reason),
  });
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StudioErrorBoundary>
      <StudioApp />
    </StudioErrorBoundary>
  </StrictMode>,
);
