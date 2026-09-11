import type { Vector3 } from "three";

/**
 * v4: カメラワークを「背骨に沿って上から下へ降りるだけ」に単純化した。
 * 以前の 3D 空間を飛び回るパスは、現在地が分からず可読性が上がらなかったため、
 * 動きは Y 軸方向の下降のみに固定し、各セクションは背骨沿いの停留点として置く。
 */

export interface Sections {
  hero: [number, number];
  about: [number, number];
  works: [number, number];
  blog: [number, number];
  contact: [number, number];
}

export const SECTIONS: Sections = {
  hero: [0.0, 0.16],
  about: [0.14, 0.36],
  works: [0.34, 0.68],
  blog: [0.66, 0.86],
  contact: [0.84, 1.0],
};

/** 各セクションが背骨のどの高さに置かれているか(ワールド Y) */
export const STATION_Y = {
  hero: 0,
  about: -58,
  works: -116,
  blog: -174,
  contact: -232,
} as const;

/** 背骨の全長(Y): 上端から下端まで */
export const SPINE_TOP = 24;

/** カメラの開始高さ。最初の一画面で Hero が正面に来る位置 */
const CAM_START_Y = STATION_Y.hero + 9;
export const SPINE_BOTTOM = STATION_Y.contact - 26;

/** カメラと背骨(コンテンツ面)の距離 */
export const CAM_DISTANCE = 42;

/** 視線をわずかに下向きにして「降りている」感じを出す量 */
const LOOK_DROP = 4;

/** 固定画角。速度による変調は engine 側で最小限だけ足す */
export const BASE_FOV = 55;

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

const SECTION_KEYS = ["hero", "about", "works", "blog", "contact"] as const;

/** 各セクションの停留位置(進行度) */
export const DWELL_ANCHORS = SECTION_KEYS.map((k) => {
  const [a, b] = SECTIONS[k];
  return (a + b) / 2;
});

const STATIONS = SECTION_KEYS.map((k) => STATION_Y[k]);

/** アンカー前後この幅ぶんは進行度を固定し、留まる時間をつくる */
const DWELL_HALF_WIDTH = 0.045;

/**
 * 生のスクロール進行度を、セクション中心で滞留するカーブに変換する。
 * 出力は 0..1 で単調増加。
 */
export function dwellRemap(p: number): number {
  const x = Math.min(1, Math.max(0, p));
  const h = DWELL_HALF_WIDTH;

  for (let i = 0; i < DWELL_ANCHORS.length; i++) {
    const a = DWELL_ANCHORS[i];
    if (x >= a - h && x <= a + h) return a;
    if (x < a - h) {
      const prevEnd = i === 0 ? 0 : DWELL_ANCHORS[i - 1] + h;
      const outFrom = i === 0 ? 0 : DWELL_ANCHORS[i - 1];
      const t = (x - prevEnd) / (a - h - prevEnd || 1);
      return outFrom + (a - outFrom) * easeInOutSine(Math.min(1, Math.max(0, t)));
    }
  }

  const last = DWELL_ANCHORS[DWELL_ANCHORS.length - 1];
  const t = (x - (last + h)) / (1 - (last + h) || 1);
  return last + (1 - last) * easeInOutSine(Math.min(1, Math.max(0, t)));
}

export function localP(p: number, range: [number, number]): number {
  const [a, b] = range;
  return Math.min(1, Math.max(0, (p - a) / (b - a)));
}

/** 進行度 -> カメラの高さ。停留点をちょうど通るよう区分線形で補間する */
export function cameraY(p: number): number {
  const x = Math.min(1, Math.max(0, p));

  if (x <= DWELL_ANCHORS[0]) {
    const t = DWELL_ANCHORS[0] > 0 ? x / DWELL_ANCHORS[0] : 1;
    return CAM_START_Y + (STATIONS[0] - CAM_START_Y) * t;
  }

  for (let i = 0; i < DWELL_ANCHORS.length - 1; i++) {
    const a = DWELL_ANCHORS[i];
    const b = DWELL_ANCHORS[i + 1];
    if (x <= b) {
      const t = (x - a) / (b - a);
      return STATIONS[i] + (STATIONS[i + 1] - STATIONS[i]) * t;
    }
  }

  const lastAnchor = DWELL_ANCHORS[DWELL_ANCHORS.length - 1];
  const lastY = STATIONS[STATIONS.length - 1];
  const t = (x - lastAnchor) / (1 - lastAnchor || 1);
  return lastY + (SPINE_BOTTOM - lastY) * t;
}

export class CameraPath {
  private lastFov = -1;

  resolve(p: number, outPos: Vector3, outLook: Vector3): { fov: number; roll: number } {
    const y = cameraY(p);
    outPos.set(0, y, CAM_DISTANCE);
    outLook.set(0, y - LOOK_DROP, 0);
    return { fov: BASE_FOV, roll: 0 };
  }

  shouldUpdateProjection(fov: number): boolean {
    if (Math.abs(fov - this.lastFov) >= 0.01) {
      this.lastFov = fov;
      return true;
    }
    return false;
  }
}
