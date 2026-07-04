import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fishspeechProvider } from "./fishspeech.js";

let workdir: string;
let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), "hf-fishspeech-test-"));
  savedEnv = {};
  for (const key of [
    "FISH_SPEECH_URL",
    "FISH_SPEECH_VOICE",
    "FISH_SPEECH_API_KEY",
    "FISH_SPEECH_RUNPOD_ENDPOINT",
    "RUNPOD_API_KEY",
  ]) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  rmSync(workdir, { recursive: true, force: true });
});

/** Minimal valid PCM WAV so durationSeconds can parse it without ffprobe. */
function makeWav(seconds = 1, sampleRate = 8000): Buffer {
  const dataSize = seconds * sampleRate * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8, "ascii");
  buf.write("fmt ", 12, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

describe("fishspeech availability", () => {
  it("reports unavailable with an actionable reason when no server responds", async () => {
    process.env["FISH_SPEECH_URL"] = "http://127.0.0.1:1";
    const status = await fishspeechProvider.availability();
    expect(status.ok).toBe(false);
    expect(status.reason).toMatch(/no Fish Speech server/);
  });

  it("reports available when the health endpoint answers 200", async () => {
    process.env["FISH_SPEECH_URL"] = "http://fish.test:8080";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(String(url)).toBe("http://fish.test:8080/v1/health");
        return new Response("{}", { status: 200 });
      }),
    );
    expect(await fishspeechProvider.availability()).toEqual({ ok: true });
  });
});

describe("fishspeech synthesize", () => {
  it("POSTs the text with the cloning reference and sidecar transcript", async () => {
    process.env["FISH_SPEECH_URL"] = "http://fish.test:8080";
    const samplePath = join(workdir, "ma-voix.wav");
    writeFileSync(samplePath, makeWav());
    writeFileSync(join(workdir, "ma-voix.txt"), "Bonjour, ceci est ma voix.\n");

    const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: { body: string }) => {
        requests.push({ url: String(url), body: JSON.parse(init.body) as Record<string, unknown> });
        return new Response(new Uint8Array(makeWav(2)), { status: 200 });
      }),
    );

    const outputPath = join(workdir, "voix-off.wav");
    const result = await fishspeechProvider.synthesize("Bienvenue chez WazeApp", outputPath, {
      voice: samplePath,
    });

    expect(requests).toHaveLength(1);
    const captured = requests[0]!;
    expect(captured.url).toBe("http://fish.test:8080/v1/tts");
    expect(captured.body["text"]).toBe("Bienvenue chez WazeApp");
    expect(captured.body["format"]).toBe("wav");
    const refs = captured.body["references"] as Array<{ audio: string; text: string }>;
    expect(refs).toHaveLength(1);
    expect(Buffer.from(refs[0]!.audio, "base64").equals(makeWav())).toBe(true);
    expect(refs[0]!.text).toBe("Bonjour, ceci est ma voix.");

    expect(result.words).toBeNull();
    expect(result.durationSeconds).toBeCloseTo(2, 5);
    expect(readFileSync(outputPath).equals(makeWav(2))).toBe(true);
  });

  it("omits references without a voice and requests mp3 for .mp3 outputs", async () => {
    process.env["FISH_SPEECH_URL"] = "http://fish.test:8080";
    const bodies: Array<Record<string, unknown>> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { body: string }) => {
        bodies.push(JSON.parse(init.body) as Record<string, unknown>);
        return new Response(new Uint8Array(Buffer.from("mp3-bytes")), { status: 200 });
      }),
    );

    await fishspeechProvider.synthesize("Salut", join(workdir, "out.mp3"), {});
    expect(bodies[0]!["references"]).toBeUndefined();
    expect(bodies[0]!["format"]).toBe("mp3");
  });

  it("fails with an actionable error when the reference sample is missing", async () => {
    await expect(
      fishspeechProvider.synthesize("x", join(workdir, "out.wav"), {
        voice: join(workdir, "absent.wav"),
      }),
    ).rejects.toThrow(/reference sample not found/);
  });

  it("forwards FISH_SPEECH_API_KEY as a bearer token for hosted servers", async () => {
    process.env["FISH_SPEECH_URL"] = "https://tts.example.com";
    process.env["FISH_SPEECH_API_KEY"] = "secret-token";
    const headers: Array<Record<string, string>> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { headers?: Record<string, string> }) => {
        headers.push(init.headers ?? {});
        return new Response(new Uint8Array(makeWav()), { status: 200 });
      }),
    );

    await fishspeechProvider.synthesize("x", join(workdir, "out.wav"), {});
    expect(headers[0]!["authorization"]).toBe("Bearer secret-token");
  });

  it("surfaces server errors with the Fish Speech label", async () => {
    process.env["FISH_SPEECH_URL"] = "http://fish.test:8080";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("CUDA out of memory", { status: 500 })),
    );
    await expect(fishspeechProvider.synthesize("x", join(workdir, "out.wav"), {})).rejects.toThrow(
      /Fish Speech API error 500: CUDA out of memory/,
    );
  });
});

describe("fishspeech via RunPod", () => {
  function setRunpodEnv(): void {
    process.env["FISH_SPEECH_RUNPOD_ENDPOINT"] = "ep123";
    process.env["RUNPOD_API_KEY"] = "rpa_test";
  }

  function jsonResponse(payload: unknown): Response {
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  it("prefers the RunPod transport and decodes audio from a completed runsync", async () => {
    setRunpodEnv();
    const calls: Array<{ url: string; auth?: string; body?: unknown }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: { headers?: Record<string, string>; body?: string }) => {
        calls.push({
          url: String(url),
          auth: init.headers?.["authorization"],
          body: init.body ? JSON.parse(init.body) : undefined,
        });
        return jsonResponse({
          id: "job-1",
          status: "COMPLETED",
          output: { audio_b64: makeWav().toString("base64"), format: "wav" },
        });
      }),
    );

    const result = await fishspeechProvider.synthesize("Salut", join(workdir, "out.wav"), {});
    expect(calls[0]!.url).toBe("https://api.runpod.ai/v2/ep123/runsync");
    expect(calls[0]!.auth).toBe("Bearer rpa_test");
    expect((calls[0]!.body as { input: { text: string } }).input.text).toBe("Salut");
    expect(result.durationSeconds).toBeCloseTo(1, 5);
    expect(readFileSync(join(workdir, "out.wav")).equals(makeWav())).toBe(true);
  });

  it("polls the status endpoint until the job completes", async () => {
    setRunpodEnv();
    let statusCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).endsWith("/runsync")) {
          return jsonResponse({ id: "job-2", status: "IN_QUEUE" });
        }
        statusCalls += 1;
        return jsonResponse(
          statusCalls < 2
            ? { id: "job-2", status: "IN_PROGRESS" }
            : {
                id: "job-2",
                status: "COMPLETED",
                output: { audio_b64: makeWav().toString("base64") },
              },
        );
      }),
    );

    const result = await fishspeechProvider.synthesize("x", join(workdir, "out.wav"), {});
    expect(statusCalls).toBe(2);
    expect(result.words).toBeNull();
  }, 15_000);

  it("surfaces worker-side errors", async () => {
    setRunpodEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ id: "j", status: "COMPLETED", output: { error: "input.text is required" } }),
      ),
    );
    await expect(fishspeechProvider.synthesize("x", join(workdir, "o.wav"), {})).rejects.toThrow(
      /worker error: input.text is required/,
    );
  });

  it("reports availability through the RunPod health endpoint", async () => {
    setRunpodEnv();
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        urls.push(String(url));
        return jsonResponse({ workers: { ready: 1 } });
      }),
    );
    expect(await fishspeechProvider.availability()).toEqual({ ok: true });
    expect(urls[0]).toBe("https://api.runpod.ai/v2/ep123/health");
  });
});
