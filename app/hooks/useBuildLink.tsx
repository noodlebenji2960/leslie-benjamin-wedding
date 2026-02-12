import { useContext } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export function useBuildLink() {
  const { locale } = useLanguage();

  const buildLink = (path: string): string => {
    // Handle root path specially (no trailing slash)
    const cleanPath = path === "/" ? "" : path;
    return `/${locale}${cleanPath}`;
  };

  return buildLink;
}
