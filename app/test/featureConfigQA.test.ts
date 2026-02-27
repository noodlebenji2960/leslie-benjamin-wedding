import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DATA_DIR = resolve(__dirname, "../data");
const LOCALES_DIR = resolve(__dirname, "../locales");

function loadJSON(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function getConfigQuestionIds(config: Record<string, unknown>): string[] {
  const qa = config.qa as {
    questions: [string, boolean][];
  };
  return qa.questions.map(([id]) => id).sort();
}

function getLocaleQuestionIds(locale: string): string[] {
  const qa = loadJSON(resolve(LOCALES_DIR, locale, "qa.json")) as {
    items: { id: string }[];
  };
  return qa.items.map((item) => item.id).sort();
}

const configs = {
  "feature-config.json": loadJSON(resolve(DATA_DIR, "feature-config.json")),
  "feature-config-development.json": loadJSON(
    resolve(DATA_DIR, "feature-config-development.json")
  ),
};

const locales = {
  en: getLocaleQuestionIds("en"),
  es: getLocaleQuestionIds("es"),
};

describe("Feature config QA questions vs locale files", () => {
  for (const [configName, config] of Object.entries(configs)) {
    const configIds = getConfigQuestionIds(config);

    describe(configName, () => {
      for (const [locale, localeIds] of Object.entries(locales)) {
        describe(`vs ${locale}/qa.json`, () => {
          it("no IDs missing from locale file", () => {
            const missingFromLocale = configIds.filter(
              (id) => !localeIds.includes(id)
            );
            expect(
              missingFromLocale,
              `These IDs are in ${configName} but missing from ${locale}/qa.json: ${missingFromLocale.join(", ")}`
            ).toEqual([]);
          });

          it("no IDs missing from config file", () => {
            const missingFromConfig = localeIds.filter(
              (id) => !configIds.includes(id)
            );
            expect(
              missingFromConfig,
              `These IDs are in ${locale}/qa.json but missing from ${configName}: ${missingFromConfig.join(", ")}`
            ).toEqual([]);
          });
        });
      }
    });
  }
});