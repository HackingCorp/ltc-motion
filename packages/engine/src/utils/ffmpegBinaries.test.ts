// fallow-ignore-file code-duplication
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertConfiguredFfmpegBinariesExist,
  getFfmpegBinary,
  getFfprobeBinary,
} from "./ffmpegBinaries.js";

describe("ffmpeg binary env resolution", () => {
  const originalFfmpegPath = process.env.HYPERFRAMES_FFMPEG_PATH;
  const originalFfprobePath = process.env.HYPERFRAMES_FFPROBE_PATH;

  afterEach(() => {
    if (originalFfmpegPath === undefined) delete process.env.HYPERFRAMES_FFMPEG_PATH;
    else process.env.HYPERFRAMES_FFMPEG_PATH = originalFfmpegPath;
    if (originalFfprobePath === undefined) delete process.env.HYPERFRAMES_FFPROBE_PATH;
    else process.env.HYPERFRAMES_FFPROBE_PATH = originalFfprobePath;
  });

  it("uses configured absolute paths when env vars are set", () => {
    process.env.HYPERFRAMES_FFMPEG_PATH = "/tools/ffmpeg.exe";
    process.env.HYPERFRAMES_FFPROBE_PATH = "/tools/ffprobe.exe";

    expect(getFfmpegBinary()).toBe(resolve("/tools/ffmpeg.exe"));
    expect(getFfprobeBinary()).toBe(resolve("/tools/ffprobe.exe"));
  });

  it("throws a clear error when a configured FFmpeg path is missing", () => {
    process.env.HYPERFRAMES_FFMPEG_PATH = "/missing/ffmpeg.exe";

    expect(() => assertConfiguredFfmpegBinariesExist()).toThrow(
      /FFmpeg binary not found at HYPERFRAMES_FFMPEG_PATH/,
    );
  });

  it("accepts existing configured paths", () => {
    process.env.HYPERFRAMES_FFMPEG_PATH = process.execPath;
    process.env.HYPERFRAMES_FFPROBE_PATH = process.execPath;

    expect(() => assertConfiguredFfmpegBinariesExist()).not.toThrow();
  });

  // Regression: a path containing U+FFFD (the Unicode replacement character)
  // means a non-ASCII character was mangled somewhere before this process
  // read it (e.g. an accented character in a Windows WinGet Links path) —
  // the error should say so instead of just "not found", since the path
  // itself gives no hint that the real fix is an ASCII/short-path override.
  it("calls out a mangled replacement character in a missing FFmpeg path", () => {
    process.env.HYPERFRAMES_FFMPEG_PATH = "/tools/f�mpeg/ffmpeg.exe";

    expect(() => assertConfiguredFfmpegBinariesExist()).toThrow(/replacement character/);
  });

  it("does not mention a replacement character for an ordinary missing path", () => {
    process.env.HYPERFRAMES_FFMPEG_PATH = "/missing/ffmpeg.exe";

    expect(() => assertConfiguredFfmpegBinariesExist()).not.toThrow(/replacement character/);
  });
});
