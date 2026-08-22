import type { Group } from "three";

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
  update(ctx: FrameCtx): void;
  dispose(): void;
}
