import { useCallback, useRef, useState } from "react";
import { downloadExport, exportComposition } from "@hyperframes/browser-export";
import { trackStudioEvent } from "../../utils/studioTelemetry";
import { t } from "../../i18n";

interface BrowserExportState {
  status: "idle" | "exporting" | "failed";
  /** 0–100, only meaningful while exporting. */
  progress: number;
  error?: string;
}

interface BrowserExportOptions {
  format: "mp4" | "webm";
  fps: 24 | 30 | 60;
  quality: "draft" | "standard" | "high";
  /** Integer upscale factor derived from the resolution preset. */
  pixelRatio?: number;
}

// standard maps to undefined = mediabunny's QUALITY_HIGH default.
const QUALITY_BITRATE: Record<BrowserExportOptions["quality"], number | undefined> = {
  draft: 2_000_000,
  standard: undefined,
  high: 12_000_000,
};

function previewCompositionDocument(): Document | null {
  const iframe = document.querySelector<HTMLIFrameElement>(".hfp-iframe");
  try {
    return iframe?.contentDocument ?? null;
  } catch {
    // Cross-origin preview — the browser pipeline needs same-origin DOM access.
    return null;
  }
}

/**
 * Client-side render path (no server, no FFmpeg) backed by
 * @hyperframes/browser-export. Complements the server render queue: the
 * result lands straight in the user's Downloads folder instead of the
 * project's renders list.
 */
export function useBrowserExport() {
  const [state, setState] = useState<BrowserExportState>({ status: "idle", progress: 0 });
  const abortRef = useRef<AbortController | null>(null);

  const startBrowserExport = useCallback(async (options: BrowserExportOptions) => {
    const target = previewCompositionDocument();
    if (!target) {
      setState({ status: "failed", progress: 0, error: t("render.browserNoPreview") });
      return;
    }
    trackStudioEvent("render_start", {
      format: options.format,
      quality: options.quality,
      fps: options.fps,
      mode: "browser",
    });
    const abort = new AbortController();
    abortRef.current = abort;
    setState({ status: "exporting", progress: 0 });
    try {
      const result = await exportComposition(target, {
        format: options.format,
        fps: options.fps,
        pixelRatio: options.pixelRatio,
        videoBitrate: QUALITY_BITRATE[options.quality],
        signal: abort.signal,
        onProgress: ({ fraction }) =>
          setState({ status: "exporting", progress: Math.round(fraction * 100) }),
      });
      downloadExport(result);
      setState({ status: "idle", progress: 0 });
    } catch (error) {
      setState({
        status: "failed",
        progress: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      abortRef.current = null;
    }
  }, []);

  const cancelBrowserExport = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { browserExport: state, startBrowserExport, cancelBrowserExport };
}
