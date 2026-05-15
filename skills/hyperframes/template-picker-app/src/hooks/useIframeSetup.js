import { useCallback } from "react";

export function useIframeSetup(promptText, tone) {
  const setupIframe = useCallback(
    (iframe, slideIndex = 0) => {
      if (!iframe?.contentDocument) return;
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;

      doc.querySelectorAll("script").forEach((s) => s.remove());

      // Reset animation start states
      doc.querySelectorAll("*").forEach((el) => {
        try {
          if (win.getComputedStyle(el).opacity === "0") el.style.opacity = "1";
        } catch {}
      });

      // Deck-stage fallback
      const ds = doc.querySelector("deck-stage");
      if (ds) {
        const dsStyle = doc.createElement("style");
        dsStyle.textContent =
          "deck-stage{display:block;width:1920px;height:1080px;position:relative;overflow:hidden;}" +
          "deck-stage>section{position:absolute;top:0;left:0;width:100%;height:100%;visibility:hidden;opacity:0;}" +
          "deck-stage>section.active{visibility:visible;opacity:1;}";
        doc.head.appendChild(dsStyle);
        const sections = ds.querySelectorAll("section");
        sections.forEach((s, i) => {
          s.classList.remove("active");
          if (i === slideIndex) {
            s.classList.add("active");
            s.style.visibility = "visible";
            s.style.opacity = "1";
          }
        });
      } else {
        // Stacked or active-class slides
        const slides = doc.querySelectorAll("section.slide, div.slide, .slide, section[class]");
        if (slides.length > 0) {
          const first = slides[0];
          const isAbsolute = win.getComputedStyle(first).position === "absolute";
          if (isAbsolute) {
            slides.forEach((s, i) => {
              if (i === slideIndex) {
                s.classList.add("active");
                s.style.visibility = "visible";
                s.style.opacity = "1";
              } else {
                s.classList.remove("active");
                s.style.visibility = "hidden";
                s.style.opacity = "0";
              }
            });
          } else {
            // Scroll-stacked
            const parent = first.parentElement;
            if (parent) {
              parent.style.height = "1080px";
              parent.style.overflow = "hidden";
              if (slides[slideIndex]) {
                parent.style.transform = `translateY(-${slides[slideIndex].offsetTop}px)`;
              }
            }
            doc.body.style.overflow = "hidden";
            doc.documentElement.style.overflow = "hidden";
          }
        }
      }

      // Inject contextual text
      if (promptText) {
        const t = tone || "bold";
        const display = [promptText.taglines?.[t] || "", promptText.headline || ""];
        const {
          headlines = [],
          body = [],
          stats = [],
          statLabels = [],
          labels = [],
          smalls = [],
        } = promptText;

        function pickByLen(pool, origText) {
          if (!pool.length) return origText;
          const origWords = origText.split(/\s+/).length;
          let best = 0,
            bestDiff = 999;
          pool.forEach((p, j) => {
            const d = Math.abs(p.split(/\s+/).length - origWords);
            if (d < bestDiff) {
              bestDiff = d;
              best = j;
            }
          });
          return pool[best];
        }

        const counters = { di: 0, hi: 0, bi: 0, si: 0, sli: 0, li: 0, smi: 0 };
        const allSlides = doc.querySelectorAll(".slide, deck-stage > section, section[class]");
        const targetSlides = allSlides.length > 0 ? allSlides : [doc.body];

        targetSlides.forEach((slide) => {
          slide.querySelectorAll("*").forEach((el) => {
            for (let c = el.firstChild; c; c = c.nextSibling) {
              if (c.nodeType === 1 && c.textContent.trim().length > 0) return;
            }
            const text = el.textContent.trim();
            if (!text) return;
            try {
              const cs = win.getComputedStyle(el);
              if (cs.display === "none" || cs.visibility === "hidden") return;
              const fs = parseFloat(cs.fontSize);
              if (fs >= 60 && display.length) el.textContent = pickByLen(display, text);
              else if (fs >= 32 && headlines.length) el.textContent = pickByLen(headlines, text);
              else if (fs >= 18 && text.length > 20 && body.length)
                el.textContent = pickByLen(body, text);
              else if (fs >= 18 && smalls.length) el.textContent = pickByLen(smalls, text);
              else if (/^\d/.test(text) && text.length < 10 && stats.length)
                el.textContent = stats[counters.si++ % stats.length];
              else if (fs < 14 && text === text.toUpperCase() && labels.length)
                el.textContent = labels[counters.li++ % labels.length];
              else if (fs < 14 && statLabels.length)
                el.textContent = statLabels[counters.sli++ % statLabels.length];
              else if (text.length > 20 && body.length) el.textContent = pickByLen(body, text);
              else if (smalls.length) el.textContent = pickByLen(smalls, text);
            } catch {}
          });
        });
      }
    },
    [promptText, tone],
  );

  return { setupIframe };
}
