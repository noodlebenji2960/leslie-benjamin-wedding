import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import { BackToTopButton } from "@/components/BackToTopButton";
import ThemeSwitcher from "@/components/ThemeSwitcher";

const LEGAL_PAGES = {
  terms: {
    namespace: "terms",
    sections: [
      "dataPrivacy",
      "dietaryInfo",
      "photoVideo",
      "rsvpAccuracy",
      "rsvpDeadline",
      "minors",
      "musicRequests",
      "contact",
      "changes",
      "governing",
    ],
    hasAgreement: true,
  },
  privacy: {
    namespace: "privacy",
    sections: [
      "dataController",
      "dataCollected",
      "howWeUse",
      "legalBasis",
      "dataSharing",
      "dataRetention",
      "yourRights",
      "cookies",
      "dataSecurity",
      "thirdPartyLinks",
      "changes",
      "contact",
    ],
    hasAgreement: false,
  },
} as const;

type LegalPageKey = keyof typeof LEGAL_PAGES;

export default function LegalPage() {
  const { page } = useParams<{ page: LegalPageKey }>();
  const config =
    page && LEGAL_PAGES[page] ? LEGAL_PAGES[page] : LEGAL_PAGES.terms;
  const { t } = useTranslation(config.namespace);
  const { locale, switchLanguage, isPending } = useLanguage();

  return (
    <div className="legal-page">
      <div className="fixed-container">
        <LanguageSwitcher
          currentLocale={locale}
          onSwitch={switchLanguage}
          isPending={isPending}
        />
        <div className="group">
          <BackToTopButton
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
          />
          <ThemeSwitcher />
        </div>
      </div>
      <div className="legal-page__inner">
        <header className="legal-page__header">
          <div className="legal-page__ornament" aria-hidden="true">
            ❧
          </div>
          <h1 className="legal-page__title">{t("title")}</h1>
          <p className="legal-page__updated">{t("lastUpdated")}</p>
          <p className="legal-page__intro">{t("intro")}</p>
        </header>

        <div className="legal-page__divider" aria-hidden="true" />

        <main className="legal-page__body">
          {config.sections.map((key) => (
            <section key={key} className="legal-page__section">
              <h2 className="legal-page__section-title">
                {t(`sections.${key}.title`)}
              </h2>
              <p className="legal-page__section-body">
                {t(`sections.${key}.body`)}
              </p>
            </section>
          ))}
        </main>

        <footer className="legal-page__footer">
          <div className="legal-page__divider" aria-hidden="true" />
          {config.hasAgreement && (
            <p className="legal-page__agreement">{t("agreement")}</p>
          )}
          <div
            className="legal-page__ornament legal-page__ornament--footer"
            aria-hidden="true"
          >
            ✦
          </div>
        </footer>
      </div>
    </div>
  );
}
