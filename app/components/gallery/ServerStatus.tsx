import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/Modal";
import { Icon } from "@/components/Icon";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;
const POLL_INTERVAL = 30_000;

type ServerState = "checking" | "ok" | "degraded" | "down";

interface HealthResponse {
  status: string;
  db: string;
  timestamp: string;
}

export function ServerStatus() {
  const { t } = useTranslation("gallery");
  const [state, setState] = useState<ServerState>("checking");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const checkHealth = useCallback(async () => {
    if (!API_BASE) {
      setState("down");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/health`);
      const data: HealthResponse = await res.json();
      setHealth(data);
      setState(res.ok ? "ok" : "degraded");
    } catch {
      setHealth(null);
      setState("down");
    }
  }, []);

  useEffect(() => {
    void checkHealth();
    const id = setInterval(() => void checkHealth(), POLL_INTERVAL);
    return () => clearInterval(id);
  }, [checkHealth]);

  const handleOpen = () => {
    void checkHealth();
    setIsOpen(true);
  };

  return (
    <>
      <button
        type="button"
        className="server-status"
        onClick={handleOpen}
        aria-label={t("status.label")}
      >
        <span className={`server-status__dot server-status__dot--${state}`} />
        {t("status.label")}
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        modalTitle={t("status.label")}
      >
        <div className="server-status-detail">
          <p className="server-status-detail__row">
            <span className={`server-status__dot server-status__dot--${state}`} />
            {t(`status.${state}`)}
          </p>

          {health && (
            <>
              <p className="server-status-detail__row">
                <Icon.Checklist size={16} />
                {t("status.database")}: {t(`status.db.${health.db}`)}
              </p>
              <p className="server-status-detail__timestamp">
                {t("status.lastChecked", {
                  time: new Date(health.timestamp).toLocaleTimeString(),
                })}
              </p>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
