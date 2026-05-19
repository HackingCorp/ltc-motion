/**
 * Detect whether we're running from source (monorepo dev) or from the built bundle.
 * In dev: files are .ts (running via tsx). In production: bundled into .js by tsup.
 */
export function isDevMode(): boolean {
  try {
    const url = new URL(import.meta.url);
    return url.pathname.endsWith(".ts");
  } catch {
    // Fail-safe: if URL parsing fails for any reason, assume production.
    // This ensures telemetry is never accidentally disabled in production builds.
    return false;
  }
}

/**
 * Feature flag — design picker (`hyperframes pick`, skill picker assets).
 * Enabled when HYPERFRAMES_DESIGN_PICKER is set to "1" / "true" / "on" (case-insensitive),
 * or whenever running in dev mode so contributors can iterate without setting env vars.
 */
export function isDesignPickerEnabled(): boolean {
  if (isDevMode()) return true;
  var v = (process.env.HYPERFRAMES_DESIGN_PICKER || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}
