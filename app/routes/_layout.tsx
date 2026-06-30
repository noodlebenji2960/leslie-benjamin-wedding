import { Outlet, useLocation, useNavigate, useOutlet } from "react-router";
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
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
import { useLayout } from "@/contexts/LayoutContext";
import { useSiteConfig } from "@/contexts/ConfigContext";
import { useWeddingData } from "@/hooks/useWeddingData";
import { useIsWeddingOver } from "@/hooks/useIsToday";

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
  const config = useSiteConfig();
  const wedding = useWeddingData();
  const [isPast] = useIsWeddingOver(wedding.wedding.date);

  const lenis = useLenis(() => {});

  const {
    state: { fixedOffsetY },
  } = useLayout();

  const hasScrolledRef = useRef(false);

  // Scroll the native window to top synchronously, before paint, so the
  // sticky nav (position: sticky; top: -50px) never renders mid-scroll —
  // Lenis isn't ready yet this early, so it can't do this for us.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (!lenis) return;
    if (hasScrolledRef.current) return;

    hasScrolledRef.current = true;

    const id = setTimeout(() => {
      lenis.scrollTo(0, { immediate: true });
    }, 400);

    return () => {
      clearTimeout(id);
      hasScrolledRef.current = false;
    };
  }, [location.pathname, lenis]);


  // RSVP and Q&A are pre-wedding logistics — drop them from the nav once
  // the wedding day has passed, even if the feature flag is still on.
  const closesWhenPast = ["/rsvp", "/qa"];

  const links = [
    { path: "/", label: t("nav.home") }, // always visible
    { path: "/rsvp", label: t("nav.rsvp"), feature: "rsvp" },
    { path: "/schedule", label: t("nav.schedule"), feature: "schedule" },
    { path: "/qa", label: t("nav.qa"), feature: "qa" },
    { path: "/gallery", label: t("nav.gallery"), feature: "gallery" },
  ].filter((link) => {
    if (isPast && closesWhenPast.includes(link.path)) return false;
    if (!link.feature) return true; // no feature key → always show
    return Boolean(
      link.feature.split(".").reduce((acc, key) => acc?.[key], config),
    );
  });

  const openCookieConsentModal = () => {
    setCookieConsentModalMode("change_preferences");
    setIsCookieConsentModalOpen(true);
  };

  const closeCookieConsentModal = () => {
    setIsCookieConsentModalOpen(false);
  };

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.style.setProperty(
        "--y-offset",
        layout.state.fixedOffsetY * -1 + "px",
      );
    }
  }, [layout.state.fixedOffsetY]);

  return (
    <ReactLenis
      root
      options={{
        prevent: (node) =>
          node.closest(".search-dropdown__list") !== null ||
          node.closest(".map-container-wrapper") !== null,
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
              {config.layout.theme.enabled && <ThemeSwitcher />}
            </div>
          </motion.div>
          <Footer openCookieConsentModal={openCookieConsentModal} />
        </main>
      </div>
    </ReactLenis>
  );
}
