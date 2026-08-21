import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { initSmoothScroll } from "./smooth-scroll";
import { splitChars } from "./split-text";

interface BackgroundHandle {
  setSection(section: number): void;
  setIntensity(intensity: number, duration?: number): void;
  destroy(): void;
}

export async function initHomeScroll(): Promise<void> {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;

  if (reduced) return; // registerPlugin もしない。three の動的 import も行わない。HTML は静的初期状態で完成している

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  if (!isCoarse) {
    initSmoothScroll();
  }

  const { initWebGLBackground } = await import("./webgl-background");
  const bg = initWebGLBackground();

  const mm = gsap.matchMedia();

  mm.add(
    "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
    () => buildDesktopTimeline(bg),
  );

  mm.add("(max-width: 767px)", () => buildMobileReveals(bg));

  // 破棄処理: ページ離脱時に WebGL / ScrollTrigger / matchMedia の後始末をする
  const teardown = (): void => {
    mm.revert();
    ScrollTrigger.getAll().forEach((st) => st.kill());
    bg?.destroy();
  };
  window.addEventListener("pagehide", teardown, { once: true });
}

function buildDesktopTimeline(bg: BackgroundHandle | null): void {
  setupHero(false, bg);
  setupAbout(false, bg);
  setupWorks(bg);
  setupBlog(false, bg);
  setupContact(bg);
}

function buildMobileReveals(bg: BackgroundHandle | null): void {
  setupHero(true, bg);
  setupAbout(true, bg);
  setupWorksMobile();
  setupBlog(true, bg);
  setupContact(bg);
}

function setupHero(isMobile: boolean, bg: BackgroundHandle | null): void {
  const heroSection = document.querySelector<HTMLElement>("#hero");
  const heroSub = document.querySelector<HTMLElement>(".hero-sub");
  const heroBack = document.querySelector<HTMLElement>(".hero-layer--back");
  const heroScrollHint = document.querySelector<HTMLElement>(".hero-scroll-hint");

  const headings = gsap.utils.toArray<HTMLElement>(".hero-heading");
  const chars = headings.flatMap((h) => splitChars(h, "hero-char"));

  if (chars.length === 0 || !heroSection) return;

  // --- 入場(スクロール非依存) ---
  const intro = gsap.timeline();
  intro
    .from(chars, {
      yPercent: 130,
      rotateX: -80,
      opacity: 0,
      duration: 1.4,
      stagger: { each: 0.045, from: "start" },
      ease: "expo.out",
    })
    .from(heroBack, { scale: 1.4, opacity: 0, duration: 2.0, ease: "expo.out" }, 0)
    .from(heroSub, { yPercent: 100, opacity: 0, duration: 0.9, ease: "expo.out" }, 0.55);

  // --- アイドル(常時) ---
  gsap.to(chars, {
    yPercent: -3,
    duration: 2.4,
    ease: "sine.inOut",
    stagger: { each: 0.08, yoyo: true, repeat: -1 },
    repeat: -1,
    yoyo: true,
  });

  // --- pin + 崩壊(scrub) ---
  if (isMobile) return;

  const center = (chars.length - 1) / 2;
  let heroSectionActive = false;

  const collapse = gsap.timeline({
    scrollTrigger: {
      trigger: heroSection,
      start: "top top",
      end: "+=200%",
      pin: true,
      pinSpacing: true,
      scrub: 1,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        if (self.progress >= 0.45 && !heroSectionActive) {
          heroSectionActive = true;
          bg?.setSection(1);
        } else if (self.progress < 0.45 && heroSectionActive) {
          heroSectionActive = false;
          bg?.setSection(0);
        }
      },
    },
  });

  collapse.to(
    chars,
    {
      x: (i) => (i - center) * 22 * (window.innerWidth / 100),
      yPercent: (i) => (i % 2 ? -60 : 60),
      rotateZ: () => gsap.utils.random(-25, 25),
      filter: "blur(12px)",
      stagger: { each: 0.02, from: "center" },
      ease: "none",
    },
    0,
  );
  collapse.to(heroBack, { scale: 3.2, opacity: 0, ease: "none" }, 0);
  collapse.to(heroSub, { yPercent: -180, opacity: 0, ease: "none" }, 0.1);
  if (heroScrollHint) collapse.to(heroScrollHint, { opacity: 0, ease: "none" }, 0);
  collapse.to(
    heroSection,
    { scale: 0.72, opacity: 0, filter: "blur(8px)", ease: "none" },
    0.35,
  );
}

function setupAbout(isMobile: boolean, bg: BackgroundHandle | null): void {
  const aboutHeading = document.querySelector<HTMLElement>(".about-heading");
  const aboutLines = gsap.utils.toArray<HTMLElement>(".about-line");
  const aboutCard = document.querySelector<HTMLElement>(".about-card");
  const aboutBody = document.querySelector<HTMLElement>(".about-body");
  const aboutInner = document.querySelector<HTMLElement>(".about-inner");

  const headingChars = aboutHeading ? splitChars(aboutHeading, "about-char") : [];

  if (isMobile) {
    if (aboutHeading) {
      gsap.from(aboutHeading, { y: 30, opacity: 0, duration: 0.7, ease: "expo.out" });
    }
    if (aboutLines.length > 0) {
      gsap.from(aboutLines, {
        y: 30,
        opacity: 0,
        stagger: 0.15,
        duration: 0.6,
        ease: "expo.out",
        scrollTrigger: { trigger: "#about", start: "top 80%", invalidateOnRefresh: true },
      });
    }
    if (aboutCard) {
      gsap.from(aboutCard, {
        y: 40,
        opacity: 0,
        duration: 0.6,
        ease: "expo.out",
        scrollTrigger: { trigger: "#about", start: "top 70%", invalidateOnRefresh: true },
      });
    }
    return;
  }

  if (!aboutInner) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: "#about",
      start: "top bottom",
      end: "+=180%",
      pin: aboutInner,
      scrub: 1,
      invalidateOnRefresh: true,
    },
  });

  if (headingChars.length > 0) {
    tl.from(
      headingChars,
      {
        xPercent: 300,
        rotateY: 90,
        opacity: 0,
        filter: "blur(20px)",
        stagger: { each: 0.05, from: "random" },
        ease: "expo.out",
      },
      0,
    );
  }

  if (aboutLines.length > 0) {
    tl.from(
      aboutLines,
      { xPercent: 60, opacity: 0, skewY: 6, stagger: 0.12, ease: "none" },
      0.2,
    );
  }

  if (aboutCard) {
    tl.from(
      aboutCard,
      { yPercent: 120, rotateX: 45, opacity: 0, scale: 0.8, ease: "none" },
      0.3,
    );
  }

  if (aboutHeading) {
    tl.to(aboutHeading, { xPercent: -35, ease: "none" }, 0.3);
  }
  if (aboutBody) {
    tl.to(aboutBody, { xPercent: 12, ease: "none" }, 0.3);
  }

  tl.to(aboutInner, { scale: 1.35, opacity: 0, ease: "none" }, 0.7);

  tl.eventCallback("onUpdate", () => {
    const progress = tl.scrollTrigger?.progress ?? 0;
    if (progress >= 0.85) bg?.setSection(2);
  });
}

function setupWorks(bg: BackgroundHandle | null): void {
  const cards = gsap.utils.toArray<HTMLElement>(".work-card");
  const heading = document.querySelector<HTMLElement>(".works-heading");
  const n = cards.length;
  if (n === 0) return;

  cards.forEach((card, i) => {
    gsap.set(card, {
      z: -2500 - i * 900,
      rotateY: i % 2 ? 35 : -35,
      rotateX: 12,
      opacity: 0,
      scale: 0.9,
    });
  });

  let currentFront = -1;
  function setFrontCard(index: number): void {
    if (index === currentFront) return;
    currentFront = index;
    cards.forEach((card, i) => {
      card.style.pointerEvents = i === index ? "auto" : "none";
    });
  }

  const st = ScrollTrigger.create({
    trigger: "#works",
    start: "top top",
    end: () => `+=${(n + 1) * 90}%`,
    pin: true,
    scrub: 1.2,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      const idx = Math.round(self.progress * n);
      setFrontCard(Math.min(n - 1, Math.max(0, idx)));
      if (self.progress > 0.05) bg?.setSection(2);
      if (self.progress > 0.92) bg?.setSection(3);
    },
  });

  if (heading) {
    gsap.to(heading, {
      xPercent: -60,
      ease: "none",
      scrollTrigger: {
        trigger: "#works",
        start: "top top",
        end: () => `+=${(n + 1) * 90}%`,
        scrub: true,
        invalidateOnRefresh: true,
      },
    });
  }

  cards.forEach((card, i) => {
    const index = document.querySelector<HTMLElement>(`.work-card[data-index="${i}"] .work-card__index`);
    const start = i / (n + 1);
    const end = (i + 2) / (n + 1);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "#works",
        start: "top top",
        end: () => `+=${(n + 1) * 90}%`,
        scrub: true,
        invalidateOnRefresh: true,
      },
    });

    tl.fromTo(
      card,
      { z: -2500 - i * 900, rotateY: i % 2 ? 35 : -35, rotateX: 12, opacity: 0, scale: 0.9 },
      { z: 0, rotateY: 0, rotateX: 0, opacity: 1, scale: 1, ease: "none" },
      start,
    );
    tl.to(
      card,
      {
        z: 900,
        rotateY: i % 2 ? -25 : 25,
        opacity: 0,
        scale: 1.25,
        filter: "blur(14px)",
        ease: "none",
      },
      (start + end) / 2,
    );

    if (index) {
      tl.fromTo(index, { xPercent: -40 }, { xPercent: 40, ease: "none" }, start);
    }
  });

  document.querySelectorAll<HTMLElement>(".work-card").forEach((card, i) => {
    card.addEventListener("focusin", () => {
      const progress = i / n;
      st.scroll(st.start + (st.end - st.start) * progress);
    });
  });
}

function setupWorksMobile(): void {
  document.querySelectorAll<HTMLElement>(".work-card").forEach((card) => {
    gsap.from(card, {
      y: 60,
      opacity: 0,
      rotateX: 10,
      ease: "power2.out",
      duration: 0.6,
      scrollTrigger: {
        trigger: card,
        start: "top 85%",
        toggleActions: "play none none reverse",
        invalidateOnRefresh: true,
      },
    });
  });
}

function setupBlog(isMobile: boolean, bg: BackgroundHandle | null): void {
  const blogHeading = document.querySelector<HTMLElement>(".blog-heading");
  const blogCardsBlock = document.querySelector<HTMLElement>(".blog-cards");
  const blogCards = gsap.utils.toArray<HTMLElement>(".blog-card");
  const headingChars = blogHeading ? splitChars(blogHeading, "blog-char") : [];

  if (isMobile) {
    if (blogHeading) {
      gsap.from(blogHeading, { y: 40, opacity: 0, duration: 0.6, ease: "expo.out" });
    }
    if (blogCards.length > 0) {
      gsap.from(blogCards, {
        y: 70,
        opacity: 0,
        duration: 0.8,
        stagger: 0.08,
        ease: "expo.out",
        scrollTrigger: { trigger: "#blog", start: "top 70%", invalidateOnRefresh: true },
      });
    }
    return;
  }

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: "#blog",
      start: "top top",
      end: "+=160%",
      pin: true,
      scrub: 1,
      invalidateOnRefresh: true,
    },
  });

  if (headingChars.length > 0) {
    tl.from(
      headingChars,
      { yPercent: 100, rotateX: -90, opacity: 0, stagger: 0.03, ease: "expo.out" },
      0,
    );
  }

  if (blogCards.length > 0) {
    tl.from(
      blogCards,
      {
        yPercent: 160,
        rotateX: 65,
        z: -600,
        opacity: 0,
        transformOrigin: "50% 100%",
        stagger: 0.14,
        ease: "expo.out",
      },
      0.15,
    );
  }

  if (blogCardsBlock) {
    tl.to(blogCardsBlock, { yPercent: -60, ease: "none" }, 0.6);
  }
  if (blogHeading) {
    tl.to(blogHeading, { yPercent: -160, ease: "none" }, 0.6);
  }

  tl.to("#blog", { opacity: 0, filter: "blur(10px)", ease: "none" }, 0.75);

  tl.eventCallback("onUpdate", () => {
    const progress = tl.scrollTrigger?.progress ?? 0;
    if (progress >= 0.8) bg?.setSection(4);
  });
}

function setupContact(bg: BackgroundHandle | null): void {
  const contactHeading = document.querySelector<HTMLElement>(".contact-heading");
  const contactLinks = document.querySelector<HTMLElement>(".contact-links");
  const chars = contactHeading ? splitChars(contactHeading, "contact-char") : [];

  if (chars.length > 0) {
    gsap.from(chars, {
      yPercent: 140,
      rotateX: -95,
      opacity: 0,
      scale: 1.6,
      stagger: { each: 0.04, from: "edges" },
      ease: "expo.out",
      scrollTrigger: {
        trigger: "#contact",
        start: "top 90%",
        end: "top 20%",
        scrub: true,
        invalidateOnRefresh: true,
        onEnter: () => bg?.setIntensity(1.3),
      },
    });

    gsap.to(chars, {
      y: (i) => (i % 2 ? 6 : -6),
      duration: 1.8,
      ease: "sine.inOut",
      stagger: { each: 0.06, yoyo: true, repeat: -1 },
      repeat: -1,
      yoyo: true,
    });
  }

  if (contactLinks) {
    gsap.from(contactLinks.children, {
      yPercent: 80,
      opacity: 0,
      scale: 0.7,
      stagger: 0.08,
      duration: 0.6,
      ease: "back.out(2)",
      scrollTrigger: {
        trigger: "#contact",
        start: "top 60%",
        invalidateOnRefresh: true,
      },
    });
  }
}
