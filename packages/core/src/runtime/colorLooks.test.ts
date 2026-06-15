import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { serializeHfLook } from "../colorLooks";
import { getBuiltinCubeLutSrc } from "../colorLuts";
import { createColorLooksRuntime, type RuntimeColorLooksApi } from "./colorLooks";

let lastUniform1f: ReturnType<typeof vi.fn> | null = null;
let lastUniform3f: ReturnType<typeof vi.fn> | null = null;

const IDENTITY_2 = `
LUT_3D_SIZE 2
0 0 0
1 0 0
0 1 0
1 1 0
0 0 1
1 0 1
0 1 1
1 1 1
`;

function createMockWebGl(): WebGLRenderingContext {
  const shader = {};
  const program = {};
  const texture = {};
  const buffer = {};
  const uniform1f = vi.fn();
  const uniform3f = vi.fn();
  lastUniform1f = uniform1f;
  lastUniform3f = uniform3f;
  return {
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    TEXTURE_2D: 0x0de1,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_MAG_FILTER: 0x2800,
    CLAMP_TO_EDGE: 0x812f,
    LINEAR: 0x2601,
    RGBA: 0x1908,
    UNSIGNED_BYTE: 0x1401,
    ARRAY_BUFFER: 0x8892,
    STATIC_DRAW: 0x88e4,
    TEXTURE0: 0x84c0,
    TEXTURE1: 0x84c1,
    FLOAT: 0x1406,
    TRIANGLE_STRIP: 0x0005,
    UNPACK_FLIP_Y_WEBGL: 0x9240,
    createShader: vi.fn(() => shader),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ""),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => program),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ""),
    deleteProgram: vi.fn(),
    createTexture: vi.fn(() => texture),
    bindTexture: vi.fn(),
    texParameteri: vi.fn(),
    texImage2D: vi.fn(),
    createBuffer: vi.fn(() => buffer),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    getUniformLocation: vi.fn((_program, name: string) => name),
    viewport: vi.fn(),
    useProgram: vi.fn(),
    activeTexture: vi.fn(),
    pixelStorei: vi.fn(),
    uniform1i: vi.fn(),
    uniform2f: vi.fn(),
    uniform1f,
    uniform3f,
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    drawArrays: vi.fn(),
    deleteTexture: vi.fn(),
  } as unknown as WebGLRenderingContext;
}

function makeDrawableVideo(): HTMLVideoElement {
  const video = document.createElement("video");
  video.id = "hero-video";
  video.setAttribute("data-hf-look", serializeHfLook({ adjust: { exposure: 0.5 } }));
  Object.defineProperty(video, "readyState", {
    value: HTMLMediaElement.HAVE_CURRENT_DATA,
    configurable: true,
  });
  Object.defineProperty(video, "videoWidth", { value: 640, configurable: true });
  Object.defineProperty(video, "videoHeight", { value: 360, configurable: true });
  Object.defineProperty(video, "offsetWidth", { value: 640, configurable: true });
  Object.defineProperty(video, "offsetHeight", { value: 360, configurable: true });
  Object.defineProperty(video, "offsetLeft", { value: 0, configurable: true });
  Object.defineProperty(video, "offsetTop", { value: 0, configurable: true });
  video.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 640,
      bottom: 360,
      width: 640,
      height: 360,
      toJSON: () => ({}),
    }) as DOMRect;
  return video;
}

describe("createColorLooksRuntime", () => {
  let getContextSpy: ReturnType<typeof vi.spyOn>;
  let runtime: RuntimeColorLooksApi | null = null;

  beforeEach(() => {
    document.body.innerHTML = "";
    lastUniform1f = null;
    lastUniform3f = null;
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockImplementation((type: string) =>
        type === "webgl" ? createMockWebGl() : null,
      ) as ReturnType<typeof vi.spyOn>;
  });

  afterEach(() => {
    runtime?.destroy();
    runtime = null;
    vi.unstubAllGlobals();
    getContextSpy.mockRestore();
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("re-hides source media after timeline visibility sync", () => {
    const video = makeDrawableVideo();
    document.body.appendChild(video);

    runtime = createColorLooksRuntime();
    const canvas = document.querySelector<HTMLCanvasElement>("[data-hf-color-look-canvas]");

    expect(canvas).not.toBeNull();
    expect(video.style.getPropertyValue("visibility")).toBe("");
    expect(video.style.getPropertyValue("opacity")).toBe("0");
    expect(video.style.getPropertyPriority("opacity")).toBe("important");
    expect(video.hasAttribute("data-hf-color-look-source-hidden")).toBe(true);
    expect(canvas?.style.visibility).toBe("visible");
    expect(canvas?.style.opacity).toBe("1");

    video.style.visibility = "visible";
    runtime.setSourceVisibility(video, true);
    runtime.redraw();

    expect(video.style.getPropertyValue("visibility")).toBe("visible");
    expect(video.style.getPropertyValue("opacity")).toBe("0");
    expect(video.style.getPropertyPriority("opacity")).toBe("important");
    expect(canvas?.style.visibility).toBe("visible");

    video.style.visibility = "hidden";
    runtime.setSourceVisibility(video, false);
    runtime.redraw();

    expect(video.style.getPropertyValue("visibility")).toBe("hidden");
    expect(video.style.getPropertyValue("opacity")).toBe("0");
    expect(video.style.getPropertyPriority("opacity")).toBe("important");
    expect(canvas?.style.visibility).toBe("hidden");
  });

  it("keeps the last shader frame visible while a video seek is waiting for a drawable frame", () => {
    const video = makeDrawableVideo();
    document.body.appendChild(video);

    runtime = createColorLooksRuntime();
    const canvas = document.querySelector<HTMLCanvasElement>("[data-hf-color-look-canvas]");

    expect(canvas).not.toBeNull();
    expect(canvas?.style.display).toBe("block");

    Object.defineProperty(video, "readyState", {
      value: HTMLMediaElement.HAVE_METADATA,
      configurable: true,
    });

    runtime.redraw();

    expect(canvas?.style.display).toBe("block");
    expect(video.style.getPropertyValue("opacity")).toBe("0");
    expect(video.style.getPropertyPriority("opacity")).toBe("important");
  });

  it("updates before-after compare uniforms without changing the source look", () => {
    const video = makeDrawableVideo();
    document.body.appendChild(video);

    runtime = createColorLooksRuntime();
    const updated = runtime.setCompare("#hero-video", {
      enabled: true,
      position: 0.25,
      lineWidth: 4,
    });

    if (!lastUniform1f) throw new Error("Expected WebGL uniform calls");
    expect(updated).toBe(true);
    expect(lastUniform1f).toHaveBeenCalledWith("u_compareEnabled", 1);
    expect(lastUniform1f).toHaveBeenCalledWith("u_comparePosition", 0.25);
    expect(lastUniform1f).toHaveBeenCalledWith("u_compareLineWidth", 4);
    expect(video.getAttribute("data-hf-look")).toBe(serializeHfLook({ adjust: { exposure: 0.5 } }));
  });

  it("loads cube LUTs and enables LUT uniforms", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(IDENTITY_2),
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const origin = window.location.origin;
    document.head.innerHTML = `<base href="${origin}/api/projects/demo/preview/">`;
    const video = makeDrawableVideo();
    video.setAttribute(
      "data-hf-look",
      serializeHfLook({ lut: { src: "assets/luts/identity.cube", intensity: 0.4 } }),
    );
    document.body.appendChild(video);

    runtime = createColorLooksRuntime();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    runtime.redraw();

    expect(fetchMock).toHaveBeenCalledWith(
      `${origin}/api/projects/demo/preview/assets/luts/identity.cube`,
      { credentials: "same-origin" },
    );
    if (!lastUniform1f || !lastUniform3f) throw new Error("Expected WebGL uniform calls");
    expect(lastUniform1f).toHaveBeenCalledWith("u_lutEnabled", 1);
    expect(lastUniform1f).toHaveBeenCalledWith("u_lutSize", 2);
    expect(lastUniform1f).toHaveBeenCalledWith("u_lutIntensity", 0.4);
    expect(lastUniform3f).toHaveBeenCalledWith("u_lutDomainMin", 0, 0, 0);
    expect(lastUniform3f).toHaveBeenCalledWith("u_lutDomainMax", 1, 1, 1);
    expect(runtime.getStatus("#hero-video").message).toBe("Shader + LUT active");
  });

  it("applies built-in LUTs without fetching project files", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const video = makeDrawableVideo();
    video.setAttribute(
      "data-hf-look",
      serializeHfLook({ lut: { src: getBuiltinCubeLutSrc("natural-boost"), intensity: 0.7 } }),
    );
    document.body.appendChild(video);

    runtime = createColorLooksRuntime();

    expect(fetchMock).not.toHaveBeenCalled();
    if (!lastUniform1f) throw new Error("Expected WebGL uniform calls");
    expect(lastUniform1f).toHaveBeenCalledWith("u_lutEnabled", 1);
    expect(lastUniform1f).toHaveBeenCalledWith("u_lutSize", 17);
    expect(lastUniform1f).toHaveBeenCalledWith("u_lutIntensity", 0.7);
    expect(runtime.getStatus("#hero-video").message).toBe("Shader + LUT active");
  });
});
