// app/components/LanguageSwitcher.tsx
// No changes needed - your React logic is perfect!
import "@/styles/components/LanguageSwitcher.scss";

interface LanguageSwitcherProps {
  currentLocale: string;
  onSwitch: () => void;
  isPending?: boolean;
}

export function LanguageSwitcher({
  currentLocale,
  onSwitch,
  isPending = false,
}: LanguageSwitcherProps) {
  return (
    <button
      className="language-switcher"
      onClick={onSwitch}
      disabled={isPending}
      aria-label={`Switch to ${currentLocale === "es" ? "English" : "Spanish"}`}
    >
      <div className="language-icons">
        <span
          className={`language-label ${currentLocale === "es" ? "active" : ""}`}
        >
          ES
        </span>
        <span
          className={`language-label ${currentLocale === "en" ? "active" : ""}`}
        >
          EN
        </span>
      </div>
    </button>
  );
}
