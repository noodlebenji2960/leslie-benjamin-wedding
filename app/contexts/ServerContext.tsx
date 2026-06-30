// src/contexts/ServerContext.tsx

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;
const HEALTH_POLL_INTERVAL = 30_000;

export interface ReactionGroup {
  key: string;
  label: string;
  icon: string;
  emojis: string[];
}

export interface ServerConfig {
  REACTION_GROUPS: ReactionGroup[];
  maxUploadSize: number;
  maxUploaderNameLength: number;
}

export type ServerHealthState = "checking" | "ok" | "degraded" | "down";

export interface ServerHealth {
  status: string;
  db: string;
  timestamp: string;
}

interface ServerContextValue {
  config: ServerConfig | null;
  loading: boolean;
  refresh: () => Promise<void>;
  healthState: ServerHealthState;
  health: ServerHealth | null;
  /** Raw HTTP status code from the last /health response (null if the request itself failed, e.g. network error). */
  healthStatusCode: number | null;
  /** False only once we've confirmed the server is unreachable/unhealthy — stays true while still checking, so the UI doesn't flash a "down" state on every load. */
  isAvailable: boolean;
  checkHealth: () => Promise<void>;
}

const DEFAULT_CONFIG: ServerConfig = {
  REACTION_GROUPS: [
    {
      key: "love",
      label: "Love",
      icon: "💖",
      emojis: ["❤️", "😍"],
    },
    {
      key: "fun",
      label: "Fun",
      icon: "💃",
      emojis: ["😂", "😮", "👏", "😢"],
    },
  ],
  maxUploadSize: 10 * 1024 * 1024,
  maxUploaderNameLength: 100,
};

const ServerContext = createContext<ServerContextValue | undefined>(undefined);

export function ServerProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthState, setHealthState] = useState<ServerHealthState>("checking");
  const [health, setHealth] = useState<ServerHealth | null>(null);
  const [healthStatusCode, setHealthStatusCode] = useState<number | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/config`);

      if (!res.ok) {
        throw new Error(`Failed to load config (${res.status})`);
      }

      const data = (await res.json()) as ServerConfig;
      setConfig({
        ...DEFAULT_CONFIG,
        ...data,
      });
    } catch (err) {
      console.error("Failed to load server config", err);

      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkHealth = useCallback(async () => {
    if (!API_BASE) {
      setHealthState("down");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/health`);
      const data: ServerHealth = await res.json();
      setHealth(data);
      setHealthStatusCode(res.status);
      setHealthState(res.ok ? "ok" : "degraded");
    } catch {
      setHealth(null);
      setHealthStatusCode(null);
      setHealthState("down");
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    void checkHealth();
    const id = setInterval(() => void checkHealth(), HEALTH_POLL_INTERVAL);
    return () => clearInterval(id);
  }, [checkHealth]);

  const value = useMemo<ServerContextValue>(
    () => ({
      config,
      loading,
      refresh: loadConfig,
      healthState,
      health,
      healthStatusCode,
      isAvailable: healthState !== "down" && healthState !== "degraded",
      checkHealth,
    }),
    [config, loading, loadConfig, healthState, health, healthStatusCode, checkHealth],
  );

  return (
    <ServerContext.Provider value={value}>{children}</ServerContext.Provider>
  );
}

export function useServer() {
  const context = useContext(ServerContext);

  if (!context) {
    throw new Error("useServer must be used within a ServerProvider");
  }

  return context;
}
