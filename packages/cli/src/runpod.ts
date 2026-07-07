/**
 * Shared RunPod serverless client — used by the fishspeech TTS provider and
 * the image-generation providers. Jobs are submitted via `runsync` and
 * polled through `/status` until terminal (runsync results expire ~60s
 * after completion, so polls run every 2s — well inside the window).
 */

export interface RunpodConfig {
  endpoint: string;
  apiKey: string;
}

const RUNPOD_BASE = "https://api.runpod.ai/v2";
const POLL_MS = 2_000;
const DEADLINE_MS = 600_000;

async function runpodJson(
  cfg: RunpodConfig,
  path: string,
  body?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${RUNPOD_BASE}/${cfg.endpoint}/${path}`, {
    method: body ? "POST" : "GET",
    headers: { authorization: `Bearer ${cfg.apiKey}`, "content-type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    throw new Error(`RunPod API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

// fallow-ignore-next-line complexity
async function waitForRunpodCompletion(
  cfg: RunpodConfig,
  first: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  let current = first;
  const deadline = Date.now() + DEADLINE_MS;
  while (Date.now() < deadline) {
    const status = current["status"];
    if (status === "COMPLETED") return current;
    if (status === "FAILED" || status === "CANCELLED" || status === "TIMED_OUT") {
      const detail = JSON.stringify(current["error"] ?? current["output"] ?? "");
      throw new Error(`RunPod job ${status}: ${detail.slice(0, 300)}`);
    }
    const id = current["id"];
    if (typeof id !== "string") {
      throw new Error(`RunPod response has no job id: ${JSON.stringify(current).slice(0, 200)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    current = await runpodJson(cfg, `status/${id}`);
  }
  throw new Error("RunPod job did not complete within 10 minutes (cold start + generation)");
}

/** Submit input to `runsync` and wait for the terminal result. */
export async function runpodRun(
  cfg: RunpodConfig,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const first = await runpodJson(cfg, "runsync", { input });
  return waitForRunpodCompletion(cfg, first);
}

/** Endpoint health probe — throws when unreachable/unauthorized. */
export async function runpodHealth(cfg: RunpodConfig): Promise<void> {
  await runpodJson(cfg, "health");
}
