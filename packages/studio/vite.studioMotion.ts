import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createStudioMotionRenderBodyScript,
  STUDIO_MOTION_PATH,
  type StudioMotionRenderScriptOptions,
} from "../core/src/studio-api/helpers/studioMotionRenderScript";

function readManifestContent(projectDir: string, manifestPath: string): string {
  const resolvedPath = join(projectDir, manifestPath);
  if (!existsSync(resolvedPath)) return "";
  try {
    return readFileSync(resolvedPath, "utf-8");
  } catch {
    return "";
  }
}

export function readStudioDevMotionManifestContent(projectDir: string): string {
  return readManifestContent(projectDir, STUDIO_MOTION_PATH);
}

export function createStudioDevRenderBodyScripts(
  projectDir: string,
  options: StudioMotionRenderScriptOptions = {},
): string[] {
  const motionRenderScript = createStudioMotionRenderBodyScript(
    readStudioDevMotionManifestContent(projectDir),
    options,
  );
  return [motionRenderScript].filter((script): script is string => typeof script === "string");
}
