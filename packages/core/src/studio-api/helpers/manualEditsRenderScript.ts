/**
 * Returns a self-contained IIFE string that re-applies studio position edits
 * (translate, rotate) after every GSAP seek by querying data attributes baked
 * into the HTML. Works without a JSON manifest — positions are already inlined
 * as CSS custom properties on the elements.
 */
export function createStudioPositionSeekReapplyScript(): string {
  return `(${studioPositionSeekReapplyRuntime.toString()})();`;
}

function studioPositionSeekReapplyRuntime(): void {
  const OFFSET_X_PROP = "--hf-studio-offset-x";
  const OFFSET_Y_PROP = "--hf-studio-offset-y";
  const ROTATION_PROP = "--hf-studio-rotation";
  const PATH_OFFSET_ATTR = "data-hf-studio-path-offset";
  const ROTATION_ATTR = "data-hf-studio-rotation";
  const ORIGINAL_TRANSLATE_ATTR = "data-hf-studio-original-translate";
  const ORIGINAL_ROTATE_ATTR = "data-hf-studio-original-rotate";
  const WRAPPED_PROP = "__hfStudioPositionSeekReapplyWrapped";

  if (
    !document.querySelector("[" + PATH_OFFSET_ATTR + '="true"]') &&
    !document.querySelector("[" + ROTATION_ATTR + '="true"]')
  )
    return;

  const splitTopLevelWhitespace = (value: string): string[] => {
    const parts: string[] = [];
    let depth = 0;
    let current = "";
    for (const char of value.trim()) {
      if (char === "(") depth += 1;
      if (char === ")") depth = Math.max(0, depth - 1);
      if (/\s/.test(char) && depth === 0) {
        if (current) parts.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    if (current) parts.push(current);
    return parts;
  };

  const composeTranslate = (element: HTMLElement, x: string, y: string): string => {
    const original = element.getAttribute(ORIGINAL_TRANSLATE_ATTR)?.trim();
    if (!original || original === "none") return x + " " + y;
    const parts = splitTopLevelWhitespace(original);
    if (parts.length === 1) return "calc(" + parts[0] + " + " + x + ") " + y;
    if (parts.length >= 2) {
      const z = parts.length >= 3 ? " " + parts[2] : "";
      return "calc(" + parts[0] + " + " + x + ") calc(" + parts[1] + " + " + y + ")" + z;
    }
    return x + " " + y;
  };

  const isSimpleRotateAngle = (value: string): boolean =>
    /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:deg|rad|turn|grad)$/.test(value.trim());

  const composeRotation = (element: HTMLElement, rotationValue: string): string => {
    const original = element.getAttribute(ORIGINAL_ROTATE_ATTR)?.trim();
    if (!original || original === "none" || !isSimpleRotateAngle(original)) return rotationValue;
    return "calc(" + original + " + " + rotationValue + ")";
  };

  const reapplyAll = (): void => {
    const offsetEls = document.querySelectorAll("[" + PATH_OFFSET_ATTR + '="true"]');
    for (let i = 0; i < offsetEls.length; i++) {
      const el = offsetEls[i] as HTMLElement;
      if (!(el instanceof HTMLElement)) continue;
      const x = el.style.getPropertyValue(OFFSET_X_PROP);
      const y = el.style.getPropertyValue(OFFSET_Y_PROP);
      if (x || y) {
        el.style.setProperty(
          "translate",
          composeTranslate(
            el,
            "var(" + OFFSET_X_PROP + ", 0px)",
            "var(" + OFFSET_Y_PROP + ", 0px)",
          ),
        );
      }
    }
    const rotEls = document.querySelectorAll("[" + ROTATION_ATTR + '="true"]');
    for (let i = 0; i < rotEls.length; i++) {
      const el = rotEls[i] as HTMLElement;
      if (!(el instanceof HTMLElement)) continue;
      const rot = el.style.getPropertyValue(ROTATION_PROP);
      if (rot) {
        el.style.setProperty("rotate", composeRotation(el, "var(" + ROTATION_PROP + ", 0deg)"));
      }
    }
  };

  const runtimeWindow = window as Window & {
    __hf?: Record<string, unknown>;
    __player?: Record<string, unknown>;
  };

  const isWrapped = (fn: (time: number) => unknown): boolean =>
    Boolean((fn as unknown as Record<string, unknown>)[WRAPPED_PROP]);

  const markWrapped = (fn: (time: number) => unknown): void => {
    try {
      Object.defineProperty(fn, WRAPPED_PROP, {
        configurable: false,
        enumerable: false,
        value: true,
      });
    } catch {
      try {
        (fn as unknown as Record<string, unknown>)[WRAPPED_PROP] = true;
      } catch {
        /* ignore */
      }
    }
  };

  const wrapFn = (get: () => unknown, set: (fn: (time: number) => unknown) => void): boolean => {
    const fn = get();
    if (typeof fn !== "function") return false;
    const seek = fn as (time: number) => unknown;
    if (isWrapped(seek)) {
      reapplyAll();
      return true;
    }
    const wrapped = function (this: unknown, time: number): unknown {
      const result = seek.call(this, time);
      reapplyAll();
      return result;
    };
    markWrapped(wrapped);
    set(wrapped);
    reapplyAll();
    return true;
  };

  const wrapSeekFunctions = (): boolean => {
    const a = wrapFn(
      () => runtimeWindow.__hf?.["seek"],
      (fn) => {
        if (runtimeWindow.__hf) runtimeWindow.__hf["seek"] = fn;
      },
    );
    const b = wrapFn(
      () => runtimeWindow.__player?.["renderSeek"],
      (fn) => {
        if (runtimeWindow.__player) runtimeWindow.__player["renderSeek"] = fn;
      },
    );
    return a || b;
  };

  const installSeekTrap = (
    obj: Record<string, unknown> | undefined,
    key: string,
    getter: () => unknown,
    setter: (fn: (time: number) => unknown) => void,
  ): void => {
    if (!obj) return;
    try {
      let current = obj[key];
      Object.defineProperty(obj, key, {
        configurable: true,
        enumerable: true,
        get() {
          return current;
        },
        set(value: unknown) {
          current = value;
          if (typeof value === "function" && !isWrapped(value as (time: number) => unknown)) {
            wrapFn(getter, setter);
          }
        },
      });
    } catch {
      /* non-configurable — fall back to polling */
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => reapplyAll(), { once: true });
  } else {
    reapplyAll();
  }

  wrapSeekFunctions();
  installSeekTrap(
    runtimeWindow.__hf,
    "seek",
    () => runtimeWindow.__hf?.["seek"],
    (fn) => {
      if (runtimeWindow.__hf) runtimeWindow.__hf["seek"] = fn;
    },
  );
  installSeekTrap(
    runtimeWindow.__player as Record<string, unknown> | undefined,
    "renderSeek",
    () => runtimeWindow.__player?.["renderSeek"],
    (fn) => {
      if (runtimeWindow.__player) runtimeWindow.__player["renderSeek"] = fn;
    },
  );
  let remaining = 120;
  const interval = setInterval(() => {
    wrapSeekFunctions();
    remaining -= 1;
    if (remaining <= 0) clearInterval(interval);
  }, 50);
}
