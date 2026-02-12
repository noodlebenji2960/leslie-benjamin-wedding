import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { useRef, useEffect, useState } from "react";
import "@/styles/components/Header.scss";
import { useWeddingData } from "@/hooks/useWeddingData";
import { Countdown } from "./Countdown";
import { AnimatePresence, motion } from "framer-motion";

interface NavLink {
  path: string;
  label: string;
}

interface HeaderProps {
  locale: string;
  links: NavLink[];
  buildLink: (path: string) => string;
  menuOpen?: boolean;
  setMenuOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  onLanguageSwitch?: () => void;
  isPending?: boolean;
  hamburgerRef?: React.RefObject<HTMLButtonElement | null>;
}

export default function Header({ locale, links, buildLink }: HeaderProps) {
  const { t } = useTranslation(["common"]);
  const location = useLocation();
  const navLinksRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const wedding = useWeddingData();

  const stripLocale = (path: string) => path.replace(/^\/(en|es)/, "") || "/";

  const currentPath = stripLocale(location.pathname);
  const isHome = currentPath === "/" || currentPath === "";

  const updateIndicator = (index: number) => {
    if (!navLinksRef.current) return;
    const el = navLinksRef.current.querySelectorAll(".nav-link")[
      index
    ] as HTMLElement;
    if (!el) return;

    const navRect = navLinksRef.current.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    setIndicatorStyle({
      left: elRect.left - navRect.left,
      width: elRect.width,
    });
  };

  // Set active indicator on mount/route change
  useEffect(() => {
    if (isHovering) return; // Don't update if hovering

    const activeIndex = links.findIndex((l) =>
      l.path === "/" ? isHome : currentPath === l.path,
    );
    if (activeIndex === -1) return;

    updateIndicator(activeIndex);
  }, [location.pathname, locale, isHovering]);

  const handleMouseEnter = (index: number) => {
    setIsHovering(true);
    updateIndicator(index);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    // Indicator will snap back to active via useEffect
  };

  const coupleNames = `${wedding.bride.firstName} & ${wedding.groom.firstName}`;

  return (
    <>
      <nav className="nav">
        {/* LOGO - Show ONLY on HOME */}
        <AnimatePresence>
          {!isHome && (
            <motion.div
              className="logo-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <Link to={buildLink("/")} className="logo">
                <h1>{coupleNames}</h1>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* COUNTDOWN - Show ONLY off HOME */}
        <AnimatePresence>
          {!isHome && (
            <motion.div
              className="nav-countdown"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <Countdown
                size="sm"
                date={wedding.wedding.date}
                time={wedding.wedding.ceremony.time}
              />
            </motion.div>
          )}
        </AnimatePresence>
        <div className="nav-links desktop" ref={navLinksRef}>
          {links.map((l, index) => (
            <Link
              key={l.path}
              to={buildLink(l.path)}
              className="nav-link"
              onMouseEnter={() => handleMouseEnter(index)}
              onMouseLeave={handleMouseLeave}
            >
              {l.label}
            </Link>
          ))}

          <div
            className="nav-indicator"
            style={{
              transform: `translateX(${indicatorStyle.left}px)`,
              width: indicatorStyle.width,
            }}
          />
        </div>
      </nav>
    </>
  );
}
