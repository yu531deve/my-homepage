import { BoxGeometry, Group, Mesh, ShaderMaterial, Vector2, FrontSide } from "three";
import type { Object3D } from "three";
import { makeText, disposeText } from "../text";
import { CARD_VERTEX } from "../shaders/card.vert";
import { CARD_FRAGMENT } from "../shaders/card.frag";
import { SECTIONS, STATION_Y } from "../camera-path";
import type { FrameCtx, Space } from "../types";

const LINES = [
  { text: "Webアプリケーションを中心に、", y: 1.6, z: 2, speed: 0.85 },
  { text: "企画から実装まで一貫してつくるのが好きです。", y: 0.8, z: 1.4, speed: 1.0 },
  { text: "日々の学びや制作の記録もこのサイトに残しています。", y: 0.0, z: 0.8, speed: 1.15 },
];

export function createAboutSpace(): Space {
  const group = new Group();
  group.position.set(0, STATION_Y.about, 0);

  const heading = makeText({
    text: "About",
    font: "bold",
    fontSize: 7,
    position: [0, 9.5, -10],
    outlineWidth: 0.015,
    fillOpacity: 0.06,
  });

  const cardW = 6.2;
  const cardH = 1.9;
  const cardGeo = new BoxGeometry(cardW, cardH, 0.01).toNonIndexed();
  // Works と同じカードシェーダーを流用(平面として使う)
  const cardMat = new ShaderMaterial({
    vertexShader: CARD_VERTEX,
    fragmentShader: CARD_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: FrontSide,
    uniforms: {
      uTime: { value: 0 },
      uHover: { value: 0 },
      uMouseUv: { value: new Vector2(0.5, 0.5) },
      uAppear: { value: 0 },
      uShear: { value: 0 },
      uFade: { value: 0 },
      uEdgeStrength: { value: 0.5 },
    },
  });
  const card = new Mesh(cardGeo, cardMat);
  card.userData.flat = true;
  card.position.set(4.6, -1.4, 1.0);

  const cardTitle = makeText({
    text: "About",
    font: "bold",
    fontSize: 0.46,
    anchorX: "left",
    position: [-cardW / 2 + 0.4, 0.2, 0.02],
  });
  card.add(cardTitle);

  const lineTexts = LINES.map((line, i) =>
    makeText({
      text: line.text,
      fontSize: 0.001, // 日本語は Inter に無いため WebGL には描画しない(§7)。ダミーで不可視。
      anchorX: "left",
      position: [4, line.y, line.z],
      color: 0x000000,
      fillOpacity: 0,
    }),
  );

  group.add(heading, card, ...lineTexts);

  // #17: このシーンオブジェクトは常時 group に存在するため、About 区間外
  // (例えば Hero p=0 や Works p=0.45)でもカメラの視錐台に入ると緑色の破片
  // として映り込んでいた。About 区間からの距離に応じてフェードし、区間外
  // では完全に不可視(visible=false)にする。
  const [aboutStart, aboutEnd] = SECTIONS.about;
  const FADE_MARGIN = 0.04;
  card.visible = false;

  function update(ctx: FrameCtx): void {
    lineTexts.forEach((text, i) => {
      const speed = LINES[i].speed;
      text.position.x = -1.2 + 2.4 * ctx.localP * speed;
    });

    cardMat.uniforms.uTime.value = ctx.t;

    let appear = 0;
    if (ctx.p >= aboutStart - FADE_MARGIN && ctx.p <= aboutEnd + FADE_MARGIN) {
      if (ctx.p < aboutStart) {
        appear = (ctx.p - (aboutStart - FADE_MARGIN)) / FADE_MARGIN;
      } else if (ctx.p > aboutEnd) {
        appear = 1 - (ctx.p - aboutEnd) / FADE_MARGIN;
      } else {
        appear = 1;
      }
    }
    appear = Math.min(1, Math.max(0, appear));

    cardMat.uniforms.uAppear.value = appear;
    cardMat.uniforms.uFade.value = appear;
    card.visible = appear > 0.001;
  }

  function dispose(): void {
    disposeText(heading);
    disposeText(cardTitle);
    lineTexts.forEach(disposeText);
    cardGeo.dispose();
    cardMat.dispose();
  }

  const anchors: Record<string, Object3D> = {
    "about-card-title": card,
  };
  lineTexts.forEach((t, i) => {
    anchors[`about-line-${i}`] = t;
  });

  return { group, anchors, update, dispose };
}
