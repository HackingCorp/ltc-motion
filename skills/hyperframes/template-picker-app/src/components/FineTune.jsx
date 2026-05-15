import { useEffect, useMemo } from "react";
import OptionsPanel from "./OptionsPanel";
import TemplateIframe from "./TemplateIframe";
import { useTemplateOverride } from "../hooks/useTemplateOverride";
import { theme } from "../styles";

export default function FineTune({
  template,
  config,
  selectedPalette,
  selectedType,
  selectedTheme,
  selectedCorners,
  selectedDensity,
  selectedDepth,
  selectedEasing,
  selectedBackground,
  onPaletteChange,
  onTypeChange,
  onThemeChange,
  onCornersChange,
  onDensityChange,
  onDepthChange,
  onEasingChange,
  onBackgroundChange,
  onBack,
  setupIframe,
}) {
  const { registerIframe, unregisterIframe, applyOverrides } = useTemplateOverride();

  const palette = config.palettes[selectedPalette];
  const typePair = config.typePairs[selectedType];
  const themes = [{ bg: "#111", fg: "#eee" }, { bg: "#f5f5f5", fg: "#1a1a1a" }, null];
  const themeColors = themes[selectedTheme];

  const overrideOpts = useMemo(() => {
    const pBg = palette.background || palette.bg;
    const pFg = palette.foreground || palette.fg;
    const bg = themeColors ? themeColors.bg : pBg;
    const fg = themeColors ? themeColors.fg : pFg;
    return {
      bg,
      fg,
      ac: palette.accent || palette.ac,
      mt: palette.muted || palette.mt,
      hFont: typePair.headline.family,
      bFont: typePair.body.family,
    };
  }, [palette, typePair, themeColors]);

  useEffect(() => {
    if (template) {
      const timer = setTimeout(() => applyOverrides(template.slug, overrideOpts), 200);
      return () => clearTimeout(timer);
    }
  }, [template, overrideOpts, applyOverrides]);

  const slideCount = template?.slideCount || 10;
  const specimenSlides = Array.from({ length: Math.min(slideCount - 1, 6) }, (_, i) => i + 1);

  const _tone = useMemo(() => {
    if (!template) return "bold";
    if (template.scheme === "dark") return "dark";
    if (template.density === "low") return "warm";
    if (template.density === "high") return "technical";
    if (template.tagline?.match(/playful|cheerful|friendly|fun/i)) return "playful";
    if (template.tagline?.match(/editorial|serif|literary|magazine/i)) return "editorial";
    return "bold";
  }, [template]);

  if (!template) return null;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 49px)", animation: "fadeIn 0.5s ease" }}>
      <OptionsPanel
        palettes={config.palettes}
        typePairs={config.typePairs}
        selectedPalette={selectedPalette}
        selectedType={selectedType}
        selectedTheme={selectedTheme}
        selectedCorners={selectedCorners}
        onPaletteChange={onPaletteChange}
        onTypeChange={onTypeChange}
        onThemeChange={onThemeChange}
        onCornersChange={onCornersChange}
        selectedDensity={selectedDensity}
        onDensityChange={onDensityChange}
        selectedDepth={selectedDepth}
        onDepthChange={onDepthChange}
        selectedEasing={selectedEasing}
        onEasingChange={onEasingChange}
        selectedBackground={selectedBackground}
        onBackgroundChange={onBackgroundChange}
        onBack={onBack}
        templateName={template.name}
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
        <div style={{ marginBottom: "8px" }}>
          <div
            style={{
              fontSize: "10px",
              color: theme.textDim,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            / Preview
          </div>
        </div>

        <TemplateIframe
          slug={template.slug}
          slideIndex={0}
          setupIframe={setupIframe}
          registerOverride={registerIframe}
          unregisterOverride={unregisterIframe}
          style={{ width: "100%", aspectRatio: "16/9" }}
        />

        {specimenSlides.length > 0 && (
          <>
            <div style={{ marginTop: "24px", marginBottom: "8px" }}>
              <div
                style={{
                  fontSize: "10px",
                  color: theme.textDim,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                / Slides
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "8px",
              }}
            >
              {specimenSlides.map((si) => (
                <TemplateIframe
                  key={`${template.slug}-${si}`}
                  slug={template.slug}
                  slideIndex={si}
                  setupIframe={setupIframe}
                  registerOverride={registerIframe}
                  unregisterOverride={unregisterIframe}
                  style={{ width: "100%", aspectRatio: "16/9" }}
                />
              ))}
            </div>
          </>
        )}

        <div style={{ marginTop: "24px", display: "flex", gap: "8px" }}>
          {[overrideOpts.bg, overrideOpts.fg, overrideOpts.ac, overrideOpts.mt].map((c, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: "40px",
                background: c,
                borderRadius: theme.radius,
                border: `1px solid ${theme.border}`,
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
          {["Canvas", "Text", "Accent", "Muted"].map((label) => (
            <div
              key={label}
              style={{ flex: 1, fontSize: "9px", color: theme.textDim, textAlign: "center" }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
