import { FrontSide, PlaneGeometry, ShaderMaterial, Vector2 } from "three";
import { CARD_VERTEX } from "./card.vert";
import { CARD_FRAGMENT } from "./card.frag";

export interface CardMesh {
  geometry: PlaneGeometry;
  material: ShaderMaterial;
}

export function createCardMaterial(edgeStrength = 1): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: CARD_VERTEX,
    fragmentShader: CARD_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: FrontSide,
    uniforms: {
      uTime: { value: 0 },
      uHover: { value: 0 },
      uMouseUv: { value: new Vector2(0.5, 0.5) },
      uAppear: { value: 0 },
      uShear: { value: 0 },
      uFade: { value: 1 },
      uEdgeStrength: { value: edgeStrength },
    },
  });
}

export function createCardGeometry(w: number, h: number): PlaneGeometry {
  return new PlaneGeometry(w, h, 32, 20);
}
