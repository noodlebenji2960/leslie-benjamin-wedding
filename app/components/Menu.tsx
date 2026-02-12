import { Link } from "react-router";
import { useEffect, useRef } from "react";
import "@/styles/components/Menu.scss";
import ThemeSwitcher from "./ThemeSwitcher";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  links: { path: string; label: string }[];
  buildLink: (path: string) => string;
  locale: string;
  onLanguageSwitch: () => void;
  isPending: boolean;
  hamburgerRef: React.RefObject<HTMLElement>;
}

export function MobileMenu({
  open,
  onClose,
  links,
  buildLink,
  hamburgerRef,
  onLanguageSwitch,
}: MobileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { locale } = useLanguage();

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        !hamburgerRef.current?.contains(target)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose, hamburgerRef]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div
      ref={menuRef}
      className={`mobile-menu ${open ? "open" : ""}`}
      aria-hidden={!open}
    >
      <nav className="mobile-nav">
        {links.map((l) => (
          <Link key={l.path} to={buildLink(l.path)} onClick={onClose}>
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="mobile-footer">
        <LanguageSwitcher currentLocale={locale} onSwitch={onLanguageSwitch} />
        <span className="seperator" />
        <ThemeSwitcher />
      </div>
    </div>
  );
}
