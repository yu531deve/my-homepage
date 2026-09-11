import { STATION_Y } from "../camera-path";
import { Group, Mesh } from "three";
import { makeText, disposeText } from "../text";
import { createCardMaterial, createCardGeometry } from "../shaders/card";
import type { FrameCtx, Space } from "../types";

export interface WorkItem {
  id: string;
  title: string;
  summary: string;
  tech: string[];
}

const POSITIONS: Array<{ pos: [number, number, number]; rotY: number; w: number; h: number }> = [
  // v4: 背骨に沿って左右交互に吊り下げる
  { pos: [-11.0, 15.0, 0], rotY: 0.3, w: 13.0, h: 7.8 },
  { pos: [11.0, 2.5, 0], rotY: -0.3, w: 13.0, h: 7.8 },
  { pos: [-11.0, -10.0, 0], rotY: 0.3, w: 13.0, h: 7.8 },
  { pos: [0.0, -23.0, 0], rotY: 0, w: 10.0, h: 3.4 },
];

const SUB_RANGES: Array<[number, number]> = [
  [0.05, 0.35],
  [0.25, 0.55],
  [0.45, 0.75],
  [0.68, 1.0],
];

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function createWorksSpace(works: WorkItem[]): Space {
  const group = new Group();
  group.position.set(0, STATION_Y.works, 0);

  const heading = makeText({
    text: "WORKS",
    font: "bold",
    fontSize: 13,
    position: [0, 25, -34],
    outlineWidth: 0.02,
    fillOpacity: 0,
    outlineColor: 0xf4f4f5,
  });
  heading.material.transparent = true;
  heading.material.opacity = 0.07;

  const cards: Mesh[] = [];
  const disposers: Array<() => void> = [];

  const items = [
    ...works.slice(0, 3).map((w, i) => ({
      title: w.title,
      summary: w.summary,
      tech: w.tech.join(" · "),
      index: String(i + 1).padStart(2, "0"),
    })),
    { title: "View all works", summary: "", tech: "", index: "" },
  ];

  items.forEach((item, i) => {
    const def = POSITIONS[i];
    const geo = createCardGeometry(def.w, def.h);
    const mat = createCardMaterial(1);
    const mesh = new Mesh(geo, mat);
    mesh.userData.flat = true;
    mesh.position.set(...def.pos);
    mesh.rotation.y = def.rotY;

    const title = makeText({
      text: item.title,
      font: "bold",
      fontSize: 0.9,
      anchorX: "left",
      position: [-def.w / 2 + 0.5, def.h / 2 - 0.9, 0.06],
    });
    mesh.add(title);

    if (item.summary) {
      const summary = makeText({
        text: item.summary.length > 60 ? "" : item.summary,
        fontSize: 0.44,
        color: 0xa1a1aa,
        anchorX: "left",
        maxWidth: def.w - 1.0,
        position: [-def.w / 2 + 0.5, def.h / 2 - 2.0, 0.06],
      });
      // 日本語 summary は WebGL に載せない(§7)。空にしてダミー扱い。
      summary.text = "";
      summary.sync();
      mesh.add(summary);
      disposers.push(() => disposeText(summary));
    }

    if (item.tech) {
      const tech = makeText({
        text: item.tech,
        fontSize: 0.34,
        color: 0x34d399,
        anchorX: "left",
        anchorY: "bottom",
        position: [-def.w / 2 + 0.5, -def.h / 2 + 0.6, 0.06],
      });
      mesh.add(tech);
      disposers.push(() => disposeText(tech));
    }

    if (item.index) {
      const idx = makeText({
        text: item.index,
        font: "bold",
        fontSize: 3.4,
        anchorX: "left",
        position: [-def.w / 2 + 0.8, -def.h / 2 + 1.4, 0.03],
      });
      idx.material.transparent = true;
      idx.material.opacity = 0.14;
      mesh.add(idx);
      disposers.push(() => disposeText(idx));
    }

    disposers.push(() => disposeText(title));
    cards.push(mesh);
    group.add(mesh);
  });

  group.add(heading);

  function update(ctx: FrameCtx): void {
    cards.forEach((mesh, i) => {
      const [a, b] = SUB_RANGES[i];
      const sub = Math.min(1, Math.max(0, (ctx.p - a) / (b - a || 1)));
      const appear = easeOutCubic(Math.min(1, sub / 0.4));
      const mat = mesh.material as import("three").ShaderMaterial;
      mat.uniforms.uAppear.value = appear;
      mat.uniforms.uTime.value = ctx.t;
      mat.uniforms.uShear.value = ctx.velocity * 0.35;
      // #17: 以前は 0.4 の下限があり、区間外(sub=0 で appear=0)でも
      // カードが常に薄く描画され、uAppear=0 の破片形状(vert シェーダー参照)
      // が Hero などから遠景の緑色グリッチとして映り込んでいた。
      // appear=0 で完全不可視にする。
      mat.uniforms.uFade.value = appear;
      mesh.visible = appear > 0.001;

      mesh.rotation.y = POSITIONS[i].rotY + 0.03 * Math.sin(ctx.t * 0.4 + i);
      mesh.position.y = POSITIONS[i].pos[1] + 0.12 * Math.sin(ctx.t * 0.32 + i * 1.7);
    });
  }

  function dispose(): void {
    disposeText(heading);
    disposers.forEach((d) => d());
    cards.forEach((mesh) => {
      mesh.geometry.dispose();
      (mesh.material as import("three").ShaderMaterial).dispose();
    });
  }

  return { group, update, dispose };
}
