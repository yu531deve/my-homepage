import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, ShaderMaterial } from "three";
import { DUST_VERTEX } from "../shaders/dust.vert";
import { DUST_FRAGMENT } from "../shaders/dust.frag";

const SPAN = 380; // z = 10 -> -360 相当の全長

export interface DustHandle {
  points: Points;
  update(t: number): void;
  dispose(): void;
}

export function createDust(count: number): DustHandle {
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const seeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const focused = Math.random() < 0.6;
    const radius = focused ? Math.random() * 14 : Math.random() * 60;
    const angle = Math.random() * Math.PI * 2;
    const z = 10 - Math.random() * SPAN;

    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.sin(angle) * radius * 0.6;
    positions[i * 3 + 2] = z;

    scales[i] = Math.random() < 0.3 ? 1.5 : 1.0;
    seeds[i] = Math.random() * 1000;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aScale", new BufferAttribute(scales, 1));
  geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1));

  const material = new ShaderMaterial({
    vertexShader: DUST_VERTEX,
    fragmentShader: DUST_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: 0.8 },
      uSpan: { value: SPAN },
      uOpacity: { value: 0.32 },
    },
  });

  const points = new Points(geometry, material);
  points.frustumCulled = false;

  let elapsed = 0;
  function update(dt: number): void {
    elapsed += dt;
    material.uniforms.uTime.value = elapsed;
  }

  function dispose(): void {
    geometry.dispose();
    material.dispose();
  }

  return { points, update, dispose };
}
