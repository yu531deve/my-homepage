import { Camera, Object3D, Vector3 } from "three";
import gsap from "gsap";

interface HitTarget {
  el: HTMLAnchorElement;
  object: Object3D;
  hoverUniform?: { value: number };
  onMouseUv?: (u: number, v: number) => void;
}

const tmp = new Vector3();
const camWorld = new Vector3();
const objWorld = new Vector3();
const corners = [
  new Vector3(-0.5, -0.5, 0),
  new Vector3(0.5, -0.5, 0),
  new Vector3(0.5, 0.5, 0),
  new Vector3(-0.5, 0.5, 0),
];

export class HitSync {
  private targets: HitTarget[] = [];
  private camera: Camera;
  private frame = 0;
  private handlers: Array<() => void> = [];

  constructor(camera: Camera) {
    this.camera = camera;
  }

  register(
    hitId: string,
    object: Object3D,
    size: { w: number; h: number },
    hoverUniform?: { value: number },
    onMouseUv?: (u: number, v: number) => void,
  ): void {
    const el = document.querySelector<HTMLAnchorElement>(`[data-gl-hit="${hitId}"]`);
    if (!el) return;
    const target: HitTarget = { el, object, hoverUniform, onMouseUv };
    this.targets.push(target);

    const onEnter = (): void => {
      if (hoverUniform) gsap.to(hoverUniform, { value: 1, duration: 0.45, ease: "power2.out" });
    };
    const onLeave = (): void => {
      if (hoverUniform) gsap.to(hoverUniform, { value: 0, duration: 0.45, ease: "power2.out" });
    };
    const onMove = (e: MouseEvent): void => {
      if (!onMouseUv) return;
      const rect = el.getBoundingClientRect();
      const u = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0.5;
      const v = rect.height > 0 ? 1 - (e.clientY - rect.top) / rect.height : 0.5;
      onMouseUv(u, v);
    };
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("focus", onEnter);
    el.addEventListener("blur", onLeave);
    el.addEventListener("mousemove", onMove);
    this.handlers.push(() => {
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("focus", onEnter);
      el.removeEventListener("blur", onLeave);
      el.removeEventListener("mousemove", onMove);
    });

    (target as unknown as { size: typeof size }).size = size;
  }

  // 3 フレームに 1 回のみ座標同期(§6.2-2)
  update(): void {
    this.frame++;
    if (this.frame % 3 !== 0) return;
    for (const target of this.targets) {
      this.syncOne(target);
    }
  }

  private syncOne(target: HitTarget): void {
    const size = (target as unknown as { size: { w: number; h: number } }).size;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let behind = false;
    let minZ = Infinity;

    for (const c of corners) {
      tmp.copy(c);
      tmp.x *= size.w;
      tmp.y *= size.h;
      target.object.localToWorld(tmp);
      tmp.project(this.camera);
      minZ = Math.min(minZ, tmp.z);
      if (tmp.z > 1) behind = true;
      const x = (tmp.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-tmp.y * 0.5 + 0.5) * window.innerHeight;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    this.camera.getWorldPosition(camWorld);
    target.object.getWorldPosition(objWorld);
    const dist = camWorld.distanceTo(objWorld);

    if (behind || dist > 90) {
      target.el.style.pointerEvents = "none";
      target.el.style.visibility = "hidden";
      target.el.classList.remove("gl-hit--synced");
      return;
    }

    target.el.style.visibility = "visible";
    target.el.style.pointerEvents = "auto";
    target.el.classList.add("gl-hit--synced");
    target.el.style.width = `${Math.max(0, maxX - minX)}px`;
    target.el.style.height = `${Math.max(0, maxY - minY)}px`;
    target.el.style.transform = `translate(${minX}px, ${minY}px)`;
  }

  dispose(): void {
    this.handlers.forEach((h) => h());
    this.handlers = [];
    this.targets = [];
  }
}

// 日本語 DOM オーバーレイテキストの同期(毎フレーム、transform のみ更新)
export class OverlaySync {
  private anchors: Array<{ el: HTMLElement; object: Object3D }> = [];
  private camera: Camera;

  constructor(camera: Camera) {
    this.camera = camera;
  }

  register(anchorId: string, object: Object3D): void {
    const el = document.querySelector<HTMLElement>(`[data-gl-anchor="${anchorId}"][data-jp]`);
    if (!el) return;
    this.anchors.push({ el, object });
  }

  update(): void {
    for (const { el, object } of this.anchors) {
      tmp.set(0, 0, 0);
      object.getWorldPosition(tmp);
      tmp.project(this.camera);
      if (tmp.z > 1) {
        el.style.opacity = "0";
        continue;
      }
      const x = (tmp.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-tmp.y * 0.5 + 0.5) * window.innerHeight;
      el.style.opacity = "1";
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    }
  }

  dispose(): void {
    this.anchors = [];
  }
}
