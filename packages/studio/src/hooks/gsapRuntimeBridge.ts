/**
 * Bridge between the Studio drag system and GSAP animations running in the
 * preview iframe.
 *
 * The preview iframe exposes `window.gsap` with a `getProperty(element, prop)`
 * method that returns the ACTUAL interpolated value at the current seek time.
 * This module reads those runtime values so that drag commits can write correct
 * absolute positions back into the GSAP script, regardless of tween type,
 * easing, or seek position.
 */
import type { GsapAnimation } from "@hyperframes/core/gsap-parser";
import type { DomEditSelection } from "../components/editor/domEditingTypes";
import { clearStudioPathOffset } from "../components/editor/manualEdits";
import { usePlayerStore } from "../player/store/playerStore";

// ── Runtime reads ──────────────────────────────────────────────────────────

interface IframeGsap {
  getProperty: (el: Element, prop: string) => number;
}

/**
 * Read GSAP interpolated x/y values from the preview iframe at the current
 * seek time. Returns null if GSAP is not available or the element cannot be
 * found.
 */
// fallow-ignore-next-line complexity
function readGsapPositionFromIframe(
  iframe: HTMLIFrameElement | null,
  elementSelector: string,
): { x: number; y: number } | null {
  if (!iframe?.contentWindow) return null;

  let gsap: IframeGsap | undefined;
  try {
    gsap = (iframe.contentWindow as unknown as { gsap?: IframeGsap }).gsap;
  } catch {
    // cross-origin guard
    return null;
  }
  if (!gsap?.getProperty) return null;

  let doc: Document | null = null;
  try {
    doc = iframe.contentDocument;
  } catch {
    return null;
  }
  if (!doc) return null;

  const element = doc.querySelector(elementSelector);
  if (!element) return null;

  const x = Number(gsap.getProperty(element, "x")) || 0;
  const y = Number(gsap.getProperty(element, "y")) || 0;
  return { x, y };
}

// ── Animation matching ─────────────────────────────────────────────────────

/**
 * Find the GSAP animation that controls position (x/y) for the selected
 * element. Checks keyframed tweens first, then flat tweens (from, fromTo,
 * to, set).
 */
// fallow-ignore-next-line complexity
function findGsapPositionAnimation(animations: GsapAnimation[]): GsapAnimation | null {
  for (const anim of animations) {
    if (anim.keyframes) {
      const hasPos = anim.keyframes.keyframes.some(
        (kf) => "x" in kf.properties || "y" in kf.properties,
      );
      if (hasPos) return anim;
    }

    const props = anim.properties;
    const fromProps = anim.fromProperties;
    if (anim.method === "fromTo") {
      if ("x" in props || "y" in props || (fromProps && ("x" in fromProps || "y" in fromProps))) {
        return anim;
      }
    } else if ("x" in props || "y" in props) {
      return anim;
    }
  }
  return null;
}

// ── Selector resolution ────────────────────────────────────────────────────

function selectorForSelection(selection: DomEditSelection): string | null {
  if (selection.id) return `#${selection.id}`;
  if (selection.selector) return selection.selector;
  return null;
}

// ── High-level intercept ───────────────────────────────────────────────────

/**
 * Attempt to handle a drag commit via the GSAP script mutation path.
 * Returns true if the drag was handled (caller should skip the CSS path),
 * false if no GSAP position animation exists or the runtime bridge cannot
 * read the current position.
 */
// fallow-ignore-next-line complexity
export function tryGsapDragIntercept(
  selection: DomEditSelection,
  offset: { x: number; y: number },
  animations: GsapAnimation[],
  iframe: HTMLIFrameElement | null,
  commitMutation: GsapDragCommitCallbacks["commitMutation"],
): boolean {
  const posAnim = findGsapPositionAnimation(animations);
  if (!posAnim) return false;

  const selector = selectorForSelection(selection);
  if (!selector) return false;

  const gsapPos = readGsapPositionFromIframe(iframe, selector);
  if (!gsapPos) return false;

  commitGsapPositionFromDrag(selection, posAnim, offset, gsapPos, { commitMutation });
  return true;
}

// ── Commit helpers ─────────────────────────────────────────────────────────

export interface GsapDragCommitCallbacks {
  commitMutation: (
    selection: DomEditSelection,
    mutation: Record<string, unknown>,
    options: { label: string; coalesceKey?: string; softReload?: boolean },
  ) => Promise<void>;
}

/**
 * Compute the new GSAP position values from runtime-read positions + drag
 * offset, then commit the mutation to the GSAP script.
 *
 * After committing, clears the studio CSS offset so GSAP owns position
 * entirely after the soft-reload.
 */
function commitGsapPositionFromDrag(
  selection: DomEditSelection,
  anim: GsapAnimation,
  studioOffset: { x: number; y: number },
  gsapPos: { x: number; y: number },
  callbacks: GsapDragCommitCallbacks,
): void {
  const newX = Math.round(gsapPos.x + studioOffset.x);
  const newY = Math.round(gsapPos.y + studioOffset.y);

  if (anim.keyframes) {
    commitKeyframedPosition(selection, anim, newX, newY, callbacks);
  } else if (anim.method === "from") {
    commitFromPosition(selection, anim, studioOffset, callbacks);
  } else if (anim.method === "fromTo") {
    commitFromToPosition(selection, anim, studioOffset, callbacks);
  } else {
    // to() or set()
    commitFlatPosition(selection, anim, newX, newY, callbacks);
  }

  clearStudioPathOffset(selection.element);
}

// fallow-ignore-next-line complexity
function commitKeyframedPosition(
  selection: DomEditSelection,
  anim: GsapAnimation,
  newX: number,
  newY: number,
  callbacks: GsapDragCommitCallbacks,
): void {
  const elStart = Number.parseFloat(selection.dataAttributes?.start ?? "0") || 0;
  const elDuration = Number.parseFloat(selection.dataAttributes?.duration ?? "1") || 1;
  const currentTime = usePlayerStore.getState().currentTime;
  const pct =
    elDuration > 0
      ? Math.max(0, Math.min(100, Math.round(((currentTime - elStart) / elDuration) * 100)))
      : 0;

  void callbacks.commitMutation(
    selection,
    {
      type: "add-keyframe",
      animationId: anim.id,
      percentage: pct,
      properties: { x: newX, y: newY },
    },
    { label: `Move layer (keyframe ${pct}%)`, softReload: true },
  );
}

function commitFromPosition(
  selection: DomEditSelection,
  anim: GsapAnimation,
  delta: { x: number; y: number },
  callbacks: GsapDragCommitCallbacks,
): void {
  const fromX = Math.round(Number(anim.properties.x ?? 0) + delta.x);
  const fromY = Math.round(Number(anim.properties.y ?? 0) + delta.y);

  void callbacks.commitMutation(
    selection,
    { type: "update-property", animationId: anim.id, property: "x", value: fromX },
    { label: "Move layer (GSAP from x)", softReload: false },
  );
  void callbacks.commitMutation(
    selection,
    { type: "update-property", animationId: anim.id, property: "y", value: fromY },
    { label: "Move layer (GSAP from y)", softReload: true },
  );
}

// fallow-ignore-next-line complexity
function commitFromToPosition(
  selection: DomEditSelection,
  anim: GsapAnimation,
  delta: { x: number; y: number },
  callbacks: GsapDragCommitCallbacks,
): void {
  // Shift fromProperties
  if (anim.fromProperties) {
    const fromX = Math.round(Number(anim.fromProperties.x ?? 0) + delta.x);
    const fromY = Math.round(Number(anim.fromProperties.y ?? 0) + delta.y);
    void callbacks.commitMutation(
      selection,
      { type: "update-from-property", animationId: anim.id, property: "x", value: fromX },
      { label: "Move (GSAP from x)", softReload: false },
    );
    void callbacks.commitMutation(
      selection,
      { type: "update-from-property", animationId: anim.id, property: "y", value: fromY },
      { label: "Move (GSAP from y)", softReload: false },
    );
  }

  // Shift toProperties
  const toX = Math.round(Number(anim.properties.x ?? 0) + delta.x);
  const toY = Math.round(Number(anim.properties.y ?? 0) + delta.y);
  void callbacks.commitMutation(
    selection,
    { type: "update-property", animationId: anim.id, property: "x", value: toX },
    { label: "Move (GSAP to x)", softReload: false },
  );
  void callbacks.commitMutation(
    selection,
    { type: "update-property", animationId: anim.id, property: "y", value: toY },
    { label: "Move (GSAP to y)", softReload: true },
  );
}

function commitFlatPosition(
  selection: DomEditSelection,
  anim: GsapAnimation,
  newX: number,
  newY: number,
  callbacks: GsapDragCommitCallbacks,
): void {
  void callbacks.commitMutation(
    selection,
    { type: "update-property", animationId: anim.id, property: "x", value: newX },
    { label: "Move layer (GSAP x)", softReload: false },
  );
  void callbacks.commitMutation(
    selection,
    { type: "update-property", animationId: anim.id, property: "y", value: newY },
    { label: "Move layer (GSAP y)", softReload: true },
  );
}
