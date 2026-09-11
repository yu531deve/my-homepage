import {
  AdditiveBlending,
  Box3,
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  Points,
  ShaderMaterial,
  Vector3,
  type Group,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import { SPINE_BOTTOM, SPINE_TOP } from "../camera-path";

/**
 * 背骨モデル(glb)の表面から点をサンプリングし、虹彩色のポイントクラウドとして描く。
 * activetheory.net のスキャン点群表現に寄せるための描画。
 * モデルが無い場合はロードに失敗するだけで、呼び出し側のフォールバックが残る。
 */

export const SPINE_MODEL_URL = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/models/spine.glb`;

/** 点群の Z 位置。コンテンツ面(z=0)より奥に置き、カードと交差させない */
const POINTS_Z = -46;

/** カメラの上端・下端を通り過ぎても背骨が途切れないよう、範囲を上下に伸ばす */
const SPAN_MARGIN = 30;

const POINT_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
attribute float aSeed;
attribute vec3 aColor;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec3 p = position;
  // 点がわずかに漂う。スキャン点群のノイズ感を出す
  float drift = sin(uTime * 0.6 + aSeed * 6.283) * 0.06;
  p += normal * drift;

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  float dist = -mvPosition.z;

  vColor = aColor;
  // 遠景ほど淡く。黒基調を保つ
  vAlpha = 1.0 - clamp((dist - 60.0) / 140.0, 0.0, 0.9);

  gl_PointSize = uSize * uPixelRatio * (1.0 + aSeed * 0.8) * (60.0 / max(dist, 1.0));
  gl_Position = projectionMatrix * mvPosition;
}
`;

const POINT_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vColor;
varying float vAlpha;

void main() {
  // 丸く柔らかい点にする
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float soft = smoothstep(0.5, 0.05, d);
  gl_FragColor = vec4(vColor, soft * vAlpha);
}
`;

/** 虹彩パレット。サイトのエメラルドを主役に、青紫〜マゼンタを差す */
const PALETTE: Array<[number, number, number]> = [
  [0.04, 0.72, 0.5],
  [0.2, 0.85, 0.72],
  [0.35, 0.55, 0.95],
  [0.62, 0.35, 0.9],
  [0.9, 0.35, 0.7],
  [0.95, 0.75, 0.45],
];

function hash(n: number): number {
  const s = Math.sin(n) * 43758.5453;
  return s - Math.floor(s);
}

export interface SpinePointsHandle {
  points: Points;
  update(dt: number): void;
  dispose(): void;
}

/** glb を読み込み、表面から count 点をサンプリングして Points を返す */
export async function loadSpinePoints(
  count: number,
  pixelRatio: number,
): Promise<SpinePointsHandle> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(SPINE_MODEL_URL);

  // モデルには解剖ラベル(C1/T1/L1 などの文字メッシュ)と指示マーカーが含まれる。
  // 点群にすると背骨の中に読めない文字が浮くので、名前で除外する。
  const EXCLUDE = /label|marker|text/i;
  const isExcluded = (mesh: Mesh): boolean => {
    if (EXCLUDE.test(mesh.name)) return true;
    const material = mesh.material;
    const materials = Array.isArray(material) ? material : [material];
    return materials.some((m) => m && EXCLUDE.test(m.name ?? ""));
  };

  const meshes: Mesh[] = [];
  gltf.scene.traverse((obj: Object3D) => {
    const mesh = obj as Mesh;
    if (mesh.isMesh && mesh.geometry && !isExcluded(mesh)) meshes.push(mesh);
  });
  if (meshes.length === 0) throw new Error("spine.glb にメッシュが含まれていない");

  gltf.scene.updateMatrixWorld(true);

  // モデルが Z-up で作られている場合があるので、一番長い軸を Y に合わせる
  const probe = new Box3().setFromObject(gltf.scene);
  const probeSize = new Vector3();
  probe.getSize(probeSize);
  if (probeSize.z > probeSize.y) {
    gltf.scene.rotation.x = -Math.PI / 2;
    gltf.scene.updateMatrixWorld(true);
  }

  // モデル全体を背骨の高さ範囲に合わせて正規化する
  const box = new Box3().setFromObject(gltf.scene);
  const size = new Vector3();
  const center = new Vector3();
  box.getSize(size);
  box.getCenter(center);
  const targetHeight = SPINE_TOP - SPINE_BOTTOM + SPAN_MARGIN * 2;
  const scale = size.y > 0 ? targetHeight / size.y : 1;
  const midY = (SPINE_TOP + SPINE_BOTTOM) / 2;

  // メッシュごとの大きさに比例して点数を配分する。
  // 均等配分だと小さな椎骨に点が集中し、仙骨のような大きな部位が疎になる。
  const samplers = meshes.map((m) => new MeshSurfaceSampler(m).build());
  const weights = meshes.map((m) => m.geometry.getAttribute("position")?.count ?? 1);
  const weightTotal = weights.reduce((a, b) => a + b, 0) || 1;

  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const seeds: number[] = [];

  const pos = new Vector3();
  const nrm = new Vector3();

  samplers.forEach((sampler, mi) => {
    const mesh = meshes[mi];
    const meshCount = Math.max(1, Math.round((count * weights[mi]) / weightTotal));
    for (let i = 0; i < meshCount; i++) {
      sampler.sample(pos, nrm);
      pos.applyMatrix4(mesh.matrixWorld);
      // 中心を原点に寄せ、目標の高さへスケール
      pos.sub(center).multiplyScalar(scale);
      pos.y += midY;
      pos.z += POINTS_Z;

      positions.push(pos.x, pos.y, pos.z);
      normals.push(nrm.x, nrm.y, nrm.z);

      const seed = hash(i * 12.9898 + mi * 78.233);
      seeds.push(seed);

      // 高さ + ノイズでパレットを混ぜ、虹彩に見せる
      const h = (pos.y - SPINE_BOTTOM) / targetHeight;
      // 範囲外(SPINE_BOTTOM より下・SPINE_TOP より上)の点で h が負になるため、
      // JS の % が負値を返さないよう正規化してから使う。
      const t = (((h * 3.0 + seed * 0.9) % 1) + 1) % 1;
      const idx = Math.max(0, Math.min(PALETTE.length - 2, Math.floor(t * (PALETTE.length - 1))));
      const f = t * (PALETTE.length - 1) - idx;
      const a = PALETTE[idx];
      const b = PALETTE[idx + 1];
      // 大半の点は暗く落とし、一部だけ強く光らせて密度のコントラストを作る
      const gain = seed > 0.82 ? 1.6 : 0.42 + seed * 0.5;
      colors.push(
        (a[0] + (b[0] - a[0]) * f) * gain,
        (a[1] + (b[1] - a[1]) * f) * gain,
        (a[2] + (b[2] - a[2]) * f) * gain,
      );
    }
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.setAttribute("aColor", new Float32BufferAttribute(colors, 3));
  geometry.setAttribute("aSeed", new Float32BufferAttribute(seeds, 1));

  const material = new ShaderMaterial({
    vertexShader: POINT_VERTEX,
    fragmentShader: POINT_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: 0.5 },
      uPixelRatio: { value: pixelRatio },
    },
  });

  const points = new Points(geometry, material);
  points.frustumCulled = false;

  let t = 0;
  return {
    points,
    update(dt: number): void {
      t += dt;
      material.uniforms.uTime.value = t;
    },
    dispose(): void {
      geometry.dispose();
      material.dispose();
    },
  };
}

/** 呼び出し側で使う: 読み込めたら group に足し、失敗したら false */
export async function attachSpinePoints(
  group: Group,
  count: number,
  pixelRatio: number,
): Promise<SpinePointsHandle | null> {
  try {
    const handle = await loadSpinePoints(count, pixelRatio);
    group.add(handle.points);
    return handle;
  } catch (err) {
    // モデル未配置や読み込み失敗。プロシージャル背骨のまま続行するが、
    // 原因が分からないと詰められないのでログには残す。
    console.error("[spine] 点群の読み込みに失敗:", err);
    return null;
  }
}
