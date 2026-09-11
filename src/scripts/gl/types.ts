import type { Group, Object3D } from "three";

export interface FrameCtx {
  p: number;
  localP: number;
  t: number;
  dt: number;
  mouse: { x: number; y: number };
  velocity: number;
  camDistance: (worldZ: number) => number;
}

export interface Space {
  group: Group;
  /** 日本語 DOM オーバーレイの追従先。anchorId -> 3D オブジェクト */
  anchors?: Record<string, Object3D>;
  update(ctx: FrameCtx): void;
  dispose(): void;
}
