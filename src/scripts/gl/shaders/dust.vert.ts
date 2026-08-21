export const DUST_VERTEX = /* glsl */ `
attribute float aScale;
attribute float aSeed;

uniform float uTime;
uniform float uSize;
uniform float uSpan;

varying float vSeed;

void main() {
  vec3 pos = position;
  pos.xy += 0.6 * vec2(sin(uTime * 0.3 + aSeed), cos(uTime * 0.25 + aSeed));

  // カメラを通り過ぎた粒子は uSpan だけ手前へ mod で再配置(無限空間)
  pos.z = mod(pos.z - uTime * 0.4, uSpan) - uSpan;

  vSeed = aSeed;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = uSize * aScale * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;
