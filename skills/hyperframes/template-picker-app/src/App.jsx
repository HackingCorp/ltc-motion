import { useState, useEffect, useMemo, useCallback } from "react";
import TemplateCard from "./components/TemplateCard";
import PaletteBar from "./components/PaletteBar";
import FineTune from "./components/FineTune";
import { useIframeSetup } from "./hooks/useIframeSetup";
import { theme } from "./styles";

export default function App() {
  const [config, setConfig] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [phase, setPhase] = useState("template");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [activePalette, setActivePalette] = useState(0);
  const [selectedPalette, setSelectedPalette] = useState(0);
  const [selectedType, setSelectedType] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [selectedCorners, setSelectedCorners] = useState(1);
  const [selectedDensity, setSelectedDensity] = useState(1);
  const [selectedDepth, setSelectedDepth] = useState(0);
  const [selectedEasing, setSelectedEasing] = useState(1);
  const [selectedBackground, setSelectedBackground] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    fetch("/data.json")
      .then((r) => r.json())
      .then((data) => {
        setConfig(data);
        setTemplates(data.templates || []);
      })
      .catch(() => console.error("Failed to load /data.json"));
  }, []);

  const tone = useMemo(() => {
    if (!selectedTemplate) return "bold";
    if (selectedTemplate.scheme === "dark") return "dark";
    if (selectedTemplate.density === "low") return "warm";
    if (selectedTemplate.density === "high") return "technical";
    if (selectedTemplate.tagline?.match(/playful|cheerful|friendly|fun/i)) return "playful";
    if (selectedTemplate.tagline?.match(/editorial|serif|literary|magazine/i)) return "editorial";
    return "bold";
  }, [selectedTemplate]);

  const { setupIframe } = useIframeSetup(config?.promptText, tone);

  const handleSelect = useCallback((template) => {
    console.log("Selected:", template.slug);
    setTransitioning(true);
    setSelectedTemplate(template);
    setTimeout(() => {
      console.log("Switching to finetune");
      setPhase("finetune");
      setTransitioning(false);
    }, 600);
  }, []);

  const handleBack = useCallback(() => {
    setPhase("template");
    setSelectedTemplate(null);
  }, []);

  if (!config) {
    return (
      <div
        style={{
          background: theme.bg,
          color: theme.textMuted,
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: theme.font,
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div
      style={{
        background: theme.bg,
        color: theme.text,
        minHeight: "100vh",
        fontFamily: theme.font,
        fontSize: "13px",
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          borderBottom: `1px solid ${theme.border}`,
          padding: "0 20px",
          background: "#111",
          position: "sticky",
          top: 0,
          zIndex: 200,
        }}
      >
        <div
          onClick={() => phase === "finetune" && handleBack()}
          style={{
            padding: "12px 16px",
            fontSize: "12px",
            fontWeight: 600,
            color: phase === "template" ? theme.text : theme.textDim,
            cursor: "pointer",
            borderBottom:
              phase === "template" ? `2px solid ${theme.text}` : "2px solid transparent",
          }}
        >
          {phase === "finetune" ? "← Template" : "1. Template"}
        </div>
        <div
          style={{
            padding: "12px 16px",
            fontSize: "12px",
            fontWeight: 600,
            color: phase === "finetune" ? theme.text : theme.textDim,
            borderBottom:
              phase === "finetune" ? `2px solid ${theme.text}` : "2px solid transparent",
          }}
        >
          2. Fine-tune
        </div>
      </div>

      {/* Phase 1: Template picker */}
      {phase === "template" && (
        <>
          <div
            style={{
              padding: "16px 32px",
              borderBottom: `1px solid ${theme.border}`,
              background: "#111",
            }}
          >
            <h1 style={{ fontSize: "15px", fontWeight: 600, margin: 0 }}>Template Picker</h1>
            <div style={{ fontSize: "11px", color: theme.textDim }}>
              {config.promptDesc} · {templates.length} templates
            </div>
          </div>

          <PaletteBar
            palettes={config.palettes}
            activePalette={activePalette}
            onSelect={setActivePalette}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))",
              gap: "20px",
              padding: "24px 32px",
            }}
          >
            {templates.map((t) => (
              <TemplateCard
                key={t.slug}
                template={t}
                onSelect={handleSelect}
                setupIframe={setupIframe}
              />
            ))}
          </div>

          {/* Transition overlay */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: theme.bg,
              opacity: transitioning ? 1 : 0,
              pointerEvents: transitioning ? "all" : "none",
              transition: "opacity 0.5s ease",
              zIndex: 300,
            }}
          />
        </>
      )}

      {/* Phase 2: Fine-tune */}
      {phase === "finetune" && selectedTemplate && (
        <FineTune
          template={selectedTemplate}
          config={config}
          selectedPalette={selectedPalette}
          selectedType={selectedType}
          selectedTheme={selectedTheme}
          selectedCorners={selectedCorners}
          onPaletteChange={setSelectedPalette}
          onTypeChange={setSelectedType}
          onThemeChange={setSelectedTheme}
          onCornersChange={setSelectedCorners}
          selectedDensity={selectedDensity}
          onDensityChange={setSelectedDensity}
          selectedDepth={selectedDepth}
          onDepthChange={setSelectedDepth}
          selectedEasing={selectedEasing}
          onEasingChange={setSelectedEasing}
          selectedBackground={selectedBackground}
          onBackgroundChange={setSelectedBackground}
          onBack={handleBack}
          setupIframe={setupIframe}
        />
      )}
    </div>
  );
}
