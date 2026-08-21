import { Text, preloadFont } from "troika-three-text";

const REGULAR = "/fonts/Inter-Regular.ttf";
const BOLD = "/fonts/Inter-Bold.ttf";

const LATIN_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ./·'-→";

export async function preloadFonts(): Promise<void> {
  await Promise.all([
    new Promise<void>((resolve) =>
      preloadFont({ font: REGULAR, characters: LATIN_CHARSET }, () => resolve()),
    ),
    new Promise<void>((resolve) =>
      preloadFont({ font: BOLD, characters: LATIN_CHARSET }, () => resolve()),
    ),
  ]);
}

export interface TextOptions {
  text: string;
  font?: "regular" | "bold";
  fontSize: number;
  color?: number | string;
  position?: [number, number, number];
  anchorX?: "left" | "center" | "right";
  anchorY?: "top" | "middle" | "bottom";
  letterSpacing?: number;
  lineHeight?: number;
  maxWidth?: number;
  outlineWidth?: number;
  outlineColor?: number | string;
  outlineBlur?: number;
  fillOpacity?: number;
}

// troika Text 生成ヘルパ。sync() は生成時に 1 回だけ呼ぶ(§7-4)。
export function makeText(opts: TextOptions): Text {
  const t = new Text();
  t.text = opts.text;
  t.font = opts.font === "bold" ? BOLD : REGULAR;
  t.fontSize = opts.fontSize;
  t.color = opts.color ?? 0xf4f4f5;
  t.anchorX = opts.anchorX ?? "center";
  t.anchorY = opts.anchorY ?? "middle";
  t.sdfGlyphSize = 64;
  if (opts.position) t.position.set(...opts.position);
  if (opts.letterSpacing !== undefined) t.letterSpacing = opts.letterSpacing;
  if (opts.lineHeight !== undefined) t.lineHeight = opts.lineHeight;
  if (opts.maxWidth !== undefined) t.maxWidth = opts.maxWidth;
  if (opts.outlineWidth !== undefined) t.outlineWidth = opts.outlineWidth;
  if (opts.outlineColor !== undefined) t.outlineColor = opts.outlineColor;
  if (opts.outlineBlur !== undefined) t.outlineBlur = opts.outlineBlur;
  if (opts.fillOpacity !== undefined) t.fillOpacity = opts.fillOpacity;
  t.material.transparent = true;
  t.sync();
  return t;
}

export function disposeText(t: Text): void {
  t.dispose();
}
