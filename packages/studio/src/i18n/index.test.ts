import { describe, expect, it } from "vitest";
import { en, fr, LOCALES, type I18nKey } from "./locales.js";
import { t, locale } from "./index.js";

describe("locales", () => {
  it("french covers every english key", () => {
    for (const key of Object.keys(en) as I18nKey[]) {
      expect(fr[key], `missing fr translation for ${key}`).toBeTruthy();
    }
  });

  it("registers en and fr", () => {
    expect(Object.keys(LOCALES).sort()).toEqual(["en", "fr"]);
  });

  it("keys use a section.name shape", () => {
    for (const key of Object.keys(en)) {
      expect(key).toMatch(/^[a-z]+\.[a-zA-Z]+$/);
    }
  });
});

describe("t", () => {
  it("resolves a known key in the active locale", () => {
    const active = LOCALES[locale] ?? en;
    expect(t("header.preview")).toBe(active["header.preview"]);
  });

  it("always returns a non-empty string", () => {
    for (const key of Object.keys(en) as I18nKey[]) {
      expect(t(key).length).toBeGreaterThan(0);
    }
  });
});
