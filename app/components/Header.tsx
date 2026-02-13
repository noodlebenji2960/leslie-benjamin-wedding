import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { useRef, useEffect, useLayoutEffect, useState } from "react";
import "@/styles/components/Header.scss";
import { useWeddingData } from "@/hooks/useWeddingData";
import { useBuildLink } from "@/hooks/useBuildLink";

interface NavLink {
  path: string;
  label: string;
}

interface HeaderProps {
  locale: string;
  links: NavLink[];
  menuOpen?: boolean;
  setMenuOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  onLanguageSwitch?: () => void;
  isPending?: boolean;
  hamburgerRef?: React.RefObject<HTMLButtonElement | null>;
}

export default function Header({ locale, links }: HeaderProps) {
  const { navigateTo, buildLink } = useBuildLink();
  const { t } = useTranslation(["common"]);
  const location = useLocation();
  const navLinksRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({
    left: 0,
    top: 0,
    width: 0,
  });
  const [isHovering, setIsHovering] = useState(false);

  const stripLocale = (path: string) => path.replace(/^\/(en|es)/, "") || "/";
  const currentPath = stripLocale(location.pathname);
  const isHome = currentPath === "/" || currentPath === "";

  // Update indicator position based on a link element
  const updateIndicator = (el: HTMLElement) => {
    if (!navLinksRef.current || !el) return;
    const navRect = navLinksRef.current.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    setIndicatorStyle({
      left: elRect.left - navRect.left,
      top: elRect.bottom - navRect.top - 3,
      width: elRect.width,
    });
  };

  // Handle hover
  const handleMouseEnter = (el: HTMLElement) => {
    setIsHovering(true);
    updateIndicator(el);
  };
  const handleMouseLeave = () => setIsHovering(false);

  // Set indicator to active route on mount / route change / locale change
  useEffect(() => {
    if (isHovering) return;
    if (!navLinksRef.current) return;

    const linksEl = Array.from(
      navLinksRef.current.querySelectorAll(".nav-link"),
    ) as HTMLElement[];
    const activeIndex = links.findIndex((l) =>
      l.path === "/" ? isHome : currentPath === l.path,
    );
    if (activeIndex === -1) return;

    updateIndicator(linksEl[activeIndex]);
  }, [location.pathname, locale, isHovering, links, isHome, currentPath]);

  // Recalculate indicator on window resize
  useLayoutEffect(() => {
    const handleResize = () => {
      if (!navLinksRef.current) return;

      const linksEl = Array.from(
        navLinksRef.current.querySelectorAll(".nav-link"),
      ) as HTMLElement[];
      const activeIndex = links.findIndex((l) =>
        l.path === "/" ? isHome : currentPath === l.path,
      );
      if (activeIndex === -1) return;

      updateIndicator(linksEl[activeIndex]);
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // initial calculation
    return () => window.removeEventListener("resize", handleResize);
  }, [links, isHome, currentPath]);

  return (
    <nav
      className="nav"
    >
      <div className="nav-links desktop" ref={navLinksRef}>
        {links.map((l) => (
          <Link
            key={l.path}
            to={buildLink(l.path)}
            className="nav-link"
            ref={(el) => {}}
            onMouseEnter={(e) => handleMouseEnter(e.currentTarget)}
            onMouseLeave={handleMouseLeave}
          >
            {l.label}
          </Link>
        ))}

        {/* Fully dynamic indicator */}
        <div
          className="nav-indicator"
          style={{
            transform: `translate(${indicatorStyle.left}px)`,
            width: indicatorStyle.width,
          }}
        />
      </div>
    </nav>
  );
}
