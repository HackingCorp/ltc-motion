/**
 * Phase 2 translator: figma variables → composition brand-variable entries,
 * a human-readable sidecar, and binding-index records (design spec §6, §7.1).
 *
 * Pure — REST payload in, artifacts out. Alias chains are walked to the leaf
 * value (cycle-safe) but the binding records the semantic id the designer
 * bound, so a swapped primitive doesn't orphan the link.
 */

import type { FigmaVariablePayload, FigmaVariablesResult } from "./client";
import type { FigmaBindingRecord } from "./bindings";

/** data-composition-variables entry (runtime getVariables contract). */
export interface CompositionVariableEntry {
  id: string;
  type: "string" | "number" | "color" | "boolean";
  label: string;
  default: string | number | boolean;
  brandRole?: string;
}

export interface FigmaTokenSidecarEntry {
  name: string;
  type: string;
  figmaId: string;
  key?: string;
  value: string | number | boolean | null;
}

export interface FigmaTokensSidecar {
  source: TokenSource;
  tokens: FigmaTokenSidecarEntry[];
}

export interface TokenSource {
  fileKey: string;
  version: string;
}

export interface TokensToVariablesResult {
  entries: CompositionVariableEntry[];
  bindings: FigmaBindingRecord[];
  sidecar: FigmaTokensSidecar;
}

const TYPE_MAP: Record<string, CompositionVariableEntry["type"]> = {
  COLOR: "color",
  FLOAT: "number",
  STRING: "string",
  BOOLEAN: "boolean",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toHexByte(channel: number): string {
  return Math.round(channel * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
}

function colorToCss(value: Record<string, unknown>): string | null {
  const { r, g, b, a } = value;
  if (typeof r !== "number" || typeof g !== "number" || typeof b !== "number") return null;
  const alpha = typeof a === "number" ? a : 1;
  if (alpha >= 1) return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
  const c = (n: number) => Math.round(n * 255);
  return `rgba(${c(r)}, ${c(g)}, ${c(b)}, ${alpha})`;
}

function firstModeValue(payload: FigmaVariablePayload): unknown {
  const modes = payload.valuesByMode ?? {};
  for (const value of Object.values(modes)) return value;
  return undefined;
}

/** Follow VARIABLE_ALIAS links to a leaf value; null on cycle/missing. */
function resolveValue(
  start: string,
  variables: Record<string, FigmaVariablePayload>,
): { value: unknown; chain: string[] } | null {
  const chain: string[] = [];
  let currentId = start;
  while (!chain.includes(currentId)) {
    chain.push(currentId);
    const payload = variables[currentId];
    if (!payload) return null;
    const value = firstModeValue(payload);
    if (isRecord(value) && value.type === "VARIABLE_ALIAS" && typeof value.id === "string") {
      currentId = value.id;
      continue;
    }
    return { value, chain };
  }
  return null; // cycle
}

function toEntryValue(
  resolvedType: string | undefined,
  raw: unknown,
): string | number | boolean | null {
  if (resolvedType === "COLOR") return isRecord(raw) ? colorToCss(raw) : null;
  if (typeof raw === "number" || typeof raw === "string" || typeof raw === "boolean") return raw;
  return null;
}

export function tokensToVariables(
  vars: FigmaVariablesResult,
  source: TokenSource,
): TokensToVariablesResult {
  const entries: CompositionVariableEntry[] = [];
  const bindings: FigmaBindingRecord[] = [];
  const sidecarTokens: FigmaTokenSidecarEntry[] = [];

  for (const [figmaId, payload] of Object.entries(vars.variables)) {
    const entryType = TYPE_MAP[payload.resolvedType ?? ""];
    const resolved = resolveValue(figmaId, vars.variables);
    const value = resolved ? toEntryValue(payload.resolvedType, resolved.value) : null;
    const compositionVariableId = `figma:${payload.name}`;

    sidecarTokens.push({
      name: payload.name,
      type: entryType ?? payload.resolvedType ?? "unknown",
      figmaId,
      key: payload.key,
      value,
    });

    if (!entryType || value === null || !resolved) continue;

    entries.push({
      id: compositionVariableId,
      type: entryType,
      label: payload.name,
      default: value,
    });
    bindings.push({
      kind: "binding",
      figmaId,
      key: payload.key,
      sourceFileKey: source.fileKey,
      aliasChain: resolved.chain.length > 1 ? resolved.chain : undefined,
      compositionVariableId,
      version: source.version,
    });
  }

  return { entries, bindings, sidecar: { source, tokens: sidecarTokens } };
}
