// Place this as your root error boundary — React Router v7 picks it up
// via `export function ErrorBoundary()` in root.tsx or any route file.

import { isRouteErrorResponse, useRouteError } from "react-router";
import { useEffect, useState } from "react";
import { ErrorPage, type ErrorPageStatus } from "@/components/ErrorPage";

const isProd = import.meta.env.MODE === "production";
const KNOWN_STATUSES: ErrorPageStatus[] = [403, 404, 500, 503];

function toErrorPageStatus(status: number): ErrorPageStatus {
  return KNOWN_STATUSES.includes(status as ErrorPageStatus)
    ? (status as ErrorPageStatus)
    : "default";
}

// ─── Dev panel ──────────────────────────────────────────────────────────────

function DevErrorPanel({ error }: { error: unknown }) {
  const [open, setOpen] = useState(true);

  const isRouteErr = isRouteErrorResponse(error);
  const isError = error instanceof Error;

  const label = isRouteErr
    ? `Route Error ${error.status}`
    : isError
      ? error.name
      : "Unknown error";

  const detail = isRouteErr
    ? JSON.stringify(error.data, null, 2)
    : isError
      ? (error.stack ?? error.message)
      : String(error);

  return (
    <div className="error-page__dev-panel">
      <button
        className="error-page__dev-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="error-page__dev-badge">DEV</span>
        {label}
        <span className="error-page__dev-chevron">{open ? "▲" : "▼"}</span>
      </button>

      {open && <pre className="error-page__dev-stack">{detail}</pre>}
    </div>
  );
}

// ─── Main boundary ──────────────────────────────────────────────────────────

export function ErrorBoundary() {
  const error = useRouteError();

  const status = isRouteErrorResponse(error) ? error.status : 500;

  // ── report to GA in prod ──
  useEffect(() => {
    if (!isProd) return;
    if (typeof window.gtag !== "function") return;
    window.gtag("event", "exception", {
      description: error instanceof Error ? error.message : String(error),
      fatal: status >= 500,
    });
  }, [error, status]);

  return (
    <ErrorPage status={toErrorPageStatus(status)}>
      {/* Dev-only error details */}
      {!isProd && <DevErrorPanel error={error} />}
    </ErrorPage>
  );
}
