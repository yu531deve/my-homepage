import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { initSmoothScroll } from "../smooth-scroll";

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

  const st = ScrollTrigger.create({
    trigger: "#scroll-proxy",
    start: "top top",
    end: "bottom bottom",
    scrub: 1.2,
    onUpdate: (self) => {
      state.pTarget = self.progress;
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
    st.kill();
    window.removeEventListener("mousemove", onMouseMove);
  }

  return { state, update, destroy };
}
