// app/hooks/useIsToday.ts
import { useState } from "react";

// True from the moment `date`T`time` arrives onward (used to flip the
// countdown/celebration state once the ceremony moment is reached).
export function isPast(date: string, time: string) {
  return Date.now() >= new Date(`${date}T${time}:00`).getTime();
}

// True starting the calendar day *after* `date` — the wedding day itself
// (ceremony through afterparty) still counts as "today", not "past".
export function isWeddingOver(date: string) {
  const dayAfterWedding = new Date(`${date}T00:00:00`);
  dayAfterWedding.setDate(dayAfterWedding.getDate() + 1);
  return Date.now() >= dayAfterWedding.getTime();
}

export function useIsToday(date: string, time: string) {
  return useState(() => isPast(date, time));
}

export function useIsWeddingOver(date: string) {
  return useState(() => isWeddingOver(date));
}
