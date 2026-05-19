import { defineCommand } from "citty";
import type { Example } from "./_examples.js";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import * as clack from "@clack/prompts";
import { c } from "../ui/colors.js";
import { isDesignPickerEnabled } from "../utils/env.js";

export const examples: Example[] = [
  ["Open the design picker in your browser", "hyperframes pick"],
  ["Use a custom port", "hyperframes pick --port 8723"],
  ["Build the picker without serving", "hyperframes pick --build-only"],
];

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

const DEFAULT_PICKER_DATA = {
  prompt_desc: "Browse all templates",
  prompt: {
    title: "Template Picker",
    headline: "Browse and configure",
    subline: "Pick a template, fine-tune the design, export design.md",
    section_desc: "All templates",
  },
  prompt_text: {
    headline: "Browse and configure",
    sub: "Pick a template, fine-tune the design, export design.md",
    taglines: {
      bold: "BROWSE",
      editorial: "Pick a direction",
      playful: "Go!",
      dark: "Configure",
      technical: "Design System",
      warm: "Choose",
    },
    headlines: ["Browse", "Configure", "Pick", "Design"],
    body: ["Pick a template and configure it."],
    stats: ["34", "6", "5", "4"],
    statLabels: ["Templates", "Palettes", "Fonts", "Corners"],
    labels: ["BROWSE", "PICK", "CONFIGURE", "EXPORT"],
    smalls: ["Browse", "Configure", "Export", "Pick"],
  },
  architectures: [
    {
      name: "All Templates",
      description: "Browse the full library and configure your favorite.",
      tag: "browse",
      mood: "Open",
      preview_html:
        "<div style='background:{{bg}};color:{{fg}};padding:{{pad}};font-family:\"{{bf}}\",sans-serif;'><div style='font-family:\"{{hf}}\",serif;font-size:48px;font-weight:{{hw}};line-height:1.05;'>{{prompt_headline}}</div><div style='font-size:18px;color:{{mt}};margin-top:12px;max-width:70%;line-height:1.5;'>{{prompt_sub}}</div></div>",
    },
  ],
  palettes: [
    {
      name: "Light",
      primary: "#F5F2EC",
      secondary: "#111111",
      tertiary: "#666666",
      accent: "#E85D26",
      desc: "Warm light canvas, dark ink, terra accent",
    },
    {
      name: "Editorial",
      primary: "#FAF7EE",
      secondary: "#1A1A1A",
      tertiary: "#7E776A",
      accent: "#2C5BFF",
      desc: "Cream paper, ink text, cobalt accent",
    },
    {
      name: "Dark",
      primary: "#0E1116",
      secondary: "#ECECE8",
      tertiary: "#5C6A82",
      accent: "#E6FF3D",
      desc: "Near-black canvas, off-white ink, neon accent",
    },
    {
      name: "Calm",
      primary: "#EFEDE3",
      secondary: "#2A2624",
      tertiary: "#6E6357",
      accent: "#7E8456",
      desc: "Stone paper, warm ink, moss accent",
    },
  ],
  typepairs: [
    {
      name: "Inter",
      headline: { family: "Inter", weight: 800 },
      body: { family: "Inter", weight: 400 },
      preview: "Single Sans",
      body_preview: "Inter for everything.",
      desc: "Clean neutral",
    },
    {
      name: "Fraunces + Inter",
      headline: { family: "Fraunces", weight: 600 },
      body: { family: "Inter", weight: 400 },
      preview: "Editorial Style",
      body_preview: "Warm serif headline, neutral sans body.",
      desc: "Editorial warmth",
    },
    {
      name: "Space Grotesk + IBM Plex Mono",
      headline: { family: "Space Grotesk", weight: 700 },
      body: { family: "IBM Plex Mono", weight: 400 },
      preview: "Spec Sheet",
      body_preview: "Geometric sans + mono body.",
      desc: "Technical",
    },
    {
      name: "DM Serif Display + DM Sans",
      headline: { family: "DM Serif Display", weight: 400 },
      body: { family: "DM Sans", weight: 400 },
      preview: "Premium",
      body_preview: "High-contrast didone, clean sans body.",
      desc: "Premium",
    },
  ],
  moodboards: [],
};

// fallow-ignore-next-line complexity
function findSkillsRoot(cwd: string): { templatesDir: string; scriptPath: string } | null {
  // Prefer project-local install
  const local = join(cwd, "skills", "hyperframes");
  if (
    existsSync(join(local, "templates", "design-picker.html")) &&
    existsSync(join(local, "scripts", "build-design-picker.py"))
  ) {
    return {
      templatesDir: join(local, "templates"),
      scriptPath: join(local, "scripts", "build-design-picker.py"),
    };
  }

  // Dev mode: walk up from this file to find monorepo skills/
  const thisFile = fileURLToPath(import.meta.url);
  let dir = dirname(thisFile);
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, "skills", "hyperframes");
    if (
      existsSync(join(candidate, "templates", "design-picker.html")) &&
      existsSync(join(candidate, "scripts", "build-design-picker.py"))
    ) {
      return {
        templatesDir: join(candidate, "templates"),
        scriptPath: join(candidate, "scripts", "build-design-picker.py"),
      };
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}

function hasPython3(): boolean {
  try {
    execFileSync("python3", ["--version"], { stdio: "ignore", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

function buildPicker(opts: {
  scriptPath: string;
  templatePath: string;
  templatesDir: string;
  outputPath: string;
  pickerData: unknown;
  cwd: string;
}): void {
  execFileSync(
    "python3",
    [
      opts.scriptPath,
      "--template",
      opts.templatePath,
      "--templates-dir",
      opts.templatesDir,
      "--presentations-dir",
      opts.templatesDir,
      "--output",
      opts.outputPath,
    ],
    {
      input: JSON.stringify(opts.pickerData),
      stdio: ["pipe", "inherit", "inherit"],
      // Run from a neutral cwd so the build script doesn't auto-detect design.md
      // and auto-advance the picker past the templates grid on load.
      cwd: opts.cwd,
    },
  );
}

async function findOpenPort(start: number): Promise<number> {
  const { createServer: makeServer } = await import("node:net");
  for (let p = start; p < start + 100; p++) {
    const free = await new Promise<boolean>((res) => {
      const srv = makeServer();
      srv.once("error", () => res(false));
      srv.once("listening", () => srv.close(() => res(true)));
      srv.listen(p, "127.0.0.1");
    });
    if (free) return p;
  }
  throw new Error(`No free port in range ${start}–${start + 100}`);
}

function serveStatic(rootDir: string, presentationsDir: string, port: number): void {
  // fallow-ignore-next-line complexity
  const server = createServer(async (req, res) => {
    try {
      const url = req.url ?? "/";
      const cleanPath = url.split("?")[0] ?? "/";

      // Route any */templates/<slug>/* path to the skills presentations directory.
      // The picker HTML uses relative iframe srcs like `templates/<slug>/template.html`,
      // which the browser resolves against `/.hyperframes/pick-design.html` —
      // so both `/templates/...` and `/.hyperframes/templates/...` hit this handler.
      const tplIdx = cleanPath.indexOf("/templates/");
      let filePath: string;
      if (tplIdx >= 0) {
        const rel = cleanPath.slice(tplIdx + "/templates/".length);
        filePath = resolve(presentationsDir, rel);
        if (!filePath.startsWith(resolve(presentationsDir))) {
          res.writeHead(403);
          res.end("Forbidden");
          return;
        }
      } else {
        filePath = resolve(rootDir, "." + cleanPath);
        if (!filePath.startsWith(resolve(rootDir))) {
          res.writeHead(403);
          res.end("Forbidden");
          return;
        }
      }

      const data = await readFile(filePath);
      const mime = MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream";
      res.writeHead(200, { "content-type": mime, "cache-control": "no-store" });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
  server.listen(port, "127.0.0.1");
}

export default defineCommand({
  meta: {
    name: "pick",
    description: "Open the design picker in your browser to choose a template + create design.md",
  },
  args: {
    port: { type: "string", description: "Port to serve the picker on", default: "8723" },
    "build-only": {
      type: "boolean",
      description: "Build the picker HTML without serving it",
      default: false,
    },
  },
  // fallow-ignore-next-line complexity
  async run({ args }) {
    if (!isDesignPickerEnabled()) {
      clack.log.error(c.error("Design picker is an experimental feature and is not enabled."));
      clack.log.info(
        c.dim("Set ") +
          c.accent("HYPERFRAMES_DESIGN_PICKER=1") +
          c.dim(" to enable, then retry: ") +
          c.accent("hyperframes pick"),
      );
      return;
    }
    const cwd = process.cwd();

    if (!hasPython3()) {
      clack.log.error(c.error("python3 not found. Install Python 3 and retry."));
      return;
    }

    const skills = findSkillsRoot(cwd);
    if (!skills) {
      clack.log.error(c.error("HyperFrames skills not found."));
      clack.log.info(
        c.dim("Run ") + c.accent("hyperframes skills") + c.dim(" to install, then retry."),
      );
      return;
    }

    const templatePath = join(skills.templatesDir, "design-picker.html");
    const presentationsDir = join(skills.templatesDir, "presentations");
    const outDir = join(cwd, ".hyperframes");
    const outFile = join(outDir, "pick-design.html");
    const dataFile = join(outDir, "picker-data.json");

    mkdirSync(outDir, { recursive: true });

    // Use existing picker-data.json if present, else write default
    let pickerData: unknown = DEFAULT_PICKER_DATA;
    if (existsSync(dataFile)) {
      try {
        pickerData = JSON.parse(readFileSync(dataFile, "utf-8"));
      } catch {
        clack.log.warn(c.dim("picker-data.json invalid JSON — using defaults"));
      }
    } else {
      writeFileSync(dataFile, JSON.stringify(DEFAULT_PICKER_DATA, null, 2));
    }

    const s = clack.spinner();
    s.start("Building design picker...");
    const buildCwd = mkdtempSync(join(tmpdir(), "hyperframes-pick-"));
    try {
      buildPicker({
        scriptPath: skills.scriptPath,
        templatePath,
        templatesDir: presentationsDir,
        outputPath: outFile,
        pickerData,
        cwd: buildCwd,
      });
    } catch (err) {
      s.stop(c.error("Failed to build picker"));
      console.error(c.dim((err as Error).message));
      return;
    }
    s.stop(c.success("Design picker built"));

    if (args["build-only"]) {
      console.log();
      console.log(`  ${c.dim("Built")}    ${c.accent(outFile)}`);
      console.log();
      return;
    }

    const startPort = parseInt(args.port ?? "8723", 10);
    const port = await findOpenPort(startPort);
    serveStatic(cwd, presentationsDir, port);

    const url = `http://localhost:${port}/.hyperframes/pick-design.html`;
    console.log();
    console.log(`  ${c.dim("Picker")}   ${c.accent(url)}`);
    console.log();
    console.log(`  ${c.dim("Press Ctrl+C to stop")}`);
    console.log();

    import("open").then((mod) => mod.default(url)).catch(() => {});

    // Keep the process alive
    await new Promise(() => {});
  },
});
