import { HalfFloatType, Vector2, type Scene, type Camera, type WebGLRenderer } from "three";
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  ChromaticAberrationEffect,
  VignetteEffect,
  NoiseEffect,
  BlendFunction,
  type Effect,
} from "postprocessing";

export interface ComposerHandle {
  composer: EffectComposer;
  bloom: BloomEffect;
  chromaticAberration: ChromaticAberrationEffect | null;
  vignette: VignetteEffect | null;
  render(dt: number): void;
  setSize(w: number, h: number): void;
  dispose(): void;
}

export function createComposer(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  bloomOnly: boolean,
): ComposerHandle {
  const composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType });
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new BloomEffect({
    blendFunction: BlendFunction.SCREEN,
    luminanceThreshold: 0.82,
    luminanceSmoothing: 0.15,
    intensity: 0.35,
    mipmapBlur: true,
    radius: 0.3,
  });

  let chromaticAberration: ChromaticAberrationEffect | null = null;
  let vignette: VignetteEffect | null = null;
  const effects: Effect[] = [bloom];

  if (!bloomOnly) {
    chromaticAberration = new ChromaticAberrationEffect({
      offset: new Vector2(0.0011, 0.0013),
      radialModulation: true,
      modulationOffset: 0.35,
    });
    vignette = new VignetteEffect({ eskil: false, offset: 0.28, darkness: 0.62 });
    const noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: true });
    noise.blendMode.opacity.value = 0.035;
    effects.push(chromaticAberration, vignette, noise);
  }

  composer.addPass(new EffectPass(camera as never, ...effects));

  function render(dt: number): void {
    composer.render(dt);
  }

  function setSize(w: number, h: number): void {
    composer.setSize(w, h, false);
  }

  function dispose(): void {
    composer.dispose();
  }

  return { composer, bloom, chromaticAberration, vignette, render, setSize, dispose };
}
