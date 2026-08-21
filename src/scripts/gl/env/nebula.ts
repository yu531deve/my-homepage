import { BoxGeometry, Mesh, ShaderMaterial, BackSide, Vector3 } from "three";
import { NEBULA_VERTEX } from "../shaders/nebula.vert";
import { NEBULA_FRAGMENT } from "../shaders/nebula.frag";

export interface NebulaHandle {
  mesh: Mesh;
  update(t: number, progress: number, camPos: Vector3, timeScale: number): void;
  dispose(): void;
}

export function createNebula(octaves: number): NebulaHandle {
  const geometry = new BoxGeometry(400, 400, 400);
  const material = new ShaderMaterial({
    vertexShader: NEBULA_VERTEX,
    fragmentShader: NEBULA_FRAGMENT,
    side: BackSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uCamPos: { value: new Vector3() },
      uOctaves: { value: octaves },
    },
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;

  let elapsed = 0;

  function update(dt: number, progress: number, camPos: Vector3, timeScale: number): void {
    elapsed += dt * timeScale;
    material.uniforms.uTime.value = elapsed;
    material.uniforms.uProgress.value = progress;
    material.uniforms.uCamPos.value.copy(camPos);
  }

  function dispose(): void {
    geometry.dispose();
    material.dispose();
  }

  return { mesh, update, dispose };
}
