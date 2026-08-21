import {
  Scene,
  OrthographicCamera,
  PlaneGeometry,
  ShaderMaterial,
  Mesh,
  WebGLRenderer,
  Vector2,
} from "three";
import gsap from "gsap";

const VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2 uResolution;
uniform float uScroll;
uniform float uScrollVelocity;
uniform vec2 uMouse;
uniform float uSection;
uniform float uIntensity;
uniform float uPixelRatio;
uniform float uReveal;
uniform float uLowQuality;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  int octaves = uLowQuality > 0.5 ? 3 : 5;
  for (int i = 0; i < 5; i++) {
    if (i >= octaves) break;
    v += a * noise(p);
    p = rot * p * 2.02 + 0.03 * uTime * float(i) * 0.15;
    a *= 0.5;
  }
  return v;
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 uv = (vUv - 0.5) * vec2(aspect, 1.0);

  vec2 m = (uMouse - 0.5) * vec2(aspect, 1.0);
  float md = length(uv - m);
  uv += normalize(uv - m + 1e-5) * (-0.12 / (1.0 + md * 8.0));

  float t = uTime * 0.06;
  float s = uScroll;

  vec2 q = vec2(
    fbm(uv * 1.6 + vec2(0.0, t)),
    fbm(uv * 1.6 + vec2(5.2, 1.3 - t))
  );

  vec2 r;
  if (uLowQuality > 0.5) {
    r = q;
  } else {
    r = vec2(
      fbm(uv * 2.4 + 4.0 * q + vec2(1.7, 9.2) + t * 1.4 + s * 2.0),
      fbm(uv * 2.4 + 4.0 * q + vec2(8.3, 2.8) - t * 1.1)
    );
  }

  float f = fbm(uv * 2.0 + 4.0 * r);

  float breath = 0.5 + 0.5 * sin(uTime * 0.35);
  f += breath * 0.06;

  float core = smoothstep(0.42, 0.78, f);
  float veins = pow(max(1.0 - abs(f - 0.55) * 3.2, 0.0), 6.0);

  vec3 base = vec3(0.039, 0.039, 0.043);
  vec3 emerald = vec3(0.063, 0.725, 0.506);
  vec3 bright = vec3(0.204, 0.827, 0.600);
  vec3 deep = vec3(0.023, 0.145, 0.180);

  vec3 col = base;
  col = mix(col, deep, smoothstep(0.25, 0.6, f));
  col = mix(col, emerald, core * 0.55);
  col += bright * veins * (0.9 + 0.6 * breath) * uIntensity;

  // --- セクションごとの表情(uSection で連続補間)---
  // 0 Hero
  float heroVignette = 1.0 - 0.2 * length(uv);
  vec3 sceneCol = col * heroVignette;

  // 1 About: 水平ストレッチ
  float fAbout = fbm(vec2(uv.x * 0.6, uv.y) * 2.0 + 4.0 * r);
  vec3 aboutCol = mix(col, col * (0.85 + 0.3 * fAbout), 0.6);
  sceneCol = mix(sceneCol, aboutCol, clamp(uSection - 0.0, 0.0, 1.0));

  // 2 Works: 縦スキャンライン
  float scan = sin(vUv.y * 180.0 + uTime * 2.0) * 0.02;
  vec3 worksCol = sceneCol + scan;
  sceneCol = mix(sceneCol, worksCol, clamp(uSection - 1.0, 0.0, 1.0));

  // 3 Blog: 粒状化
  float fq = floor(f * 12.0) / 12.0;
  vec3 blogCol = mix(sceneCol, sceneCol * (0.7 + fq * 0.6), 0.4);
  sceneCol = mix(sceneCol, blogCol, clamp(uSection - 2.0, 0.0, 1.0));

  // 4 Contact: bright寄り + 中央発光
  vec3 contactCol = sceneCol * 1.3 + bright * smoothstep(0.6, 0.0, length(uv)) * 0.8;
  sceneCol = mix(sceneCol, contactCol, clamp(uSection - 3.0, 0.0, 1.0));

  col = sceneCol;

  col *= 1.0 + uScrollVelocity * 0.25 * veins;

  col *= uReveal;
  col *= 1.0 - 0.55 * pow(length(vUv - 0.5) * 1.35, 2.0);
  col += (hash(vUv * uResolution + uTime) * 2.0 - 1.0) * 0.012;

  gl_FragColor = vec4(col, 1.0);
}
`;

interface WebGLBackgroundHandle {
  setSection(section: number): void;
  setIntensity(intensity: number, duration?: number): void;
  destroy(): void;
}

declare global {
  interface Window {
    __bgGL?: WebGLBackgroundHandle;
  }
}

export function initWebGLBackground(): WebGLBackgroundHandle | null {
  if (typeof window === "undefined") return null;
  if (window.__bgGL) return window.__bgGL;

  const canvasEl = document.querySelector<HTMLCanvasElement>("#bg-gl");
  if (!canvasEl) return null;
  const canvas: HTMLCanvasElement = canvasEl;

  const isCoarse = window.matchMedia("(pointer: coarse)").matches;
  const showHud =
    import.meta.env.DEV && typeof location !== "undefined" && location.hash === "#perf";

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

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new PlaneGeometry(2, 2);

  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: new Vector2(1, 1) },
    uScroll: { value: 0 },
    uScrollVelocity: { value: 0 },
    uMouse: { value: new Vector2(0.5, 0.5) },
    uSection: { value: 0 },
    uIntensity: { value: 0.9 },
    uPixelRatio: { value: 1 },
    uReveal: { value: 0 },
    uLowQuality: { value: isCoarse ? 1 : 0 },
  };

  const material = new ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });

  const mesh = new Mesh(geometry, material);
  scene.add(mesh);

  let renderScale = isCoarse ? 0.6 : 0.75;
  let dprCap = isCoarse ? 1.25 : 1.75;
  let width = window.innerWidth;
  let height = window.innerHeight;
  let running = true;
  let degraded = false;
  const startTime = performance.now();
  let frameSamples: number[] = [];
  let lastFrameTime = performance.now();

  let hud: HTMLDivElement | null = null;
  if (showHud) {
    hud = document.createElement("div");
    hud.style.cssText =
      "position:fixed;bottom:8px;right:8px;z-index:9999;font:11px monospace;color:#34d399;background:rgba(0,0,0,.6);padding:4px 8px;border-radius:4px;pointer-events:none;";
    document.body.appendChild(hud);
  }

  function applySize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    uniforms.uPixelRatio.value = dpr;
    const w = Math.max(1, Math.floor(width * dpr * renderScale));
    const h = Math.max(1, Math.floor(height * dpr * renderScale));
    renderer.setSize(w, h, false);
    canvas!.style.width = "100%";
    canvas!.style.height = "100%";
    uniforms.uResolution.value.set(w, h);
  }

  applySize();

  gsap.to(uniforms.uReveal, { value: 1, duration: 1.8, ease: "power2.out" });

  const targetMouse = { x: 0.5, y: 0.5 };
  const lerpedMouse = { x: 0.5, y: 0.5 };
  const targetScroll = { value: 0 };
  let lastScrollY = window.scrollY;
  let lastScrollTime = performance.now();

  function onMouseMove(e: MouseEvent): void {
    if (isCoarse) return;
    targetMouse.x = e.clientX / window.innerWidth;
    targetMouse.y = 1 - e.clientY / window.innerHeight;
  }
  window.addEventListener("mousemove", onMouseMove, { passive: true });

  function onScroll(): void {
    const doc = document.documentElement;
    const limit = doc.scrollHeight - window.innerHeight;
    targetScroll.value = limit > 0 ? window.scrollY / limit : 0;

    const now = performance.now();
    const dt = Math.max(1, now - lastScrollTime);
    const dy = window.scrollY - lastScrollY;
    const velocity = dy / dt;
    uniforms.uScrollVelocity.value = Math.max(-1, Math.min(1, velocity * 12));
    lastScrollY = window.scrollY;
    lastScrollTime = now;
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  let lastWidth = window.innerWidth;
  function onResize(): void {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const newWidth = window.innerWidth;
      // 幅が変わっていない高さのみの変化(モバイルアドレスバー)は無視
      if (newWidth === lastWidth) return;
      lastWidth = newWidth;
      width = window.innerWidth;
      height = window.innerHeight;
      applySize();
    }, 150);
  }
  window.addEventListener("resize", onResize);

  function onVisibility(): void {
    if (document.visibilityState === "hidden") {
      if (running) {
        gsap.ticker.remove(tick);
        running = false;
      }
    } else if (!running) {
      gsap.ticker.add(tick);
      running = true;
    }
  }
  document.addEventListener("visibilitychange", onVisibility);

  function onContextLost(e: Event): void {
    e.preventDefault();
    if (running) {
      gsap.ticker.remove(tick);
      running = false;
    }
  }
  canvas.addEventListener("webglcontextlost", onContextLost, false);

  function tick(): void {
    const now = performance.now();
    const frameDt = now - lastFrameTime;
    lastFrameTime = now;

    uniforms.uTime.value = (now - startTime) / 1000;

    lerpedMouse.x += (targetMouse.x - lerpedMouse.x) * 0.06;
    lerpedMouse.y += (targetMouse.y - lerpedMouse.y) * 0.06;
    uniforms.uMouse.value.set(isCoarse ? 0.5 : lerpedMouse.x, isCoarse ? 0.5 : lerpedMouse.y);

    uniforms.uScroll.value += (targetScroll.value - uniforms.uScroll.value) * 0.08;

    // 自動デグレード判定(起動後2秒間のみ計測)
    if (!degraded && uniforms.uTime.value < 2) {
      frameSamples.push(frameDt);
    } else if (!degraded && frameSamples.length > 0) {
      const avg = frameSamples.reduce((a, b) => a + b, 0) / frameSamples.length;
      if (avg > 20) {
        renderScale = 0.6;
        uniforms.uLowQuality.value = 1;
        applySize();
      }
      degraded = true;
      frameSamples = [];
    }

    renderer.render(scene, camera);

    if (hud) {
      const fps = frameDt > 0 ? Math.round(1000 / frameDt) : 0;
      hud.textContent = `fps ${fps} | frame ${frameDt.toFixed(1)}ms | scale ${renderScale.toFixed(2)}`;
    }
  }

  gsap.ticker.add(tick);

  function setSection(section: number): void {
    gsap.to(uniforms.uSection, { value: section, duration: 1.2, ease: "power2.inOut" });
    const prev = uniforms.uIntensity.value;
    gsap.to(uniforms.uIntensity, {
      value: 1.8,
      duration: 0.15,
      ease: "power1.out",
      onComplete: () => {
        gsap.to(uniforms.uIntensity, { value: prev || 0.9, duration: 0.6, ease: "power2.out" });
      },
    });
  }

  function setIntensity(intensity: number, duration = 0.6): void {
    gsap.to(uniforms.uIntensity, { value: intensity, duration, ease: "power2.out" });
  }

  function destroy(): void {
    gsap.ticker.remove(tick);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVisibility);
    canvas.removeEventListener("webglcontextlost", onContextLost, false);
    if (resizeTimer) clearTimeout(resizeTimer);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    hud?.remove();
    delete window.__bgGL;
  }

  const handle: WebGLBackgroundHandle = { setSection, setIntensity, destroy };
  window.__bgGL = handle;
  return handle;
}
