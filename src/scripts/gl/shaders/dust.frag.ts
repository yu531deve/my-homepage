export const DUST_FRAGMENT = /* glsl */ `
precision highp float;

uniform float uOpacity;

varying float vSeed;

float hash1(float n) {
  return fract(sin(n) * 43758.5453);
}

void main() {
  vec2 d = gl_PointCoord - 0.5;
  float dist = length(d);
  float alpha = smoothstep(0.5, 0.0, dist) * uOpacity;

  vec3 emerald = vec3(0.204, 0.827, 0.600);
  vec3 white = vec3(0.957, 0.957, 0.961);
  vec3 col = mix(emerald, white, hash1(vSeed));

  gl_FragColor = vec4(col, alpha);
}
`;
