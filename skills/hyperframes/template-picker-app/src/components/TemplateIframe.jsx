import { useRef, useEffect } from "react";

export default function TemplateIframe({
  slug,
  slideIndex = 0,
  setupIframe,
  registerOverride,
  unregisterOverride,
  style = {},
}) {
  const iframeRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (registerOverride && iframe) registerOverride(iframe);
    return () => {
      if (unregisterOverride && iframe) unregisterOverride(iframe);
    };
  }, [registerOverride, unregisterOverride]);

  const onLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    setupIframe(iframe, slideIndex);
    const container = containerRef.current;
    if (container) {
      const scale = container.offsetWidth / 1920;
      iframe.style.transform = `scale(${scale})`;
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#000",
        borderRadius: "4px",
        ...style,
      }}
    >
      <iframe
        ref={iframeRef}
        src={`/templates/${slug}/template.html`}
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
  );
}
