// v2 (webgl-background.ts) の hash/noise/fbm をそのまま移植した共有チャンク。
export const FBM_CHUNK = /* glsl */ `
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

uniform int uOctaves;

float fbm(vec2 p, float time) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    if (i >= uOctaves) break;
    v += a * noise(p);
    p = rot * p * 2.02 + 0.03 * time * float(i) * 0.15;
    a *= 0.5;
  }
  return v;
}
`;
