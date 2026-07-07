/**
 * Shared `--list` rendering for pluggable-provider commands (music, image):
 * one line per provider with live availability and its setup hint.
 */

import * as clack from "@clack/prompts";
import { c } from "./colors.js";

export interface ListableProvider {
  id: string;
  label: string;
  setupHint: string;
  availability(): Promise<{ ok: boolean; reason?: string }>;
}

export async function renderProviderList(
  title: string,
  providers: readonly ListableProvider[],
): Promise<void> {
  clack.intro(c.bold(title));
  for (const provider of providers) {
    const status = await provider.availability();
    const badge = status.ok ? c.success("ready") : c.dim(`unavailable — ${status.reason}`);
    clack.log.info(`${c.accent(provider.id)}  ${provider.label}  [${badge}]`);
    clack.log.message(c.dim(`  setup: ${provider.setupHint}`));
  }
  clack.outro("Use --provider <id> to pin one, or omit for auto-resolution.");
}
