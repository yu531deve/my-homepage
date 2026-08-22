import {
  Scene,
  PerspectiveCamera,
  FogExp2,
  Vector3,
  Clock,
  Color,
  type ShaderMaterial,
} from "three";
import gsap from "gsap";
import { createRenderer, applySize } from "./renderer";
import { createComposer, type ComposerHandle } from "./composer";
import { initScroll, type ScrollHandle } from "./scroll";
import { CameraPath, KEYS, KEYS_SIMPLIFIED, SECTIONS, localP } from "./camera-path";
import { preloadFonts } from "./text";
import { createNebula, type NebulaHandle } from "./env/nebula";
import { createDust, type DustHandle } from "./env/dust";
import { createHeroSpace } from "./spaces/hero";
import { createAboutSpace } from "./spaces/about";
import { createWorksSpace, type WorkItem } from "./spaces/works";
import { createBlogSpace, type BlogItem } from "./spaces/blog";
import { createContactSpace } from "./spaces/contact";
import { HitSync } from "./hit-sync";
import {
  detectInitialQuality,
  settingsFor,
  downgrade,
  upgrade,
  type QualitySettings,
} from "./quality";
import type { Space } from "./types";

export interface EngineConfig {
  works: WorkItem[];
  posts: BlogItem[];
  showHud: boolean;
}

export async function startEngine(config: EngineConfig): Promise<() => void> {
  const canvas = document.querySelector<HTMLCanvasElement>("#gl-canvas");
  const stage = document.querySelector<HTMLElement>("#gl-stage");
  if (!canvas || !stage) return () => {};

  await preloadFonts();

  const renderer = createRenderer(canvas);
  if (!renderer) return () => {};

  let quality = detectInitialQuality();
  const initialQuality = quality;
  let settings: QualitySettings = settingsFor(quality);

  const scene = new Scene();
  scene.background = new Color(0x0a0a0b);
  const fog = new FogExp2(0x0a0a0b, 0.018);
  scene.fog = fog;

  const camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 300);
  const camPath = new CameraPath(settings.simplifiedCameraPath ? KEYS_SIMPLIFIED : KEYS);

  const scrollHandle: ScrollHandle = initScroll(settings.parallax);

  let nebula: NebulaHandle = createNebula(settings.octaves);
  let dust: DustHandle = createDust(settings.dustCount);
  scene.add(nebula.mesh, dust.points);

  const spaces: Space[] = [
    createHeroSpace(),
    createAboutSpace(),
    createWorksSpace(config.works),
    createBlogSpace(config.posts),
    createContactSpace(),
  ];
  spaces.forEach((s) => scene.add(s.group));

  let composerHandle: ComposerHandle | null = settings.postprocessing
    ? createComposer(renderer, scene, camera, settings.bloomOnly)
    : null;

  const hitSync = new HitSync(camera);
  wireHitSync(hitSync, spaces);

  document.documentElement.classList.add("webgl-on");

  function resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const { w: rw, h: rh } = applySize(renderer!, w, h, settings);
    composerHandle?.setSize(rw, rh);
  }
  resize();
  window.addEventListener("resize", resize);

  const clock = new Clock();
  const posVec = new Vector3();
  const lookVec = new Vector3();
  const rightVec = new Vector3();
  const upVec = new Vector3(0, 1, 0);
  let running = true;
  let contextLost = false;

  // --- 実行時デグレード監視 ---
  const frameHistory: number[] = [];
  let cooldownUntil = 0;
  let belowAvgSince = -1;
  let aboveAvgSince = -1;
  let downgradeCount = 0;

  function rebuildForQuality(): void {
    settings = settingsFor(quality);
    nebula.dispose();
    nebula = createNebula(settings.octaves);
    dust.dispose();
    dust = createDust(settings.dustCount);
    scene.add(nebula.mesh, dust.points);
    composerHandle?.dispose();
    composerHandle = settings.postprocessing
      ? createComposer(renderer!, scene, camera, settings.bloomOnly)
      : null;
    resize();
  }

  let hud: HTMLDivElement | null = null;
  if (config.showHud) {
    hud = document.createElement("div");
    hud.style.cssText =
      "position:fixed;bottom:8px;right:8px;z-index:9999;font:11px monospace;color:#34d399;background:rgba(0,0,0,.6);padding:4px 8px;border-radius:4px;pointer-events:none;white-space:pre;";
    document.body.appendChild(hud);
  }

  const forceOff =
    import.meta.env.DEV && new URLSearchParams(location.search).get("forceQuality") === "off";
  if (forceOff) {
    stopAndFallback();
  }

  function stopAndFallback(): void {
    running = false;
    document.documentElement.classList.remove("webgl-on");
    stage!.style.display = "none";
  }

  function tick(): void {
    if (!running || contextLost) return;
    const dt = Math.min(0.1, clock.getDelta());
    const t = clock.elapsedTime;
    const frameStart = performance.now();

    scrollHandle.update();
    const { p, velocity, mouse } = scrollHandle.state;

    const { fov, roll } = camPath.resolve(p, posVec, lookVec);

    // マウスパララックス: カメラのローカル right/up 基底で加算(ベクトルは使い回す)
    camera.getWorldDirection(rightVec);
    rightVec.cross(upVec).normalize();

    const now = performance.now();
    const idleFor = now - scrollHandle.state.lastMouseMoveAt;
    let mx = mouse.x;
    let my = mouse.y;
    if (settings.parallax && idleFor > 1500) {
      const blend = Math.min(1, (idleFor - 1500) / 800);
      mx += Math.sin(t * 0.23) * 0.9 * blend;
      my += Math.cos(t * 0.17) * 0.6 * blend;
    }

    if (settings.parallax) {
      posVec.addScaledVector(rightVec, mx * 1.1);
      posVec.y += my * 0.7;
      lookVec.addScaledVector(rightVec, mx * 2.4);
      lookVec.y += my * 1.6;
    }

    camera.position.copy(posVec);
    const speedFov = Math.min(8, Math.abs(velocity) * 6);
    const targetFov = fov + speedFov;
    if (camPath.shouldUpdateProjection(targetFov)) {
      camera.fov = targetFov;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(lookVec);
    camera.rotateZ(roll + (settings.parallax ? mx * 0.02 : 0));

    nebula.update(dt, p, camera.position, 1.0 + Math.abs(velocity) * 2.0);
    dust.update(dt);

    for (const space of spaces) {
      const range = sectionRangeFor(space, spaces);
      const lp = range ? localP(p, range) : p;
      space.update({
        p,
        localP: lp,
        t,
        dt,
        mouse: { x: mx, y: my },
        velocity,
        camDistance: (worldZ: number) => Math.abs(camera.position.z - worldZ),
      });
    }

    hitSync.update();

    // Contact 区間(§19): 区間進行に応じてビネットを強め・霧を濃くし、
    // 黒を支配色として保ったまま発光要素(テキスト・オーブ)のコントラストを
    // 相対的に引き立てる。
    const contactP = Math.max(
      0,
      Math.min(1, (p - SECTIONS.contact[0]) / (SECTIONS.contact[1] - SECTIONS.contact[0])),
    );
    fog.density = 0.018 + contactP * 0.035;
    if (composerHandle?.vignette) {
      composerHandle.vignette.darkness = 0.62 + contactP * 0.3;
    }
    if (composerHandle) {
      composerHandle.bloom.luminanceMaterial.threshold = 0.82 + contactP * 0.12;
    }

    if (composerHandle) {
      composerHandle.bloom.intensity = Math.min(
        3.0,
        1.45 + Math.abs(velocity) * 1.2 - contactP * 0.35,
      );
      if (composerHandle.chromaticAberration) {
        composerHandle.chromaticAberration.offset.x = Math.min(
          0.006,
          0.0011 + Math.abs(velocity) * 0.004,
        );
      }
      composerHandle.render(dt);
    } else {
      renderer!.render(scene, camera);
    }

    const frameMs = performance.now() - frameStart;
    monitorPerformance(frameMs);

    if (hud) {
      hud.textContent = `fps ${Math.round(1000 / Math.max(1, frameMs))} | frame ${frameMs.toFixed(1)}ms | draws ${renderer!.info.render.calls} | tris ${renderer!.info.render.triangles} | q ${quality} | p ${p.toFixed(2)}`;
    }
  }

  function monitorPerformance(frameMs: number): void {
    frameHistory.push(frameMs);
    if (frameHistory.length > 90) frameHistory.shift();
    if (frameHistory.length < 90) return;
    const avg = frameHistory.reduce((a, b) => a + b, 0) / frameHistory.length;
    const now = performance.now();
    if (now < cooldownUntil) return;

    if (avg > 22) {
      if (belowAvgSince < 0) belowAvgSince = now;
      if (now - belowAvgSince > 2000) {
        if (quality !== "low") {
          quality = downgrade(quality);
          downgradeCount++;
          rebuildForQuality();
          cooldownUntil = now + 3000;
        } else if (avg > 30 && downgradeCount >= 3) {
          stopAndFallback();
        }
        belowAvgSince = -1;
      }
    } else {
      belowAvgSince = -1;
    }

    if (avg < 13) {
      if (aboveAvgSince < 0) aboveAvgSince = now;
      if (now - aboveAvgSince > 8000) {
        if (quality !== "high" && initialQuality !== "low") {
          quality = upgrade(quality);
          rebuildForQuality();
          cooldownUntil = now + 3000;
        }
        aboveAvgSince = -1;
      }
    } else {
      aboveAvgSince = -1;
    }
  }

  gsap.ticker.add(tick);

  function onVisibility(): void {
    if (document.visibilityState === "hidden") {
      if (running) {
        gsap.ticker.remove(tick);
        running = false;
      }
    } else if (!running && !contextLost) {
      gsap.ticker.add(tick);
      running = true;
    }
  }
  document.addEventListener("visibilitychange", onVisibility);

  const io = new IntersectionObserver((entries) => {
    const visible = entries[0]?.isIntersecting ?? true;
    if (!visible && running) {
      gsap.ticker.remove(tick);
      running = false;
    } else if (visible && !running && !contextLost) {
      gsap.ticker.add(tick);
      running = true;
    }
  });
  io.observe(stage);

  function onContextLost(e: Event): void {
    e.preventDefault();
    contextLost = true;
    if (running) {
      gsap.ticker.remove(tick);
      running = false;
    }
  }
  function onContextRestored(): void {
    contextLost = false;
    rebuildForQuality();
    if (!running) {
      gsap.ticker.add(tick);
      running = true;
    }
  }
  canvas.addEventListener("webglcontextlost", onContextLost, false);
  canvas.addEventListener("webglcontextrestored", onContextRestored, false);

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  wireClickTransitions(hitSync, composerHandle, reducedMotion);

  function dispose(): void {
    gsap.ticker.remove(tick);
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", onVisibility);
    canvas!.removeEventListener("webglcontextlost", onContextLost, false);
    canvas!.removeEventListener("webglcontextrestored", onContextRestored, false);
    io.disconnect();
    scrollHandle.destroy();
    hitSync.dispose();
    hud?.remove();
    spaces.forEach((s) => s.dispose());
    nebula.dispose();
    dust.dispose();
    composerHandle?.dispose();
    renderer!.dispose();
    renderer!.forceContextLoss();
    document.documentElement.classList.remove("webgl-on");
  }

  window.addEventListener("pagehide", dispose, { once: true });
  return dispose;
}

function sectionRangeFor(space: Space, spaces: Space[]): [number, number] | null {
  const idx = spaces.indexOf(space);
  const ranges = [SECTIONS.hero, SECTIONS.about, SECTIONS.works, SECTIONS.blog, SECTIONS.contact];
  return ranges[idx] ?? null;
}

function wireHitSync(hitSync: HitSync, spaces: Space[]): void {
  const [hero, about, works, blog, contact] = spaces;

  const aboutCard = about.group.children.find(
    (c) =>
      c.type === "Mesh" &&
      (c as never as { geometry?: { type: string } }).geometry?.type === "BoxGeometry" &&
      c.position.x > 0,
  );
  if (aboutCard) hitSync.register("about-card", aboutCard, { w: 4.2, h: 1.3 });

  const worksCards = works.group.children.filter((c) => c.type === "Mesh");
  worksCards.forEach((mesh, i) => {
    const id = i < 3 ? `works-${i}` : "works-more";
    const size = i < 3 ? { w: 9.0, h: 5.4 } : { w: 7.0, h: 2.4 };
    const mat = (mesh as unknown as { material?: ShaderMaterial }).material;
    hitSync.register(id, mesh, size, mat?.uniforms?.uHover, (u, v) => {
      if (mat?.uniforms?.uMouseUv) mat.uniforms.uMouseUv.value.set(u, v);
    });
  });

  const blogCards = blog.group.children.filter((c) => c.type === "Mesh");
  blogCards.forEach((mesh, i) => {
    const mat = (mesh as unknown as { material?: ShaderMaterial }).material;
    hitSync.register(`blog-${i}`, mesh, { w: 5.2, h: 6.4 }, mat?.uniforms?.uHover, (u, v) => {
      if (mat?.uniforms?.uMouseUv) mat.uniforms.uMouseUv.value.set(u, v);
    });
  });

  // contact orbs は wire mesh 自体(半径 0.85 相当のヒットボックス)
  const orbs = contact.group.children.filter((c) => c.type === "Mesh");
  orbs.forEach((orb, i) => {
    hitSync.register(`contact-orb-${i}`, orb, { w: 1.9, h: 1.9 });
  });

  void hero;
}

function wireClickTransitions(
  hitSync: HitSync,
  composerHandle: ComposerHandle | null,
  reducedMotion: boolean,
): void {
  document.querySelectorAll<HTMLAnchorElement>("[data-gl-hit]").forEach((el) => {
    el.addEventListener("click", (e: MouseEvent) => {
      if (reducedMotion || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const href = el.getAttribute("href");
      if (!href) return;
      e.preventDefault();
      if (composerHandle) {
        gsap.to(composerHandle.bloom, { intensity: 3.0, duration: 0.35, ease: "power2.out" });
      }
      gsap.delayedCall(0.35, () => {
        location.href = href;
      });
    });
  });
  void hitSync;
}
