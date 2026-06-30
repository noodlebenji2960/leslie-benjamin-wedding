import { useLocation } from "react-router";
import { useMemo } from "react";
import { useBuildLink } from "@/hooks/useBuildLink";
import { useSiteConfig } from "@/contexts/ConfigContext";
import { TabNav } from "@/components/TabNav";

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

  const navItems = useMemo(
    () =>
      filteredLinks.map((l) => ({
        id: l.path,
        to: buildLink(l.path),
        content: l.label,
        active: l.path === "/" ? isHome : currentPath === l.path,
      })),
    [filteredLinks, buildLink, isHome, currentPath],
  );

  if (!config.layout?.showHeader?.enabled) return null;

  return (
    <nav className="nav">
      <TabNav
        items={navItems}
        className="nav-links desktop"
        itemClassName="nav-link"
        indicatorClassName="nav-indicator"
      />
    </nav>
  );
}
