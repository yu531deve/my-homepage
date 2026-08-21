import { FBM_CHUNK } from "./fbm";

// v2 (webgl-background.ts) の domain-warped fbm を 3D 球面座標に移植。
// uSection の分岐は捨て、連続な uProgress 1本で配色を移動させる(§4.6)。
export const NEBULA_FRAGMENT = /* glsl */ `
precision highp float;

varying vec3 vWorldPos;

uniform float uTime;
uniform float uProgress;
uniform vec3 uCamPos;

${FBM_CHUNK}

void main() {
  vec3 dir = normalize(vWorldPos - uCamPos);
  vec2 sp = vec2(atan(dir.z, dir.x) / 6.2831 + 0.5, dir.y * 0.5 + 0.5);
  vec2 uv = sp * vec2(2.2, 1.4);

  float t = uTime * 0.06;

  vec2 q = vec2(fbm(uv * 1.6 + vec2(0.0, t), uTime), fbm(uv * 1.6 + vec2(5.2, 1.3 - t), uTime));
  vec2 r = vec2(
    fbm(uv * 2.4 + 4.0 * q + vec2(1.7, 9.2) + t * 1.4, uTime),
    fbm(uv * 2.4 + 4.0 * q + vec2(8.3, 2.8) - t * 1.1, uTime)
  );
  float f = fbm(uv * 2.0 + 4.0 * r, uTime);

  float breath = 0.5 + 0.5 * sin(uTime * 0.35);
  f += breath * 0.06;

  float core = smoothstep(0.42, 0.78, f);
  float veins = pow(max(1.0 - abs(f - 0.55) * 3.2, 0.0), 6.0);

  vec3 base = vec3(0.039, 0.039, 0.043);
  vec3 emerald = vec3(0.063, 0.725, 0.506);
  vec3 bright = vec3(0.204, 0.827, 0.600);
  vec3 deep = vec3(0.023, 0.145, 0.180);

  vec3 col = base;
  col = mix(col, deep, smoothstep(0.25, 0.6, f));
  col = mix(col, emerald, core * 0.55);
  col += bright * veins * (0.9 + 0.6 * breath);

  // uProgress: Hero(青緑寄り)→ Works(暗く沈む)→ Contact(発光強)
  vec3 heroTint = mix(col, emerald * 0.9, 0.15);
  vec3 worksTint = col * 0.55;
  vec3 contactTint = col * 1.35 + bright * 0.25;

  vec3 sceneCol = mix(heroTint, worksTint, smoothstep(0.16, 0.55, uProgress));
  sceneCol = mix(sceneCol, contactTint, smoothstep(0.75, 1.0, uProgress));

  gl_FragColor = vec4(sceneCol, 1.0);
}
`;
