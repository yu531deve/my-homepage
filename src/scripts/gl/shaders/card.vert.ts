export const CARD_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uHover;
uniform vec2 uMouseUv;
uniform float uAppear;
uniform float uShear;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vUv = uv;
  vec3 pos = position;

  // 静的うねり
  pos.z += sin(uv.x * 3.0 + uTime * 0.6) * 0.12 * (1.0 - uv.y);

  // ホバー歪み
  float d = distance(uv, uMouseUv);
  pos.z += uHover * 0.9 * exp(-d * 3.5) * sin(uTime * 4.0);

  // 入場: バラバラの破片から集合
  pos.z += (1.0 - uAppear) * (hash2(uv) * 4.0 - 2.0);
  pos.x += (1.0 - uAppear) * (hash2(uv + 3.1) * 3.0 - 1.5);
  pos.y += (1.0 - uAppear) * (hash2(uv + 7.7) * 3.0 - 1.5);

  // スクロール速度による剪断
  pos.x += uShear * uv.y;

  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vNormal = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - worldPos.xyz);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;
