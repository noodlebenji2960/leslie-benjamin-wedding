import { Link, useLocation } from "react-router";
import { useRef, useEffect, useLayoutEffect, useState, useMemo } from "react";
import { useBuildLink } from "@/hooks/useBuildLink";
import { useSiteConfig } from "@/contexts/ConfigContext";

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
  const config = useSiteConfig();
  const { buildLink } = useBuildLink();
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

  // Only include enabled links
  const filteredLinks = useMemo(() => {
    return links.filter((l) => {
      const key = l.path.replace("/", "") || "home";
      const feature = (config as any)[key];
      return feature?.enabled ?? true; // default to true if missing
    });
  }, [links, config]);

  // Update indicator position
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

  const handleMouseEnter = (el: HTMLElement) => {
    setIsHovering(true);
    updateIndicator(el);
  };
  const handleMouseLeave = () => setIsHovering(false);

  useEffect(() => {
    if (isHovering) return;
    if (!navLinksRef.current) return;

    const linksEl = Array.from(
      navLinksRef.current.querySelectorAll(".nav-link"),
    ) as HTMLElement[];
    const activeIndex = filteredLinks.findIndex((l) =>
      l.path === "/" ? isHome : currentPath === l.path,
    );
    if (activeIndex === -1) return;

    updateIndicator(linksEl[activeIndex]);
  }, [
    location.pathname,
    locale,
    isHovering,
    filteredLinks,
    isHome,
    currentPath,
  ]);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!navLinksRef.current) return;

      const linksEl = Array.from(
        navLinksRef.current.querySelectorAll(".nav-link"),
      ) as HTMLElement[];
      const activeIndex = filteredLinks.findIndex((l) =>
        l.path === "/" ? isHome : currentPath === l.path,
      );
      if (activeIndex === -1) return;

      updateIndicator(linksEl[activeIndex]);
    };

    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [filteredLinks, isHome, currentPath]);

  if (!config.layout?.showHeader?.enabled) return null;

  return (
    <nav className="nav">
      <div className="nav-links desktop" ref={navLinksRef}>
        {filteredLinks.map((l) => (
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
