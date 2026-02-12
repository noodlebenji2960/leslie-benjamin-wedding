import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useNavigate, useLocation } from "react-router";
import { useTranslation } from "react-i18next";

interface LanguageContextValue {
  locale: "en" | "es";
  switchLanguage: () => void;
  isPending: boolean;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();
  const [isPending, setIsPending] = useState(false);

  // Get locale from current URL
  const getLocaleFromPath = (path: string) => {
    if (path.startsWith("/en")) return "en";
    if (path.startsWith("/es")) return "es";
    return "es"; // fallback
  };

  const locale = getLocaleFromPath(location.pathname);

  // Sync i18next language whenever URL changes
  useEffect(() => {
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale, i18n]);

  const switchLanguage = () => {
    setIsPending(true);
    const newLocale = locale === "es" ? "en" : "es";
    localStorage.setItem("preferred-language", newLocale);

    const pathWithoutLocale =
      location.pathname.replace(/^\/(en|es)/, "") || "/";
    navigate(`/${newLocale}${pathWithoutLocale}`, { replace: true });

    setIsPending(false);
  };

  return (
    <LanguageContext.Provider value={{ locale, switchLanguage, isPending }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook to access language context
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx)
    throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
