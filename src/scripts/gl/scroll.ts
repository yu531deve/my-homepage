import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getLenis, initSmoothScroll } from "../smooth-scroll";
import { DWELL_ANCHORS, dwellRemap } from "./camera-path";

export interface ScrollState {
  p: number;
  pTarget: number;
  velocity: number;
  mouse: { x: number; y: number };
  mouseTarget: { x: number; y: number };
  lastMouseMoveAt: number;
  coarse: boolean;
}

export interface ScrollHandle {
  state: ScrollState;
  update(): void;
  destroy(): void;
}

export function initScroll(parallax: boolean): ScrollHandle {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const coarse = matchMedia("(pointer: coarse)").matches;
  if (!coarse) initSmoothScroll();

  const state: ScrollState = {
    p: 0,
    pTarget: 0,
    velocity: 0,
    mouse: { x: 0, y: 0 },
    mouseTarget: { x: 0, y: 0 },
    lastMouseMoveAt: 0,
    coarse,
  };

  let lastP = 0;
  let lastTime = performance.now();

  // スクロールが止まったら最寄りのセクションへ吸着させる。
  // 「どこで止まればいいか分からない」を、実際に止めることで解消する(#20)。
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let snapTimer = 0;
  let snapping = false;

  function snapToNearest(): void {
    if (reducedMotion || snapping) return;
    const start = st.start;
    const end = st.end;
    const span = end - start;
    if (span <= 0) return;

    const progress = (window.scrollY - start) / span;
    let nearest = DWELL_ANCHORS[0];
    for (const a of DWELL_ANCHORS) {
      if (Math.abs(a - progress) < Math.abs(nearest - progress)) nearest = a;
    }
    // 既にほぼ合っているなら何もしない(微小な揺り戻しを防ぐ)
    if (Math.abs(nearest - progress) < 0.004) return;

    const targetY = start + nearest * span;
    snapping = true;
    const done = (): void => {
      snapping = false;
    };
    const lenis = getLenis();
    if (lenis) {
      lenis.scrollTo(targetY, { duration: 0.7, onComplete: done });
    } else {
      window.scrollTo({ top: targetY, behavior: "smooth" });
      window.setTimeout(done, 700);
    }
  }

  const st = ScrollTrigger.create({
    trigger: "#scroll-proxy",
    start: "top top",
    end: "bottom bottom",
    scrub: 1.2,
    onUpdate: (self) => {
      // セクション中心で滞留するカーブに変換してから使う
      state.pTarget = dwellRemap(self.progress);
      // 入力が止まってから一定時間後にスナップ
      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(snapToNearest, 220);
    },
  });

  function onMouseMove(e: MouseEvent): void {
    if (state.coarse) return;
    state.mouseTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
    state.mouseTarget.y = -((e.clientY / window.innerHeight) * 2 - 1);
    state.lastMouseMoveAt = performance.now();
  }
  if (parallax) window.addEventListener("mousemove", onMouseMove, { passive: true });

  function update(): void {
    state.p += (state.pTarget - state.p) * 0.12;

    state.mouse.x += (state.mouseTarget.x - state.mouse.x) * 0.045;
    state.mouse.y += (state.mouseTarget.y - state.mouse.y) * 0.045;

    const now = performance.now();
    const dt = Math.max(1, now - lastTime);
    state.velocity = ((state.p - lastP) / dt) * 1000;
    lastP = state.p;
    lastTime = now;
  }

  function destroy(): void {
    window.clearTimeout(snapTimer);
    st.kill();
    window.removeEventListener("mousemove", onMouseMove);
  }

  return { state, update, destroy };
}
