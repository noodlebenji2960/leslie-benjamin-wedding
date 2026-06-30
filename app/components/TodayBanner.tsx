// app/components/TodayBanner.tsx
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import confetti from "canvas-confetti";

interface TodayBannerProps {
  show: boolean;
}

const fireConfetti = () => {
  confetti({
    particleCount: 150,
    spread: 90,
    origin: { y: 0.6 },
  });
};

export function TodayBanner({ show }: TodayBannerProps) {
  const { t } = useTranslation(["schedule"]);

  useEffect(() => {
    if (show) fireConfetti();
  }, [show]);

  if (!show) return null;

  return (
    <div className="today-banner-wrap">
      <p className="today-banner">{t("schedule:today", "Today is")}</p>
    </div>
  );
}
