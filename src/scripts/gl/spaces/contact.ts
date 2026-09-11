import { Group, IcosahedronGeometry, Mesh, MeshBasicMaterial } from "three";
import { STATION_Y } from "../camera-path";
import { makeText, disposeText } from "../text";
import type { FrameCtx, Space } from "../types";

const ORB_X = [-3.2, 0, 3.2];
const ORB_LABELS = ["GitHub", "X", "Contact"];

export function createContactSpace(): Space {
  const group = new Group();
  group.position.set(0, STATION_Y.contact, 0);

  const heading = makeText({
    text: "LET'S TALK",
    font: "bold",
    fontSize: 3.6,
    position: [0, 1.2, 0],
    color: 0x7ff0c6,
    outlineBlur: 0.6,
    fillOpacity: 0,
  });

  const orbs: Mesh[] = ORB_X.map((x, i) => {
    const wireGeo = new IcosahedronGeometry(0.85, 1);
    const wireMat = new MeshBasicMaterial({ color: 0x10b981, wireframe: true });
    const wire = new Mesh(wireGeo, wireMat);

    const solidGeo = new IcosahedronGeometry(0.6, 1);
    const solidMat = new MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.25 });
    const solid = new Mesh(solidGeo, solidMat);
    wire.add(solid);

    wire.position.set(x, -2.6, 1.5);

    const label = makeText({
      text: ORB_LABELS[i],
      fontSize: 0.3,
      position: [x, -4.0, 1.5],
    });
    group.add(wire, label);
    return wire;
  });

  group.add(heading);

  let revealDone = false;
  const startTime = performance.now();

  function update(ctx: FrameCtx): void {
    const revealElapsed = (performance.now() - startTime) / 1000;
    const reveal = Math.min(1, revealElapsed / 2.4);
    if (!revealDone) {
      // outlineBlur / fillOpacity はマテリアルuniform相当の更新で、
      // レイアウト変更を伴わないため sync() 不要(§7-4 の対象外)。
      heading.outlineBlur = 0.6 * (1 - reveal);
      heading.fillOpacity = reveal;
      if (reveal >= 1) revealDone = true;
    }

    heading.position.x = 0 + 0.03 * Math.sin(ctx.t * 0.9);
    heading.position.y = 1.2 + 0.02 * Math.sin(ctx.t * 1.31);

    orbs.forEach((orb) => {
      orb.rotation.y += ctx.dt * 0.3;
      orb.rotation.x += ctx.dt * 0.15;
    });

    if (ctx.p > 0.97) {
      group.rotation.y += 0.02 * ctx.dt;
    }
  }

  function dispose(): void {
    disposeText(heading);
    orbs.forEach((orb) => {
      orb.geometry.dispose();
      (orb.material as MeshBasicMaterial).dispose();
      orb.children.forEach((c) => {
        if (c instanceof Mesh) {
          c.geometry.dispose();
          (c.material as MeshBasicMaterial).dispose();
        }
      });
    });
  }

  return { group, update, dispose };
}
