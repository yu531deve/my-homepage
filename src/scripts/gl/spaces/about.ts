import { BoxGeometry, Group, Mesh, ShaderMaterial, Vector2, DoubleSide } from "three";
import { makeText, disposeText } from "../text";
import { CARD_VERTEX } from "../shaders/card.vert";
import { CARD_FRAGMENT } from "../shaders/card.frag";
import type { FrameCtx, Space } from "../types";

const FRESNEL_VERTEX = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vNormal = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const FRESNEL_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  float fresnel = pow(1.0 - clamp(dot(vNormal, vViewDir), 0.0, 1.0), 3.0);
  vec3 base = vec3(0.039, 0.039, 0.043);
  vec3 accent = vec3(0.063, 0.725, 0.506);
  vec3 col = mix(base, accent, fresnel) * 1.4;
  gl_FragColor = vec4(col, 0.9);
}
`;

const LINES = [
  { text: "Webアプリケーションを中心に、", y: 1.6, z: 2, speed: 0.85 },
  { text: "企画から実装まで一貫してつくるのが好きです。", y: 0.8, z: 1.4, speed: 1.0 },
  { text: "日々の学びや制作の記録もこのサイトに残しています。", y: 0.0, z: 0.8, speed: 1.15 },
];

export function createAboutSpace(): Space {
  const group = new Group();
  group.position.set(0, -6, -60);

  const heading = makeText({
    text: "About",
    font: "bold",
    fontSize: 7,
    position: [-2, 0, -6],
    outlineWidth: 0.015,
    fillOpacity: 0.06,
  });

  const monolithGeo = new BoxGeometry(5.5, 9, 0.15);
  const monolithMat = new ShaderMaterial({
    vertexShader: FRESNEL_VERTEX,
    fragmentShader: FRESNEL_FRAGMENT,
    transparent: true,
    side: DoubleSide,
  });
  const monolith = new Mesh(monolithGeo, monolithMat);
  monolith.position.set(-9, 0, -2);
  monolith.rotation.y = -0.35;

  const cardW = 4.2;
  const cardH = 1.3;
  const cardGeo = new BoxGeometry(cardW, cardH, 0.01).toNonIndexed();
  // Works と同じカードシェーダーを流用(平面として使う)
  const cardMat = new ShaderMaterial({
    vertexShader: CARD_VERTEX,
    fragmentShader: CARD_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uHover: { value: 0 },
      uMouseUv: { value: new Vector2(0.5, 0.5) },
      uAppear: { value: 1 },
      uShear: { value: 0 },
      uFade: { value: 1 },
      uEdgeStrength: { value: 0.5 },
    },
  });
  const card = new Mesh(cardGeo, cardMat);
  card.position.set(4.6, -1.4, 1.0);

  const cardTitle = makeText({
    text: "About",
    font: "bold",
    fontSize: 0.32,
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

  group.add(heading, monolith, card, ...lineTexts);

  function update(ctx: FrameCtx): void {
    monolith.rotation.y = -0.35 + ctx.localP * 0.5;

    lineTexts.forEach((text, i) => {
      const speed = LINES[i].speed;
      text.position.x = -1.2 + 2.4 * ctx.localP * speed;
    });

    cardMat.uniforms.uTime.value = ctx.t;
  }

  function dispose(): void {
    disposeText(heading);
    disposeText(cardTitle);
    lineTexts.forEach(disposeText);
    monolithGeo.dispose();
    monolithMat.dispose();
    cardGeo.dispose();
    cardMat.dispose();
  }

  return { group, update, dispose };
}
