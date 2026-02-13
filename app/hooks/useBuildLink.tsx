import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router";

export function useBuildLink() {
  const { locale } = useLanguage();
  const navigate = useNavigate()

  const buildLink = (path: string): string => {
    // Handle root path specially (no trailing slash)
    const cleanPath = path === "/" ? "" : path;
    return `/${locale}${cleanPath}`;
  };

  const navigateTo = (path: string) => {
    const pathWithLang = buildLink(path);
    navigate(pathWithLang);
  };

  return { navigateTo, buildLink };
}
