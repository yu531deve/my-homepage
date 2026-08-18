import gsap from "gsap";

interface Particle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function createParticle(width: number, height: number): Particle {
  return {
    x: randomRange(0, width),
    y: randomRange(0, height),
    r: randomRange(0.6, 1.8),
    vx: randomRange(-0.12, 0.12),
    vy: randomRange(-0.25, -0.05),
    alpha: randomRange(0.15, 0.5),
  };
}

export function initBackground(): void {
  const canvas = document.querySelector<HTMLCanvasElement>("#bg-particles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  const isFinePointer = window.matchMedia("(pointer: fine)").matches;

  let width = window.innerWidth;
  let height = window.innerHeight;
  let particles: Particle[] = [];

  function particleCount(): number {
    if (isMobile) return 40;
    return Math.min(90, Math.round(window.innerWidth / 14));
  }

  function resizeCanvas(): void {
    width = window.innerWidth;
    height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas!.width = width * dpr;
    canvas!.height = height * dpr;
    canvas!.style.width = `${width}px`;
    canvas!.style.height = `${height}px`;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seedParticles(): void {
    particles = Array.from({ length: particleCount() }, () => createParticle(width, height));
  }

  resizeCanvas();
  seedParticles();

  let resizeTimeout: ReturnType<typeof setTimeout> | undefined;
  window.addEventListener("resize", () => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      resizeCanvas();
      seedParticles();
    }, 150);
  });

  const tick = (): void => {
    ctx!.clearRect(0, 0, width, height);
    ctx!.fillStyle = "#34d399";
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.y < -10) {
        p.y = height + 10;
        p.x = randomRange(0, width);
      }
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;

      ctx!.globalAlpha = p.alpha;
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx!.fill();
    }
    ctx!.globalAlpha = 1;
  };

  gsap.ticker.add(tick);

  // マウス追従(pointer: fine のみ)
  if (isFinePointer) {
    const pointer = { x: 0.5, y: 0.5 };

    window.addEventListener("mousemove", (event) => {
      pointer.x = event.clientX / window.innerWidth;
      pointer.y = event.clientY / window.innerHeight;
    });

    gsap.ticker.add(() => {
      gsap.to(".bg-glow--a", {
        x: (pointer.x - 0.5) * 60,
        y: (pointer.y - 0.5) * 60,
        duration: 1.2,
        ease: "power3.out",
        overwrite: true,
      });
      gsap.to(".bg-glow--b", {
        x: (pointer.x - 0.5) * -40,
        y: (pointer.y - 0.5) * -40,
        duration: 1.2,
        ease: "power3.out",
        overwrite: true,
      });
    });
  }

  // スクロール連動パララックス
  gsap.to(".bg-glow--a", {
    yPercent: -25,
    ease: "none",
    scrollTrigger: {
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      scrub: 1.5,
      invalidateOnRefresh: true,
    },
  });
  gsap.to(".bg-glow--b", {
    yPercent: 18,
    ease: "none",
    scrollTrigger: {
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      scrub: 1.5,
      invalidateOnRefresh: true,
    },
  });
}
