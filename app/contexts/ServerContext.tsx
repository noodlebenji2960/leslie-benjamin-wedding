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

interface ServerContextValue {
  config: ServerConfig | null;
  loading: boolean;
  refresh: () => Promise<void>;
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

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const value = useMemo<ServerContextValue>(
    () => ({
      config,
      loading,
      refresh: loadConfig,
    }),
    [config, loading, loadConfig],
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
