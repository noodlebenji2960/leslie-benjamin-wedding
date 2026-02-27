import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DATA_DIR = resolve(__dirname, "../data");
const LOCALES_DIR = resolve(__dirname, "../locales");

function loadJSON(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function getWeddingScheduleIds(): string[] {
  const data = loadJSON(resolve(DATA_DIR, "wedding.json")) as {
    schedule: { id: string }[];
  };
  return data.schedule.map((event) => event.id).sort();
}

function getLocaleScheduleIds(locale: string): string[] {
  const schedule = loadJSON(resolve(LOCALES_DIR, locale, "schedule.json")) as {
    events: Record<string, unknown>;
  };
  return Object.keys(schedule.events).sort();
}

const weddingScheduleIds = getWeddingScheduleIds();

const locales = {
  en: getLocaleScheduleIds("en"),
  es: getLocaleScheduleIds("es"),
};

describe("weddingData schedule IDs vs locale schedule files", () => {
  for (const [locale, localeIds] of Object.entries(locales)) {
    describe(`vs ${locale}/schedule.json`, () => {
      it("no IDs missing from locale file", () => {
        const missingFromLocale = weddingScheduleIds.filter(
          (id) => !localeIds.includes(id),
        );
        expect(
          missingFromLocale,
          `These schedule IDs are in weddingData.json but missing from ${locale}/schedule.json: ${missingFromLocale.join(", ")}`,
        ).toEqual([]);
      });

      it("no IDs missing from weddingData", () => {
        const missingFromData = localeIds.filter(
          (id) => !weddingScheduleIds.includes(id),
        );
        expect(
          missingFromData,
          `These schedule IDs are in ${locale}/schedule.json but missing from weddingData.json: ${missingFromData.join(", ")}`,
        ).toEqual([]);
      });
    });
  }
});
