export const CARD_FRAGMENT = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uHover;
uniform float uFade;
uniform float uEdgeStrength;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vec3 base = vec3(0.075, 0.075, 0.086);
  vec3 emerald = vec3(0.204, 0.827, 0.600) * 2.2;
  vec3 bright = vec3(0.957, 0.957, 0.961);

  float alpha = 0.82;
  vec3 col = base;

  float edge = 1.0 - smoothstep(0.0, 0.035, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
  col += emerald * edge * (0.6 + 1.8 * uHover) * uEdgeStrength;

  col += bright * 0.05 * sin(vUv.y * 220.0 - uTime * 3.0);
  col += emerald * 0.06 * (1.0 - vUv.y);

  float fresnel = pow(1.0 - clamp(abs(dot(vNormal, vViewDir)), 0.0, 1.0), 2.0);
  col *= 1.0 + 0.5 * fresnel;

  alpha *= uFade;

  gl_FragColor = vec4(col, alpha);
}
`;
