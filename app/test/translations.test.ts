import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const LOCALES_DIR = resolve(__dirname, "../locales");
const LOCALES = ["en", "es"];

function getFiles(locale: string): string[] {
  return readdirSync(resolve(LOCALES_DIR, locale)).filter((f) =>
    f.endsWith(".json"),
  );
}

function getKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    return typeof value === "object" && value !== null
      ? getKeys(value as Record<string, unknown>, fullKey)
      : [fullKey];
  });
}

function loadJSON(locale: string, file: string): Record<string, unknown> {
  const content = readFileSync(resolve(LOCALES_DIR, locale, file), "utf-8");
  return JSON.parse(content);
}

describe("Translation files", () => {
  it("all locales have the same set of files", () => {
    const [base, ...rest] = LOCALES;
    const baseFiles = getFiles(base).sort();

    for (const locale of rest) {
      expect(getFiles(locale).sort()).toEqual(baseFiles);
    }
  });

  const baseFiles = getFiles(LOCALES[0]);

  for (const file of baseFiles) {
    describe(`${file}`, () => {
      it("all locales have matching keys", () => {
        const keysByLocale = LOCALES.map((locale) => ({
          locale,
          keys: getKeys(loadJSON(locale, file)).sort(),
        }));

        const [base, ...rest] = keysByLocale;

        for (const { locale, keys } of rest) {
          expect(
            keys,
            `Keys in ${locale}/${file} do not match ${LOCALES[0]}/${file}`,
          ).toEqual(base.keys);
        }
      });
    });
  }
});
