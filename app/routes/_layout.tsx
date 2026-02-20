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
import Footer from "@/components/Footer";
import { CookieConsentModal } from "@/components/CookieConsentModal";
import { useLayout } from "@/contexts/LayoutContext"; // New import [cite:5]

export default function Layout() {
  const location = useLocation();
  const outlet = useOutlet();
  const [isPending, startTransition] = useTransition();
  const { locale, switchLanguage } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useTranslation(["common"]);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const [cookieConsentModalMode, setCookieConsentModalMode] =
    useState("first_visit");
  const [isCookieConsentModalOpen, setIsCookieConsentModalOpen] =
    useState(true);
    const mainRef = useRef<HTMLDivElement>(null);
    const layout = useLayout();

  const lenis = useLenis(() => {});

  const {
    state: { fixedOffsetY },
  } = useLayout();

  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true });
  }, [location.pathname, lenis]);

  const links = [
    { path: "/", label: t("nav.home") },
    { path: "/rsvp", label: t("nav.rsvp") },
    { path: "/schedule", label: t("nav.schedule") },
    { path: "/qa", label: t("nav.qa") },
  ];

  const openCookieConsentModal = () => {
    setCookieConsentModalMode("change_preferences");
    setIsCookieConsentModalOpen(true);
  };

  const closeCookieConsentModal = () => {
    setIsCookieConsentModalOpen(false);
  };

  useEffect(() => {
    console.log("cookieConsentModalMode", cookieConsentModalMode);
    if (!isCookieConsentModalOpen) {
      setCookieConsentModalMode("first_visit");
    }
  }, [cookieConsentModalMode]);

  useEffect(() => {
    if(mainRef.current){
      mainRef.current.style.setProperty("--y-offset", (layout.state.fixedOffsetY * -1)+ "px");
    }
  }, [layout.state.fixedOffsetY]);

  return (
    <ReactLenis
      root
      options={{
        prevent: (node) => node.closest(".search-dropdown__list") !== null,
      }}
    >
      <CookieConsentModal
        isOpen={isCookieConsentModalOpen}
        onClose={closeCookieConsentModal}
        mode={cookieConsentModalMode}
      />
      <div className="container">
        <Header
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          locale={locale}
          links={links}
          onLanguageSwitch={() => startTransition(switchLanguage)}
          isPending={isPending}
          hamburgerRef={hamburgerRef}
        />
        <main className="main" ref={mainRef}>
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
          <motion.div
            className="fixed-container"
            animate={{ y: fixedOffsetY }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
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
          </motion.div>
          <Footer openCookieConsentModal={openCookieConsentModal} />
        </main>
      </div>
    </ReactLenis>
  );
}
