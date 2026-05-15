import { theme } from "../styles";

export default function PaletteBar({ palettes, activePalette, onSelect }) {
  return (
    <div
      style={{
        padding: "12px 32px",
        borderBottom: `1px solid ${theme.border}`,
        display: "flex",
        alignItems: "stretch",
        gap: "10px",
        background: "#111",
        position: "sticky",
        top: "49px",
        zIndex: 100,
        overflowX: "auto",
        flexWrap: "nowrap",
      }}
    >
      <label
        style={{
          fontSize: "10px",
          color: theme.textDim,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginRight: "4px",
          flexShrink: 0,
          alignSelf: "center",
        }}
      >
        Palette
      </label>
      <div style={{ display: "flex", gap: "10px", flexWrap: "nowrap" }}>
        {palettes.map((p, i) => (
          <div
            key={i}
            onClick={() => onSelect(i)}
            style={{
              flexShrink: 0,
              width: "110px",
              border: `1px solid ${i === activePalette ? theme.borderActive : "#282828"}`,
              borderRadius: "6px",
              cursor: "pointer",
              overflow: "hidden",
              transition: "border-color 0.15s",
            }}
          >
            {p.bg === "__DEFAULT__" ? (
              <>
                <div style={{ background: "#1a1a1a", padding: "12px 10px" }}>
                  <div style={{ fontSize: "15px", fontWeight: 900, color: "#888" }}>—</div>
                  <div style={{ fontSize: "8px", color: "#555" }}>Original colors</div>
                </div>
                <div style={{ background: "#111", padding: "3px 10px" }}>
                  <span style={{ fontSize: "8px", color: "#666" }}>Default</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ background: p.bg, padding: "8px 10px" }}>
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 900,
                      color: p.fg,
                      fontFamily: "system-ui",
                    }}
                  >
                    Aa
                  </div>
                  <div style={{ fontSize: "8px", color: p.mt, lineHeight: 1.3 }}>Body text</div>
                  <div
                    style={{
                      width: "28px",
                      height: "3px",
                      borderRadius: "1px",
                      marginTop: "3px",
                      background: p.ac,
                    }}
                  />
                </div>
                <div style={{ background: p.fg, padding: "3px 10px" }}>
                  <span style={{ fontSize: "8px", color: p.bg }}>{p.name}</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
