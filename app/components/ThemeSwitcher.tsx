// components/ThemeSwitcher.jsx
import { useTheme } from "../contexts/ThemeContext";
import { Icon } from "./Icon";

type ThemeValue = "light" | "dark" | "system";

const THEMES: ThemeValue[] = ["light", "dark"];
const THEME_LABELS: Record<ThemeValue, string> = {
  light: "Light mode",
  dark: "Dark mode",
  system: "System",
};

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const currentIndex = THEMES.indexOf(theme as ThemeValue);

  const cycleTheme = () => {
    const nextIndex = (currentIndex + 1) % THEMES.length;
    const next = THEMES[nextIndex] ?? THEMES[0];
    setTheme(next);
  };

  return (
    <button
      className="theme-toggle-slider"
      onClick={cycleTheme}
      aria-label={`${THEME_LABELS[theme as ThemeValue]}. Click to switch theme.`}
    >
      <div className="toggle-icons">
        <span className={`icon sun ${theme === "light" ? "active" : ""}`}>
          <Icon.Sun  />
        </span>
        <span className={`icon moon ${theme === "dark" ? "active" : ""}`}>
          <Icon.Moon />
        </span>
      </div>
    </button>
  );
}
