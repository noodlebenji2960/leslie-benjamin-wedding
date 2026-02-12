// app/components/Countdown.tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/styles/components/Countdown.scss";

interface CountdownProps {
  date: string;
  time: string;
  size?: "sm" | "lg";
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function Countdown({ date, time, size = "lg" }: CountdownProps) {
  const { t } = useTranslation(["common"]);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [prevTime, setPrevTime] = useState<TimeLeft>(timeLeft);

  useEffect(() => {
    const weddingDate = new Date(`${date}T${time}:00`);

    const updateCountdown = () => {
      const now = Date.now();
      const distance = weddingDate.getTime() - now;

      const newTime: TimeLeft = {
        days: Math.max(Math.floor(distance / (1000 * 60 * 60 * 24)), 0),
        hours: Math.max(Math.floor((distance / (1000 * 60 * 60)) % 24), 0),
        minutes: Math.max(Math.floor((distance / (1000 * 60)) % 60), 0),
        seconds: Math.max(Math.floor((distance / 1000) % 60), 0),
      };

      setPrevTime(timeLeft);
      setTimeLeft(newTime);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [date, time]);

  const renderItem = (label: string, value: number, prevValue: number) => (
    <div className="countdown-item">
      <div className={`countdown-number ${value !== prevValue ? "flip" : ""}`}>
        {value.toString().padStart(2, "0")}
      </div>
      <div className="countdown-label">{t(label)}</div>
    </div>
  );

  return (
    <div className={`countdown-card countdown-${size}`}>
      <div className="countdown-grid">
        {renderItem("days", timeLeft.days, prevTime.days)}
        {renderItem("hours", timeLeft.hours, prevTime.hours)}
        {renderItem("minutes", timeLeft.minutes, prevTime.minutes)}
        {renderItem("seconds", timeLeft.seconds, prevTime.seconds)}
      </div>
    </div>
  );
}
