/**
 * Minimal Studio i18n — no dependencies, no provider.
 *
 * The locale is resolved once at module load:
 *   1. `?lang=fr` URL parameter (also persisted for later sessions)
 *   2. `localStorage["hyperframes-studio-lang"]`
 *   3. `navigator.language`
 *   4. `"en"`
 *
 * Components call `t("header.preview")` directly. Keys are typed against the
 * English dictionary, and unknown locales or untranslated keys fall back to
 * English, so adding a locale can never break the UI. Live switching is a
 * page reload away by design — it keeps this file trivial and the call sites
 * free of context plumbing.
 */

import { LOCALES, en, type I18nKey } from "./locales.js";

const STORAGE_KEY = "hyperframes-studio-lang";

function normalize(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const base = raw.toLowerCase().split(/[-_]/)[0] ?? "";
  return base in LOCALES ? base : null;
}

function detectLocale(): string {
  if (typeof window === "undefined") return "en";

  try {
    const fromUrl = normalize(new URLSearchParams(window.location.search).get("lang"));
    if (fromUrl) {
      window.localStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl;
    }
    const fromStorage = normalize(window.localStorage.getItem(STORAGE_KEY));
    if (fromStorage) return fromStorage;
  } catch {
    // Storage can be unavailable (sandboxed iframes); fall through.
  }

  return normalize(navigator.language) ?? "en";
}

export const locale: string = detectLocale();

const dictionary: Record<I18nKey, string> = LOCALES[locale] ?? en;

/** Translate a Studio UI string. Falls back to English for safety. */
export function t(key: I18nKey): string {
  return dictionary[key] ?? en[key];
}

export type { I18nKey };
