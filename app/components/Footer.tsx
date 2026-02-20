import { useWeddingData } from "@/hooks/useWeddingData";
import { Countdown } from "./Countdown";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "react-router";
import { useLayout } from "@/contexts/LayoutContext";
import { motion } from "framer-motion";

const Footer = ({
  openCookieConsentModal,
}: {
  openCookieConsentModal: () => void;
}) => {
  const location = useLocation();
  const { locale } = useLanguage();
  const {
    state: { fixedOffsetY },
  } = useLayout();
  const weddingData = useWeddingData();
  const { t } = useTranslation();

  const isHome =
    location.pathname === "/" ||
    location.pathname === "" ||
    location.pathname === `/${locale}`;

  if (!weddingData?.wedding) return null;

  const { date } = weddingData.wedding;
  const { time } = weddingData.wedding.ceremony;

  // Simple numeric value Framer can animate
  const spacing = Math.max(20, -fixedOffsetY + 20);

  return (
    <motion.footer
      className="footer"
      animate={{
        paddingBottom: `${spacing}px`,
        opacity: 1,
        y: 0,
      }}
      initial={{ opacity: 0, y: 20, paddingBottom: "20px" }}
      transition={{
        paddingBottom: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.4 },
        y: { duration: 0.4 },
      }}
    >
      <div className="footer-content">
        {!isHome && <Countdown size="sm" date={date} time={time} />}
        <button onClick={openCookieConsentModal} className="footer__cookie-btn">
          {t("common:change_cookie_preferences", "See cookie Preferences.")}
        </button>
      </div>
    </motion.footer>
  );
};

export default Footer;
