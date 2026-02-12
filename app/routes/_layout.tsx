import { Outlet, useLocation, useNavigate, useOutlet } from "react-router";
import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Header from "@/components/Header";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { BackToTopButton } from "@/components/BackToTopButton";
import ReactLenis, { useLenis } from "lenis/react";

export default function Layout() {
  const location = useLocation();
  const outlet = useOutlet();
  const [isPending, startTransition] = useTransition();
  const { locale, switchLanguage } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useTranslation(["common"]);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  const lenis = useLenis(() => {});

  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true });
  }, [location.pathname, lenis]);

  const links = [
    { path: "/", label: t("nav.home") },
    { path: "/rsvp", label: t("nav.rsvp") },
    { path: "/schedule", label: t("nav.schedule") },
    { path: "/qa", label: t("nav.qa") },
  ];

  const buildLink = (path: string) => `/${locale}${path === "/" ? "" : path}`;

  return (
    <ReactLenis root>
      <div className="container">
        <Header
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          locale={locale}
          links={links}
          buildLink={buildLink}
          onLanguageSwitch={() => startTransition(switchLanguage)}
          isPending={isPending}
          hamburgerRef={hamburgerRef}
        />
        <main className="main">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              className="page-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
            >
              {outlet}
            </motion.div>
          </AnimatePresence>

          <div className="fixed-container">
            <LanguageSwitcher
              currentLocale={locale}
              onSwitch={switchLanguage}
              isPending={isPending}
            />
            <div className="group">
              <BackToTopButton
                onClick={() => lenis?.scrollTo(0, { duration: 1 })}
              />
              <ThemeSwitcher />
            </div>
          </div>
        </main>
      </div>
    </ReactLenis>
  );
}
