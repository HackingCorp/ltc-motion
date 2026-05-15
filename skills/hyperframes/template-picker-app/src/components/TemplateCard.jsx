import { useRef, useCallback } from "react";
import { theme } from "../styles";

export default function TemplateCard({ template, onSelect, setupIframe }) {
  const iframeRef = useRef(null);

  const onLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    setupIframe(iframe, 0);
    const container = iframe.parentElement;
    if (container) {
      const scale = container.offsetWidth / 1920;
      iframe.style.transform = `scale(${scale})`;
    }
  }, [setupIframe]);

  return (
    <div
      onClick={() => onSelect(template)}
      style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = theme.borderHover)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = theme.border)}
    >
      <div
        style={{
          width: "100%",
          aspectRatio: "16/9",
          background: "#000",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <iframe
          ref={iframeRef}
          src={`/templates/${template.slug}/template.html`}
          sandbox="allow-same-origin"
          loading="lazy"
          onLoad={onLoad}
          style={{
            width: "1920px",
            height: "1080px",
            border: "none",
            transformOrigin: "top left",
            pointerEvents: "none",
          }}
        />
      </div>
      <div
        style={{
          padding: "10px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: "13px", fontWeight: 600, color: theme.text }}>
            {template.name}
          </div>
          <div
            style={{
              fontSize: "10px",
              color: theme.textMuted,
              maxWidth: "55%",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {template.tagline}
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <span
            style={{
              fontSize: "9px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              padding: "2px 6px",
              border: `1px solid ${theme.border}`,
              color: theme.textMuted,
            }}
          >
            {template.scheme}
          </span>
        </div>
      </div>
    </div>
  );
}
