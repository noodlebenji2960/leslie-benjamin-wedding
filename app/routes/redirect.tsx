// app/routes/redirect.tsx
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router";

export default function Redirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const currentPath = location.pathname;

    // Stop if we're already on a language-prefixed route
    if (currentPath.startsWith("/es") || currentPath.startsWith("/en")) {
      return;
    }

    // Check if we have a stored redirect from 404.html
    const redirect = sessionStorage.getItem("redirect");

    if (redirect) {
      sessionStorage.removeItem("redirect");

      // If the stored redirect does not include a language prefix, prepend
      // the detected language so the SPA routes (which are mounted under
      // `/en` and `/es`) handle the path. This prevents an endless loop
      // where the browser requests the raw path, the server returns 404
      // (serving 404.html), which again redirects to `/`, and so on.
      const isLangPrefixed = /^\/(en|es)(\/|$)/.test(redirect);
      const browserLang = navigator.language.split("-")[0].toLowerCase();
      const lang = browserLang === "es" ? "es" : "en";

      if (isLangPrefixed) {
        navigate(redirect, { replace: true });
      } else {
        // Ensure leading slash
        const path = redirect.startsWith("/") ? redirect : `/${redirect}`;
        navigate(`/${lang}${path}`, { replace: true });
      }

      return;
    }

    // Otherwise, detect browser language and redirect
    const browserLang = navigator.language.split("-")[0].toLowerCase();
    const lang = browserLang === "es" ? "es" : "en";
    
    console.log("redirecting to", lang);

    navigate(`/${lang}`, { replace: true });
  }, [navigate, location.pathname]);

  return null;
}
