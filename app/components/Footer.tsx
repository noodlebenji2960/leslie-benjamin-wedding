import { useWeddingData } from "@/hooks/useWeddingData";
import { Countdown } from "./Countdown";
import "../styles/components/Footer.scss";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "react-router";

const Footer = ({
  openCookieConsentModal,
}: {
  openCookieConsentModal: () => void;
}) => {
  const location = useLocation();
  const { locale } = useLanguage();

  const weddingData = useWeddingData();
  const { t } = useTranslation();

  const isHome =
    location.pathname === "/" ||
    location.pathname === "" ||
    location.pathname === `/${locale}`;

  // Guard while data loads
  if (!weddingData?.wedding) return null;

  const { date } = weddingData.wedding;
  const { time } = weddingData.wedding.ceremony;

  return (
    <footer className="footer">
      <div className="footer-content">
        {!isHome && <Countdown size="sm" date={date} time={time} />}
        <button onClick={openCookieConsentModal} className="footer__cookie-btn">
          {t("common:change_cookie_preferences", "See cookie Preferences.")}
        </button>
      </div>
    </footer>
  );
};

export default Footer;
