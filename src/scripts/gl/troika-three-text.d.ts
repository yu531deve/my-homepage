declare module "troika-three-text" {
  import type { Mesh, Material } from "three";

  export class Text extends Mesh {
    text: string;
    font: string | null;
    fontSize: number;
    color: number | string;
    anchorX: "left" | "center" | "right" | number;
    anchorY: "top" | "top-baseline" | "middle" | "bottom-baseline" | "bottom" | number;
    sdfGlyphSize: number;
    letterSpacing: number;
    lineHeight: number | "normal";
    maxWidth: number;
    outlineWidth: number | string;
    outlineColor: number | string;
    outlineBlur: number | string;
    fillOpacity: number;
    material: Material & { opacity: number };
    sync(callback?: () => void): void;
    dispose(): void;
  }

  export function preloadFont(
    options: { font: string; characters?: string },
    callback: () => void,
  ): void;
}
