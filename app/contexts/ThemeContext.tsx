// contexts/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

type ThemeValue = "light" | "dark" | "system";

type ThemeContextType = {
  theme: ThemeValue;
  setTheme: React.Dispatch<React.SetStateAction<ThemeValue>>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeValue>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as ThemeValue) || "system";
    }
    return "system";
  });

  useEffect(() => {
    localStorage.setItem("theme", theme);

    if (theme === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  // Listen to system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        // light-dark() handles this automatically
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
