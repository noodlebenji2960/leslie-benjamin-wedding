// Place this as your root error boundary — React Router v7 picks it up
// via `export function ErrorBoundary()` in root.tsx or any route file.

import { isRouteErrorResponse, useRouteError, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

const isProd = import.meta.env.MODE === "production";

// ─── helpers ────────────────────────────────────────────────────────────────

function getStatusInfo(status: number): { title: string; description: string } {
  switch (status) {
    case 404:
      return {
        title: "404 — Page not found",
        description:
          "The page you're looking for doesn't exist or has been moved.",
      };
    case 403:
      return {
        title: "403 — Forbidden",
        description: "You don't have permission to access this page.",
      };
    case 500:
      return {
        title: "500 — Server error",
        description: "Something went wrong on our end. Please try again later.",
      };
    default:
      return {
        title: `${status} — Unexpected error`,
        description: "An unexpected error occurred.",
      };
  }
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
    <div className="error-boundary__dev-panel">
      <button
        className="error-boundary__dev-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="error-boundary__dev-badge">DEV</span>
        {label}
        <span className="error-boundary__dev-chevron">{open ? "▲" : "▼"}</span>
      </button>

      {open && <pre className="error-boundary__dev-stack">{detail}</pre>}
    </div>
  );
}

// ─── Main boundary ──────────────────────────────────────────────────────────

export function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  // i18n is loaded at root level so it's safe to use here
  const { t, i18n } = useTranslation(["common"]);

  // Derive locale from current URL so we can go "home" correctly
  const locale =
    typeof window !== "undefined" && window.location.pathname.startsWith("/en")
      ? "en"
      : "es";

  // ── resolve status / message ──
  let status = 500;
  let userMessage = "";

  if (isRouteErrorResponse(error)) {
    status = error.status;
    const info = getStatusInfo(status);
    userMessage = info.description;
  } else if (error instanceof Error) {
    userMessage = isProd
      ? t("errors.genericMessage", "Something went wrong. Please try again.")
      : error.message;
  } else {
    userMessage = t(
      "errors.genericMessage",
      "Something went wrong. Please try again.",
    );
  }

  const { title } = getStatusInfo(status);

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
    <div className="error-boundary">
      <div className="error-boundary__card">
        <p className="error-boundary__status">{status}</p>
        <h1 className="error-boundary__title">
          {status === 404
            ? t("errors.notFoundTitle", "Page not found")
            : t("errors.errorTitle", "Something went wrong")}
        </h1>
        <p className="error-boundary__message">{userMessage}</p>

        <div className="error-boundary__actions">
          <button
            className="error-boundary__btn error-boundary__btn--primary"
            onClick={() => navigate(`/${locale}`)}
          >
            {t("errors.goHome", "Go home")}
          </button>
          <button
            className="error-boundary__btn error-boundary__btn--ghost"
            onClick={() => navigate(-1)}
          >
            {t("errors.goBack", "Go back")}
          </button>
        </div>
      </div>

      {/* Dev-only error details */}
      {!isProd && <DevErrorPanel error={error} />}
    </div>
  );
}
