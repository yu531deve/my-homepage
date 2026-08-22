import { WebGLRenderer, ACESFilmicToneMapping, SRGBColorSpace } from "three";

export interface SizeState {
  renderScale: number;
  dprCap: number;
}

export function createRenderer(canvas: HTMLCanvasElement): WebGLRenderer | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }
  const gl = renderer.getContext();
  if (!gl) return null;

  renderer.setClearColor(0x0a0a0b, 1);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;
  return renderer;
}

// v2 (webgl-background.ts) の applySize() を移植: DPR キャップ + renderScale。
export function applySize(
  renderer: WebGLRenderer,
  width: number,
  height: number,
  state: SizeState,
): { w: number; h: number; dpr: number } {
  const dpr = Math.min(window.devicePixelRatio || 1, state.dprCap);
  const w = Math.max(1, Math.floor(width * dpr * state.renderScale));
  const h = Math.max(1, Math.floor(height * dpr * state.renderScale));
  renderer.setSize(w, h, false);
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  return { w, h, dpr };
}
