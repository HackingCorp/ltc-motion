/** Fetch a short-lived figma CDN render url into bytes. */
export async function downloadRender(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`figma render download failed: HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}
