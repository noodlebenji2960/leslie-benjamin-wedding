import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/Modal";
import { useServer } from "@/contexts/ServerContext";

export function ServerStatus() {
  const { t } = useTranslation("gallery");
  const { healthState, health, healthStatusCode, checkHealth } = useServer();
  const [isOpen, setIsOpen] = useState(false);

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
        <span className={`server-status__dot server-status__dot--${healthState}`} />
        {t("status.label")}
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        modalTitle={t("status.label")}
      >
        <div className="server-status-detail">
          <p className="server-status-detail__row">
            <span className={`server-status__dot server-status__dot--${healthState}`} />
            {t(`status.${healthState}`)}
            {healthState !== "checking" && (
              <span className="server-status-detail__code">
                {healthStatusCode !== null
                  ? t("status.httpCode", { code: healthStatusCode })
                  : t("status.noResponse")}
              </span>
            )}
          </p>

          {health && (
            <p className="server-status-detail__timestamp">
              {t("status.lastChecked", {
                time: new Date(health.timestamp).toLocaleTimeString(),
              })}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
