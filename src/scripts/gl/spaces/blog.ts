import { Group, Mesh, ShaderMaterial } from "three";
import { makeText, disposeText } from "../text";
import { createCardMaterial, createCardGeometry } from "../shaders/card";
import type { FrameCtx, Space } from "../types";

export interface BlogItem {
  id: string;
  title: string;
  date: string;
}

const XS = [-6.4, 0, 6.4];
const ZS = [0, -1.2, 0];

export function createBlogSpace(items: BlogItem[]): Space {
  const group = new Group();
  group.position.set(0, 8, -260);

  const heading = makeText({
    text: "Blog",
    font: "bold",
    fontSize: 6.5,
    position: [0, 3.2, 4],
    fillOpacity: 0.9,
  });

  const cards: Mesh[] = [];
  const disposers: Array<() => void> = [];

  items.slice(0, 3).forEach((item, i) => {
    const geo = createCardGeometry(5.2, 6.4);
    const mat = createCardMaterial(0.7);
    const mesh = new Mesh(geo, mat);
    mesh.position.set(XS[i] ?? 0, -4.0, ZS[i] ?? 0);
    mesh.rotation.x = -0.9;

    const date = makeText({
      text: item.date,
      fontSize: 0.26,
      color: 0x71717a,
      anchorX: "left",
      position: [-2.2, 2.6, 0.06],
    });
    const title = makeText({
      text: item.title,
      font: "bold",
      fontSize: 0.42,
      anchorX: "left",
      maxWidth: 4.4,
      position: [-2.2, 2.1, 0.06],
    });
    mesh.add(date, title);
    disposers.push(
      () => disposeText(date),
      () => disposeText(title),
    );

    cards.push(mesh);
    group.add(mesh);
  });

  const more = makeText({
    text: "View all posts",
    fontSize: 0.3,
    color: 0x34d399,
    position: [0, -6.0, 2],
  });

  group.add(heading, more);

  function update(ctx: FrameCtx): void {
    cards.forEach((mesh, i) => {
      const stagger = i * 0.08;
      const local = Math.min(1, Math.max(0, ctx.localP - stagger));
      mesh.rotation.x = -0.9 + local * 0.68;
      mesh.position.y = -4.0 + local * 2.4;
      const mat = mesh.material as ShaderMaterial;
      mat.uniforms.uTime.value = ctx.t;
      mat.uniforms.uAppear.value = local;
      mat.uniforms.uFade.value = 0.3 + 0.7 * local;
    });
  }

  function dispose(): void {
    disposeText(heading);
    disposeText(more);
    disposers.forEach((d) => d());
    cards.forEach((mesh) => {
      mesh.geometry.dispose();
      (mesh.material as ShaderMaterial).dispose();
    });
  }

  return { group, update, dispose };
}
