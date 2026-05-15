import { theme } from "../styles";

function ChipGroup({ label, options, selected, onSelect }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div
        style={{
          fontSize: "10px",
          color: theme.textDim,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: "8px",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {options.map((opt, i) => (
          <div
            key={i}
            onClick={() => onSelect(i)}
            style={{
              padding: "6px 12px",
              border: `1px solid ${i === selected ? theme.borderActive : theme.border}`,
              borderRadius: theme.radius,
              fontSize: "11px",
              color: i === selected ? theme.text : theme.textMuted,
              cursor: "pointer",
              background: i === selected ? "rgba(74, 222, 128, 0.08)" : "transparent",
              transition: "all 0.15s",
            }}
          >
            {typeof opt === "string" ? opt : opt.name || opt.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function PaletteOption({ palette, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "8px 12px",
        border: `1px solid ${selected ? theme.borderActive : theme.border}`,
        borderRadius: theme.radius,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: selected ? "rgba(74, 222, 128, 0.08)" : "transparent",
        transition: "all 0.15s",
      }}
    >
      <div style={{ display: "flex", gap: "2px" }}>
        {[
          palette.background || palette.bg,
          palette.foreground || palette.fg,
          palette.accent || palette.ac,
          palette.muted || palette.mt,
        ].map((c, i) => (
          <div
            key={i}
            style={{
              width: "14px",
              height: "14px",
              background: c,
              border: `1px solid ${theme.border}`,
              borderRadius: "2px",
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: "11px", color: selected ? theme.text : theme.textMuted }}>
        {palette.name}
      </span>
    </div>
  );
}

function TypeOption({ pair, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px 12px",
        border: `1px solid ${selected ? theme.borderActive : theme.border}`,
        borderRadius: theme.radius,
        cursor: "pointer",
        background: selected ? "rgba(74, 222, 128, 0.08)" : "transparent",
        transition: "all 0.15s",
      }}
    >
      <div
        style={{
          fontFamily: `"${pair.headline.family}", sans-serif`,
          fontWeight: pair.headline.weight,
          fontSize: "18px",
          color: theme.text,
          marginBottom: "4px",
        }}
      >
        {pair.preview || "Aa Bb"}
      </div>
      <div
        style={{
          fontFamily: `"${pair.body.family}", monospace`,
          fontWeight: pair.body.weight,
          fontSize: "11px",
          color: theme.textMuted,
        }}
      >
        {pair.body_preview || "Body text sample"}
      </div>
      <div style={{ fontSize: "9px", color: theme.textDim, marginTop: "4px" }}>{pair.name}</div>
    </div>
  );
}

export default function OptionsPanel({
  palettes,
  typePairs,
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
  templateName,
}) {
  const themes = ["Dark", "Light", "Palette"];
  const corners = ["0px", "4px", "8px", "16px"];

  return (
    <div
      style={{
        width: "320px",
        background: "#111",
        borderRight: `1px solid ${theme.border}`,
        padding: "20px",
        overflowY: "auto",
        flexShrink: 0,
      }}
    >
      <div
        onClick={onBack}
        style={{
          fontSize: "12px",
          color: theme.accent,
          cursor: "pointer",
          marginBottom: "16px",
        }}
      >
        ← Template
      </div>
      <div style={{ fontSize: "18px", fontWeight: 700, color: theme.text, marginBottom: "24px" }}>
        {templateName}
      </div>

      <ChipGroup label="Theme" options={themes} selected={selectedTheme} onSelect={onThemeChange} />

      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            fontSize: "10px",
            color: theme.textDim,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: "8px",
          }}
        >
          Palette
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {palettes.map((p, i) => (
            <PaletteOption
              key={i}
              palette={p}
              selected={i === selectedPalette}
              onClick={() => onPaletteChange(i)}
            />
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            fontSize: "10px",
            color: theme.textDim,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: "8px",
          }}
        >
          Typography
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {typePairs.map((tp, i) => (
            <TypeOption
              key={i}
              pair={tp}
              selected={i === selectedType}
              onClick={() => onTypeChange(i)}
            />
          ))}
        </div>
      </div>

      <ChipGroup
        label="Corners"
        options={corners}
        selected={selectedCorners}
        onSelect={onCornersChange}
      />
      <ChipGroup
        label="Density"
        options={["Tight", "Normal", "Generous"]}
        selected={selectedDensity}
        onSelect={onDensityChange}
      />
      <ChipGroup
        label="Depth"
        options={["Flat", "Subtle", "Layered"]}
        selected={selectedDepth}
        onSelect={onDepthChange}
      />
      <ChipGroup
        label="Easing"
        options={["Snappy", "Smooth", "Gentle", "Bouncy"]}
        selected={selectedEasing}
        onSelect={onEasingChange}
      />
      <ChipGroup
        label="Background"
        options={["None", "Halo", "Mint", "Cosmic", "Nighty Night", "Sunset", "Glass", "Blob"]}
        selected={selectedBackground}
        onSelect={onBackgroundChange}
      />
    </div>
  );
}
