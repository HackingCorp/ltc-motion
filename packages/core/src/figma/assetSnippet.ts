import type { AssetSnippet, FigmaManifestRecord } from "./types";

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildAssetSnippet(record: FigmaManifestRecord): AssetSnippet {
  const alt = escapeAttr(record.description ?? record.id);
  const w = record.width !== undefined ? ` width="${record.width}"` : "";
  const h = record.height !== undefined ? ` height="${record.height}"` : "";
  const html = `<img src="${record.path}" alt="${alt}"${w}${h} data-figma-id="${record.provenance.nodeId}" />`;
  return { path: record.path, html };
}
