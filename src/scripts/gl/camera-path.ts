import { CatmullRomCurve3, Vector3 } from "three";

export interface CamKey {
  p: number;
  pos: [number, number, number];
  look: [number, number, number];
  fov: number;
  roll: number;
}

export const KEYS: CamKey[] = [
  { p: 0.0, pos: [0, 0, 14], look: [0, 0, 0], fov: 50, roll: 0 },
  { p: 0.11, pos: [0, 0, 2], look: [0, 0, -20], fov: 62, roll: 0 },
  { p: 0.18, pos: [4, -3, -24], look: [0, -5, -55], fov: 55, roll: 0.05 },
  { p: 0.3, pos: [0, -6, -52], look: [-3, -6, -62], fov: 50, roll: 0 },
  { p: 0.38, pos: [-8, -4, -78], look: [0, -2, -110], fov: 58, roll: -0.09 },
  { p: 0.47, pos: [-6, 1, -128], look: [3, 0, -152], fov: 52, roll: -0.04 },
  { p: 0.55, pos: [3, 0, -148], look: [3, 0, -168], fov: 46, roll: 0 },
  { p: 0.63, pos: [-3, 1, -172], look: [-2, 2, -196], fov: 48, roll: 0.06 },
  { p: 0.72, pos: [0, 6, -232], look: [0, 8, -262], fov: 54, roll: 0 },
  { p: 0.8, pos: [0, 8, -256], look: [0, 8, -276], fov: 48, roll: 0 },
  { p: 0.9, pos: [0, 3, -310], look: [0, 0, -344], fov: 56, roll: -0.03 },
  { p: 1.0, pos: [0, 0, -332], look: [0, 0, -352], fov: 42, roll: 0 },
];

// LOW 品質: 偶数番号だけを使う簡略パス(roll/fov変調なし、§8)。
export const KEYS_SIMPLIFIED: CamKey[] = KEYS.filter((_, i) => i % 2 === 0).map((k) => ({
  ...k,
  roll: 0,
  fov: 52,
}));

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

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

export function localP(p: number, range: [number, number]): number {
  const [a, b] = range;
  return Math.min(1, Math.max(0, (p - a) / (b - a)));
}

export class CameraPath {
  private keys: CamKey[];
  private curve: CatmullRomCurve3;
  private cumulativeP: number[];
  private lastFov = -1;

  constructor(keys: CamKey[] = KEYS) {
    this.keys = keys;
    this.curve = new CatmullRomCurve3(
      keys.map((k) => new Vector3(...k.pos)),
      false,
      "catmullrom",
      0.5,
    );
    this.cumulativeP = keys.map((k) => k.p);
  }

  private findSegment(p: number): { i0: number; i1: number; t: number } {
    const keys = this.keys;
    let i0 = 0;
    for (let i = 0; i < keys.length - 1; i++) {
      if (p >= keys[i].p && p <= keys[i + 1].p) {
        i0 = i;
        break;
      }
      if (p > keys[keys.length - 1].p) i0 = keys.length - 2;
    }
    const i1 = i0 + 1;
    const span = keys[i1].p - keys[i0].p || 1;
    const t = Math.min(1, Math.max(0, (p - keys[i0].p) / span));
    return { i0, i1, t };
  }

  // p -> グローバル u (弧長比の近似: キー間の p 幅を等分に使う簡易マップ)
  private pToU(p: number): number {
    const { i0, t } = this.findSegment(p);
    const n = this.keys.length - 1;
    const eased = easeInOutCubic(t);
    return (i0 + eased) / n;
  }

  resolve(p: number, outPos: Vector3, outLook: Vector3): { fov: number; roll: number } {
    const u = this.pToU(p);
    this.curve.getPointAt(Math.min(1, Math.max(0, u)), outPos);

    const { i0, i1, t } = this.findSegment(p);
    const k0 = this.keys[i0];
    const k1 = this.keys[i1];
    const e = easeInOutSine(t);

    outLook.set(
      k0.look[0] + (k1.look[0] - k0.look[0]) * e,
      k0.look[1] + (k1.look[1] - k0.look[1]) * e,
      k0.look[2] + (k1.look[2] - k0.look[2]) * e,
    );

    const fov = k0.fov + (k1.fov - k0.fov) * e;
    const roll = k0.roll + (k1.roll - k0.roll) * e;
    return { fov, roll };
  }

  shouldUpdateProjection(fov: number): boolean {
    if (Math.abs(fov - this.lastFov) >= 0.01) {
      this.lastFov = fov;
      return true;
    }
    return false;
  }
}
