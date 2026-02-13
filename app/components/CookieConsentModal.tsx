import { useSession, type CookiePreference } from "@/contexts/SessionContext";
import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { Toast } from "./Toast";
import { Trans, useTranslation } from "react-i18next";
import { WaveEmoji } from "./WaveEmoji";
import "@/styles/components/CookieConsentModal.scss";

// -------------------------
// Define cookie options
// -------------------------
export const COOKIE_OPTIONS: {
  key: keyof CookiePreference;
  label: string;
  required?: boolean;
}[] = [
  { key: "necessary", label: "Necessary cookies (required)", required: true },
  { key: "analytics", label: "Analytics cookies" },
  { key: "personalization", label: "Personalization cookies" },
];

interface CookieConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: "first_visit" | "change_preferences";
}

export function CookieConsentModal({
  isOpen,
  onClose,
  mode = "first_visit",
}: CookieConsentModalProps) {
  const { visitor, cookiePreference, setCookiePreference } = useSession();
  const { t } = useTranslation(["home", "common"]);

  // -------------------------
  // Local preferences (live)
  // -------------------------
  const [prefs, setPrefs] = useState<CookiePreference>(() =>
    COOKIE_OPTIONS.reduce((acc, opt) => {
      acc[opt.key] = opt.required
        ? true
        : (cookiePreference?.[opt.key] ?? false);
      return acc;
    }, {} as CookiePreference),
  );

  const personalizationAllowed = prefs.personalization === true;

  const [showPreferencesSection, setShowPreferencesSection] = useState(
    mode === "change_preferences" || cookiePreference === null,
  );

  // Sync prefs when modal opens or stored prefs change
  useEffect(() => {
    if (!isOpen) return;

    setPrefs(
      COOKIE_OPTIONS.reduce((acc, opt) => {
        acc[opt.key] = opt.required
          ? true
          : (cookiePreference?.[opt.key] ?? false);
        return acc;
      }, {} as CookiePreference),
    );

    setShowPreferencesSection(
      mode === "change_preferences" || cookiePreference === null,
    );
  }, [isOpen, cookiePreference, mode]);

  if (!visitor) {
    return (
      <Modal isOpen={isOpen} onClose={onClose}>
        <p className="ccm__loading">{t("common:loading", "Loading...")}</p>
      </Modal>
    );
  }

  // -------------------------
  // Actions
  // -------------------------
  const handleSavePreferences = () => {
    setCookiePreference(prefs);
    onClose();
  };

  const handleAcceptAll = () => {
    const newPrefs = COOKIE_OPTIONS.reduce((acc, opt) => {
      acc[opt.key] = true;
      return acc;
    }, {} as CookiePreference);

    setPrefs(newPrefs);
    setCookiePreference(newPrefs);
    onClose();
  };

  const handleRejectAll = () => {
    const newPrefs = COOKIE_OPTIONS.reduce((acc, opt) => {
      acc[opt.key] = opt.required ? true : false;
      return acc;
    }, {} as CookiePreference);

    setPrefs(newPrefs);
    setCookiePreference(newPrefs);
    onClose();
  };

  // -------------------------
  // Greeting (consent-aware)
  // -------------------------
  const renderGreeting = () => {
    // No personalization → generic greeting
    if (!personalizationAllowed) {
      return t("common:welcome_generic", "Welcome to our wedding website!");
    }

    if (mode !== "first_visit") {
      return t(
        "common:change_preferences_prompt",
        "Change your preferences to improve your experience.",
      );
    }

    if (visitor.isFirstVisit) {
      return (
        <Trans
          i18nKey="home:welcome_first_visit"
          components={{ emoji: <WaveEmoji /> }}
        >
          Welcome to our wedding website! <emoji />
        </Trans>
      );
    }

    if (visitor.daysSinceLastVisit === 0) {
      return (
        <Trans
          i18nKey="home:welcome_back_today"
          components={{ emoji: <WaveEmoji /> }}
        >
          Welcome back! <emoji />
        </Trans>
      );
    }

    if (visitor.daysSinceLastVisit === 1) {
      return t(
        "home:welcome_back_yesterday",
        "Great to see you again! You were here yesterday.",
      );
    }

    if (visitor.daysSinceLastVisit < 7) {
      return t(
        "home:welcome_back_days",
        "Welcome back! It's been {{days}} days since your last visit.",
        { days: visitor.daysSinceLastVisit },
      );
    }

    return t(
      "home:welcome_back_long_time",
      "Welcome back! We've missed you! It's been {{days}} days.",
      { days: visitor.daysSinceLastVisit },
    );
  };

  // -------------------------
  // Returning user toast
  // -------------------------
  if (cookiePreference && mode === "first_visit") {
    return (
      <Toast isOpen={isOpen} onClose={onClose} autoClose={3000}>
        <p className="ccm__greeting">{renderGreeting()}</p>
      </Toast>
    );
  }

  // -------------------------
  // Modal UI
  // -------------------------
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="ccm">
        <button
          className="ccm__close"
          onClick={onClose}
          aria-label={t("common:close", "Close modal")}
        >
          ×
        </button>

        <p className="ccm__greeting">{renderGreeting()}</p>

        {showPreferencesSection ? (
          <div className="ccm__preferences" id="cookie-preferences">
            <p className="ccm__intro">
              {t(
                "common:cookie_intro",
                "We use cookies to improve your experience. You can choose which types of cookies you allow:",
              )}
            </p>

            <div className="ccm__checkboxes">
              {COOKIE_OPTIONS.map((opt) => (
                <label key={opt.key}>
                  <input
                    type="checkbox"
                    checked={prefs[opt.key]}
                    disabled={opt.required}
                    onChange={(e) =>
                      setPrefs({ ...prefs, [opt.key]: e.target.checked })
                    }
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            {!personalizationAllowed && (
              <p className="ccm__hint">
                {t(
                  "common:personalization_hint",
                  "Enable personalization to see a tailored welcome message.",
                )}
              </p>
            )}

            <div className="ccm__actions">
              <button className="ccm__save-btn" onClick={handleSavePreferences}>
                {t("common:save_preferences", "Save Preferences")}
              </button>
              <button className="ccm__accept-all-btn" onClick={handleAcceptAll}>
                {t("common:accept_all", "Accept All")}
              </button>
              <button className="ccm__reject-all-btn" onClick={handleRejectAll}>
                {t("common:reject_all", "Reject All")}
              </button>
            </div>
          </div>
        ) : (
          <button
            className="ccm__toggle-btn"
            onClick={() => setShowPreferencesSection(true)}
          >
            {t("common:show_preferences", "Show Preferences")}
          </button>
        )}
      </div>
    </Modal>
  );
}
