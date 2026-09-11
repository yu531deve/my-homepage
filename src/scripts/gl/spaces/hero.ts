import { AdditiveBlending, Group, Mesh, MeshBasicMaterial, Object3D, TorusGeometry } from "three";
import gsap from "gsap";
import type { Text } from "troika-three-text";
import { makeText, disposeText } from "../text";
import { STATION_Y } from "../camera-path";
import type { FrameCtx, Space } from "../types";

const RING_DEFS = [
  { r: 7, z: -3, speed: 0.06, opacity: 0.35 },
  { r: 11, z: -8, speed: 0.04, opacity: 0.22 },
  { r: 16, z: -15, speed: -0.03, opacity: 0.14 },
];

export function createHeroSpace(): Space {
  const group = new Group();
  group.position.set(0, STATION_Y.hero, 0);

  // 重ね置きはやめ、一語だけを置く
  const title = makeText({
    text: "PORTFOLIO",
    font: "bold",
    fontSize: 3.4,
    letterSpacing: -0.03,
    position: [0, 0.6, 0],
  });

  const scroll = makeText({
    text: "SCROLL",
    fontSize: 0.28,
    letterSpacing: 0.3,
    position: [0, -6.2, 2],
    color: 0xa1a1aa,
  });

  const rings: Mesh[] = RING_DEFS.map((def) => {
    const geo = new TorusGeometry(def.r, 0.012, 8, 128);
    const mat = new MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: def.opacity,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new Mesh(geo, mat);
    mesh.position.z = def.z;
    mesh.scale.setScalar(1.6);
    group.add(mesh);
    return mesh;
  });

  // 日本語一行(DOM オーバーレイ)の追従先
  const subAnchor = new Object3D();
  subAnchor.position.set(0, -3.4, 1);
  group.add(title, scroll, subAnchor);

  const revealTargets = [title, scroll] as const;
  revealTargets.forEach((text, i) => {
    const startY = text.position.y;
    text.position.y = startY + 0.6;
    (text.material as MeshBasicMaterial).opacity = 0;
    text.material.transparent = true;
    gsap.to(text.position, {
      y: startY,
      duration: 1.1,
      delay: i * 0.05,
      ease: "power3.out",
    });
    gsap.to(text.material, {
      opacity: 1,
      duration: 1.1,
      delay: i * 0.05,
      ease: "power3.out",
    });
  });
  rings.forEach((ring, i) => {
    gsap.to(ring.scale, { x: 1, y: 1, z: 1, duration: 1.3, delay: i * 0.05, ease: "power3.out" });
  });

  function update(ctx: FrameCtx): void {
    rings.forEach((ring, i) => {
      ring.rotation.z += ctx.dt * RING_DEFS[i].speed;
      ring.rotation.x = 0.3 * Math.sin(ctx.t * 0.2 + i);
    });

    scroll.position.y = -6.2 + Math.sin(ctx.t * 2) * 0.12;
    const scrollOpacity = ctx.localP > 0.25 ? Math.max(0, 1 - (ctx.localP - 0.25) * 4) : 1;
    (scroll.material as MeshBasicMaterial).opacity = scrollOpacity;
  }

  function dispose(): void {
    disposeText(title as unknown as Text);
    disposeText(scroll as unknown as Text);
    rings.forEach((r) => {
      r.geometry.dispose();
      (r.material as MeshBasicMaterial).dispose();
    });
  }

  return { group, anchors: { "hero-sub": subAnchor }, update, dispose };
}
