// app/components/Countdown.tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface CountdownProps {
  date: string;
  time: string;
  size?: "sm" | "lg";
  showLabel?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function Countdown({ date, time, size = "lg", showLabel=true }: CountdownProps) {
  const { t } = useTranslation(["common"]);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [prevTime, setPrevTime] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

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

      setPrevTime((prev) => prev);
      setTimeLeft((prev) => {
        setPrevTime(prev);
        return newTime;
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [date, time]);

  const renderItem = (label: string, value: number, prevValue: number) => {
    let tLongLabel = t(label);
    let tShortLabel = t(label);
    if(label === "days"){
      tLongLabel = t("days.long");
      tShortLabel = t("days.short");
    }else if(label === "hours"){
      tLongLabel = t("hours.long");
      tShortLabel = t("hours.short");
    }else if(label === "minutes"){
      tLongLabel = t("minutes.long");
      tShortLabel = t("minutes.short");
    }else if(label === "seconds"){
      tLongLabel = t("seconds.long");
      tShortLabel = t("seconds.short");
    }
    
    return (
      <div className={`countdown-item countdown-item--${size}`} title={size=="sm" ? tLongLabel : ""}>
        <div
          className={`countdown-number countdown-number--${size}${value !== prevValue ? " flip" : ""}`}
        >
          {value.toString().padStart(2, "0")}
        </div>
        {showLabel && <div className={`countdown-label countdown-label--${size}`}>
          {size === "sm" ? tShortLabel : tLongLabel}
        </div>}
      </div>
    );};

  return (
    <div className={`countdown-card countdown-card--${size}`}>
      <div className={`countdown-grid countdown-grid--${size}`}>
        {renderItem("days", timeLeft.days, prevTime.days)}
        {renderItem("hours", timeLeft.hours, prevTime.hours)}
        {renderItem("minutes", timeLeft.minutes, prevTime.minutes)}
        {renderItem("seconds", timeLeft.seconds, prevTime.seconds)}
      </div>
    </div>
  );
}
