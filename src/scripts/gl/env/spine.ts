import {
  AdditiveBlending,
  BufferGeometry,
  CatmullRomCurve3,
  Float32BufferAttribute,
  Group,
  BoxGeometry,
  CylinderGeometry,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  Matrix4,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from "three";
import { SPINE_BOTTOM, SPINE_TOP } from "../camera-path";
import { attachSpinePoints, type SpinePointsHandle } from "./spine-points";

/**
 * サイトの軸となる「背骨」。椎骨を模したリングを Y 軸に沿って積み、
 * 中心を神経のように光る線が貫く。カメラはこの背骨に沿って下降する。
 */

const VERTEBRA_SPACING = 3.6;
/** 背骨の Z 位置。コンテンツより十分奥に置き、背景の軸として読ませる */
const SPINE_Z = -38;
/** 緩やかな S 字カーブの振れ幅(コンテンツを横切らない程度に抑える) */
const SWAY_X = 1.3;
const SWAY_Z = 2.4;

const VERTEBRA_VERTEX = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewDir;
varying float vDepth;
void main() {
  #ifdef USE_INSTANCING
    vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  #else
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
  #endif
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  vDepth = length(cameraPosition - worldPos.xyz);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const VERTEBRA_FRAGMENT = /* glsl */ `
precision highp float;
uniform float uOpacity;
varying vec3 vNormal;
varying vec3 vViewDir;
varying float vDepth;
void main() {
  float fresnel = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0), 2.2);
  vec3 base = vec3(0.055, 0.058, 0.066);
  vec3 accent = vec3(0.063, 0.725, 0.506);
  vec3 col = mix(base, accent, fresnel * 0.85);
  // 遠景ほど落として、黒基調を保ったまま奥行きを出す
  float fade = 1.0 - clamp((vDepth - 75.0) / 110.0, 0.0, 0.85);
  gl_FragColor = vec4(col * fade, uOpacity * fade);
}
`;

export interface SpineHandle {
  group: Group;
  /** 背骨の中心線。セクション配置の基準に使う */
  centerAt(y: number): Vector3;
  update(dt: number, camY: number): void;
  dispose(): void;
}

/** 高さ y における背骨中心のずれ(緩い S 字) */
function swayAt(y: number): { x: number; z: number } {
  const t = y / 60;
  return {
    x: Math.sin(t) * SWAY_X,
    z: SPINE_Z + Math.cos(t * 0.7) * SWAY_Z,
  };
}

export function createSpine(quality: "low" | "mid" | "high" = "high"): SpineHandle {
  const group = new Group();

  // spine.glb があれば点群表現に差し替える。無ければ以下のプロシージャル背骨のまま。
  const pointCount = quality === "low" ? 90000 : quality === "mid" ? 260000 : 620000;
  let pointsHandle: SpinePointsHandle | null = null;

  const count = Math.floor((SPINE_TOP - SPINE_BOTTOM) / VERTEBRA_SPACING);
  const segments = quality === "low" ? 8 : quality === "mid" ? 12 : 20;

  // 椎骨 = 椎体(平たい円柱)+ 棘突起(後方に伸びる楔)の 2 パーツ。
  // それぞれ 1 本の InstancedMesh にまとめる。
  const bodyGeo = new CylinderGeometry(3.1, 3.1, 1.1, segments, 1, true);
  const processGeo = new BoxGeometry(1.1, 0.7, 4.2);
  const mat = new ShaderMaterial({
    vertexShader: VERTEBRA_VERTEX,
    fragmentShader: VERTEBRA_FRAGMENT,
    transparent: true,
    depthWrite: false,
    uniforms: { uOpacity: { value: 0.9 } },
  });
  const bodies = new InstancedMesh(bodyGeo, mat, count);
  const processes = new InstancedMesh(processGeo, mat, count);
  bodies.frustumCulled = false;
  processes.frustumCulled = false;

  const matrix = new Matrix4();
  const pos = new Vector3();
  const quat = new Quaternion();
  const scale = new Vector3();
  const axisY = new Vector3(0, 1, 0);

  const points: Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const y = SPINE_TOP - i * VERTEBRA_SPACING;
    const { x, z } = swayAt(y);
    pos.set(x, y, z);
    points.push(pos.clone());

    // 世界の Y 軸まわりにだけ少しずつ捻る(椎体は常に水平に保つ)
    quat.setFromAxisAngle(axisY, i * 0.05);

    // 下に行くほど椎骨が大きくなる(腰椎に向かって太る)
    const s = 0.72 + (i / count) * 0.55;

    scale.set(s, s, s);
    matrix.compose(pos, quat, scale);
    bodies.setMatrixAt(i, matrix);

    // 棘突起は椎体の後ろ(奥)へ突き出す
    pos.z -= 2.6 * s;
    matrix.compose(pos, quat, scale);
    processes.setMatrixAt(i, matrix);
    pos.z += 2.6 * s;
  }
  bodies.instanceMatrix.needsUpdate = true;
  processes.instanceMatrix.needsUpdate = true;
  group.add(bodies, processes);

  // 中心を貫く神経(発光ライン)
  const curve = new CatmullRomCurve3(points);
  const cordPoints = curve.getPoints(count * 3);
  const cordGeo = new BufferGeometry();
  cordGeo.setAttribute(
    "position",
    new Float32BufferAttribute(
      cordPoints.flatMap((v) => [v.x, v.y, v.z]),
      3,
    ),
  );
  const cordMat = new LineBasicMaterial({
    color: 0x34d399,
    transparent: true,
    opacity: 0.5,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const cord = new Line(cordGeo, cordMat);
  cord.frustumCulled = false;
  group.add(cord);

  function centerAt(y: number): Vector3 {
    const { x, z } = swayAt(y);
    return new Vector3(x, y, z);
  }

  const pixelRatio = Math.min(2, typeof window === "undefined" ? 1 : window.devicePixelRatio);
  void attachSpinePoints(group, pointCount, pixelRatio).then((handle) => {
    if (!handle) return;
    pointsHandle = handle;
    // 点群が乗ったらプリミティブ版は消す
    bodies.visible = false;
    processes.visible = false;
    cord.visible = false;
  });

  let t = 0;
  function update(dt: number, camY: number): void {
    pointsHandle?.update(dt);
    t += dt;
    // カメラ位置周辺だけ神経の輝きを強める(現在地の手がかり)
    cordMat.opacity = 0.42 + Math.sin(t * 1.6) * 0.08;
    mat.uniforms.uOpacity.value = 0.9;
    void camY;
  }

  function dispose(): void {
    pointsHandle?.dispose();
    bodyGeo.dispose();
    processGeo.dispose();
    mat.dispose();
    cordGeo.dispose();
    cordMat.dispose();
    bodies.dispose();
    processes.dispose();
  }

  return { group, centerAt, update, dispose };
}
