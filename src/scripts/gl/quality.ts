export type Quality = "off" | "low" | "mid" | "high";

export interface QualitySettings {
  quality: Exclude<Quality, "off">;
  postprocessing: boolean;
  bloomOnly: boolean;
  dustCount: number;
  octaves: number;
  renderScale: number;
  dprCap: number;
  simplifiedCameraPath: boolean;
  parallax: boolean;
}

export function detectInitialQuality(): Exclude<Quality, "off"> {
  const coarse = matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 768;
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;

  if (coarse && narrow) return "low";
  if ((coarse && !narrow) || cores <= 4 || mem <= 4) return "mid";
  return "high";
}

export function settingsFor(quality: Exclude<Quality, "off">): QualitySettings {
  switch (quality) {
    case "low":
      return {
        quality,
        postprocessing: false,
        bloomOnly: false,
        dustCount: 180,
        octaves: 3,
        renderScale: 0.62,
        dprCap: 1.25,
        simplifiedCameraPath: true,
        parallax: false,
      };
    case "mid":
      return {
        quality,
        postprocessing: true,
        bloomOnly: true,
        dustCount: 420,
        octaves: 4,
        renderScale: 0.8,
        dprCap: 1.5,
        simplifiedCameraPath: false,
        parallax: true,
      };
    case "high":
    default:
      return {
        quality: "high",
        postprocessing: true,
        bloomOnly: false,
        dustCount: 900,
        octaves: 5,
        renderScale: 1.0,
        dprCap: 1.75,
        simplifiedCameraPath: false,
        parallax: true,
      };
  }
}

export function downgrade(q: Exclude<Quality, "off">): Exclude<Quality, "off"> {
  if (q === "high") return "mid";
  if (q === "mid") return "low";
  return "low";
}

export function upgrade(q: Exclude<Quality, "off">): Exclude<Quality, "off"> {
  if (q === "low") return "mid";
  if (q === "mid") return "high";
  return "high";
}
