import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DATA_DIR = resolve(__dirname, "../data");

function loadJSON(filename: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(DATA_DIR, filename), "utf-8"));
}

function getKeys(obj: unknown, prefix = ""): string[] {
  if (Array.isArray(obj)) {
    return obj.flatMap((item, i) => getKeys(item, `${prefix}[${i}]`));
  }
  if (typeof obj === "object" && obj !== null) {
    return Object.entries(obj as Record<string, unknown>).flatMap(
      ([key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        return getKeys(value, fullKey);
      },
    );
  }
  return [prefix];
}

describe("Feature config files", () => {
  const prod = loadJSON("feature-config.json");
  const dev = loadJSON("feature-config-development.json");

  it("have the same top-level keys", () => {
    expect(Object.keys(dev).sort()).toEqual(Object.keys(prod).sort());
  });

  it("have matching keys including nested", () => {
    expect(getKeys(dev).sort()).toEqual(getKeys(prod).sort());
  });
});
