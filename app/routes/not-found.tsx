// app/routes/not-found.tsx
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import type { Route } from "./+types/not-found";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Page Not Found - Leslie & Benjamin" }];
}

export default function NotFound(_props: Route.ComponentProps) {
  const navigate = useNavigate();
  const { t } = useTranslation("notFound");

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="not-found__container">
      <motion.h1
        className="not-found__title"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {t("notFound.title")}
      </motion.h1>
      <p className="not-found__message">{t("notFound.message")}</p>
      <p className="not-found__help">{t("notFound.help")}</p>
      <div className="not-found__actions">
        <Link className="not-found__button not-found__button--primary" to="/">
          {t("notFound.actions.goHome")}
        </Link>
        <button
          type="button"
          className="not-found__button not-found__button--secondary"
          onClick={handleGoBack}
        >
          {t("notFound.actions.goBack")}
        </button>
      </div>
    </div>
  );
}
