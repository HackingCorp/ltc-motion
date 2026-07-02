/**
 * Sanitize a figma-exported SVG before it touches disk (design spec §5).
 *
 * Figma exports are machine-generated, so a conservative lexical pass is
 * sufficient here — this is defense against a hostile/compromised export,
 * not a general-purpose HTML sanitizer. Strips:
 *  - <script> elements (with content)
 *  - <foreignObject> subtrees (arbitrary embedded HTML)
 *  - on* event-handler attributes
 *  - javascript: URLs and external http(s) references in href/xlink:href
 *
 * Keeps local fragment refs (#id) and data:image embeds, which figma uses
 * for clip paths and embedded rasters.
 */
export function sanitizeSvg(svg: string): string {
  let out = svg;
  out = out.replace(/<script\b[\s\S]*?<\/script\s*>/gi, "");
  out = out.replace(/<script\b[^>]*\/>/gi, "");
  out = out.replace(/<foreignObject\b[\s\S]*?<\/foreignObject\s*>/gi, "");
  out = out.replace(/<foreignObject\b[^>]*\/>/gi, "");
  // on* handler attributes: onload="...", onclick='...'
  out = out.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
  // javascript: / external http(s) targets in href-like attributes.
  // xmlns declarations are attribute *names*, not href values — untouched.
  out = out.replace(/\s(href|xlink:href)\s*=\s*"(javascript:|https?:)[^"]*"/gi, "");
  out = out.replace(/\s(href|xlink:href)\s*=\s*'(javascript:|https?:)[^']*'/gi, "");
  return out;
}
