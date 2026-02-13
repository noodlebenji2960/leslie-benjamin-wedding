import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "@/contexts/SessionContext";

type ThemeValue = "light" | "dark" | "system";

type ThemeContextType = {
  theme: ThemeValue;
  setTheme: React.Dispatch<React.SetStateAction<ThemeValue>>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { cookiePreference } = useSession();
  const personalizationAllowed = cookiePreference?.personalization ?? false;

  const [theme, setTheme] = useState<ThemeValue>("system");
  const [loadedFromStorage, setLoadedFromStorage] = useState(false);

  // Load persisted theme when personalization is allowed or consent granted mid-session
  useEffect(() => {
    if (personalizationAllowed && !loadedFromStorage) {
      const stored = localStorage.getItem("theme") as ThemeValue;
      if (stored) setTheme(stored);
      setLoadedFromStorage(true);
    }

    // If personalization is revoked mid-session, do not persist changes
    if (!personalizationAllowed) {
      setLoadedFromStorage(false);
    }
  }, [personalizationAllowed, loadedFromStorage]);

  // Apply theme changes and persist only if allowed
  useEffect(() => {
    if (theme === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }

    if (personalizationAllowed) {
      localStorage.setItem("theme", theme);
    }
  }, [theme, personalizationAllowed]);

  // Listen to system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        document.documentElement.removeAttribute("data-theme");
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};
