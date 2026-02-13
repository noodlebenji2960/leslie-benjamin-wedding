// src/contexts/AnalyticsContext.tsx
import React, {
  createContext,
  useContext,
  useRef,
  type ReactNode,
} from "react";
import EVENT_CATALOG_JSON from "@/data/analytics-events-catalog.json";
import type { CookiePreference } from "./SessionContext";

const isProd = import.meta.env.MODE === "production";

interface EventConfig {
  category: string;
  dedupeKey?: string;
  allowDuplicates?: boolean;
  nonInteraction?: boolean;
}

const EVENT_CATALOG = EVENT_CATALOG_JSON as Record<string, EventConfig>;
type EventName = keyof typeof EVENT_CATALOG_JSON;

const DYNAMIC_DEDUPE_KEYS: Record<
  string,
  (params?: Record<string, any>) => string
> = {
  conversion: (params) => `conversion_${params?.event_label || "unknown"}`,
};

interface AnalyticsContextType {
  event: (eventName: EventName, params?: Record<string, any>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

const gtag = (...args: any[]) => {
  if (!isProd) {
    console.log("[Analytics Debug]", ...args);
    return;
  }
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag(...args);
  } else {
    console.warn("[Analytics] gtag not loaded yet");
  }
};

// ✅ Consent-aware AnalyticsProvider
export const AnalyticsProvider: React.FC<{
  children: ReactNode;
  cookiePreference: CookiePreference | null;
}> = ({ children, cookiePreference }) => {
  const trackedEventsRef = useRef<Set<string>>(new Set());

  const event = (eventName: EventName, params?: Record<string, any>) => {
    if (!cookiePreference?.analytics) {
      console.log(`[Analytics] Skipping "${eventName}" — user did not consent`);
      return;
    }

    const config = EVENT_CATALOG[eventName as string];
    if (!config)
      return console.error(`[Analytics] Unknown event: ${eventName}`);

    let dedupeKey: string | undefined;
    if (
      config.dedupeKey === "dynamic" &&
      DYNAMIC_DEDUPE_KEYS[eventName as string]
    ) {
      dedupeKey = DYNAMIC_DEDUPE_KEYS[eventName as string](params);
    } else if (config.dedupeKey) dedupeKey = config.dedupeKey;

    const allowDuplicates = config.allowDuplicates ?? !dedupeKey;
    if (
      !allowDuplicates &&
      dedupeKey &&
      trackedEventsRef.current.has(dedupeKey)
    )
      return;

    gtag("event", eventName, {
      event_category: config.category,
      ...(config.nonInteraction && { non_interaction: true }),
      ...params,
    });

    if (!allowDuplicates && dedupeKey) trackedEventsRef.current.add(dedupeKey);
  };

  return (
    <AnalyticsContext.Provider value={{ event }}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = (): AnalyticsContextType => {
  const context = useContext(AnalyticsContext);
  if (!context)
    throw new Error("useAnalytics must be used within an AnalyticsProvider");
  return context;
};
