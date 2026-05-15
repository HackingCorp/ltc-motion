import { useRef, useCallback } from "react";

const origCache = {};

function hexToLum(hex) {
  if (!hex || hex[0] !== "#") return 50;
  if (hex.length === 4) hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return ((r * 0.299 + g * 0.587 + b * 0.114) / 255) * 100;
}

function captureOriginals(iframe, slug) {
  if (origCache[slug]) return origCache[slug];
  const doc = iframe.contentDocument;
  if (!doc) return {};

  const override = doc.getElementById("finetune-override");
  const saved = override ? override.textContent : "";
  if (override) override.textContent = "";

  const vars = {};
  doc.querySelectorAll("style").forEach((st) => {
    if (st.id === "finetune-override") return;
    const matches = st.textContent.match(/--[\w-]+\s*:/g);
    if (!matches) return;
    matches.forEach((m) => {
      const name = m.replace(/\s*:$/, "");
      if (!vars[name]) {
        vars[name] = iframe.contentWindow
          .getComputedStyle(doc.documentElement)
          .getPropertyValue(name)
          .trim();
      }
    });
  });

  if (override) override.textContent = saved;
  if (Object.keys(vars).length > 0) origCache[slug] = vars;
  return vars;
}

export function useTemplateOverride() {
  const iframeRefs = useRef(new Set());

  const registerIframe = useCallback((iframe) => {
    if (iframe) iframeRefs.current.add(iframe);
  }, []);

  const unregisterIframe = useCallback((iframe) => {
    iframeRefs.current.delete(iframe);
  }, []);

  const applyOverrides = useCallback((slug, { bg, fg, ac, mt, hFont, bFont }) => {
    iframeRefs.current.forEach((iframe) => {
      if (!iframe.contentDocument) return;
      const doc = iframe.contentDocument;
      const origVars = captureOriginals(iframe, slug);
      if (Object.keys(origVars).length === 0) return;

      let style = doc.getElementById("finetune-override");
      if (!style) {
        style = doc.createElement("style");
        style.id = "finetune-override";
        doc.head.appendChild(style);
      }

      let css = ":root {\n";
      Object.entries(origVars).forEach(([v, orig]) => {
        if (!orig) return;
        const hexMatch = orig.match(/#[0-9a-fA-F]{3,8}/);
        if (hexMatch) {
          const lum = hexToLum(hexMatch[0]);
          let target;
          if (lum > 85) target = bg;
          else if (lum < 20) target = fg;
          else if (lum > 60) target = mt;
          else target = ac;
          css += `  ${v}: ${target} !important;\n`;
        } else if (v.match(/^--f-|^--font/i) && !orig.includes("#")) {
          if (v.match(/display|heading|headline/i))
            css += `  ${v}: "${hFont}", sans-serif !important;\n`;
          else if (v.match(/body|text/i)) css += `  ${v}: "${bFont}", sans-serif !important;\n`;
        }
      });
      css += "}\n";
      css += `body, html { background: ${bg} !important; color: ${fg} !important; }\n`;
      style.textContent = css;
    });
  }, []);

  const clearOverrides = useCallback(() => {
    iframeRefs.current.forEach((iframe) => {
      if (!iframe.contentDocument) return;
      const style = iframe.contentDocument.getElementById("finetune-override");
      if (style) style.textContent = "";
    });
  }, []);

  return { registerIframe, unregisterIframe, applyOverrides, clearOverrides };
}
