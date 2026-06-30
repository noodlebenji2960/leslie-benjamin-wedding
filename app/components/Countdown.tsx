// app/components/Countdown.tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { isPast, useIsToday, useIsWeddingOver } from "@/hooks/useIsToday";

interface CountdownProps {
  date: string;
  time: string;
  size?: "sm" | "lg";
  showLabel?: boolean;
  onCelebrate?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const ZERO_TIME: TimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };
const ZERO_LINGER_MS = 1000;

const isZero = (t: TimeLeft) =>
  t.days === 0 && t.hours === 0 && t.minutes === 0 && t.seconds === 0;

export function Countdown({ date, time, size = "lg", showLabel=true, labelPosition="bottom", onCelebrate }: CountdownProps) {
  const { t } = useTranslation(["common"]);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(ZERO_TIME);
  const [prevTime, setPrevTime] = useState<TimeLeft>(ZERO_TIME);
  const [celebrating, setCelebrating] = useIsToday(date, time);
  const [isOver] = useIsWeddingOver(date);

  useEffect(() => {
    if (isPast(date, time)) return;

    const weddingDate = new Date(`${date}T${time}:00`);
    let hasCelebrated = false;
    let lingerTimeout: ReturnType<typeof setTimeout>;

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

      if (isZero(newTime) && !hasCelebrated) {
        hasCelebrated = true;
        lingerTimeout = setTimeout(() => setCelebrating(true), ZERO_LINGER_MS);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => {
      clearInterval(interval);
      clearTimeout(lingerTimeout);
    };
  }, [date, time]);

  if (isOver) return null;

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
      <div className={`countdown-item countdown-item--${size} ${labelPosition === "top" ? "countdown-item--top" : ""}`} title={size=="sm" ? tLongLabel : ""}>
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
      <AnimatePresence onExitComplete={() => onCelebrate?.()}>
        {!celebrating && (
          <motion.div
            style={{ overflow: "hidden" }}
            initial={{ height: "auto" }}
            exit={{
              opacity: 0,
              height: 0,
              transition: {
                opacity: { duration: 0.6, ease: "easeOut" },
                height: { duration: 0.4, ease: "easeOut", delay: 0.6 },
              },
            }}
          >
            <div className={`countdown-grid countdown-grid--${size}`}>
              {renderItem("days", timeLeft.days, prevTime.days)}
              {renderItem("hours", timeLeft.hours, prevTime.hours)}
              {renderItem("minutes", timeLeft.minutes, prevTime.minutes)}
              {renderItem("seconds", timeLeft.seconds, prevTime.seconds)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
