import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { initSmoothScroll } from "./smooth-scroll";
import { initBackground } from "./background";

export function initHomeScroll(): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;

  if (reduced) return; // registerPlugin もしない。HTML は静的初期状態で完成している

  gsap.registerPlugin(ScrollTrigger);

  if (!isCoarse) {
    initSmoothScroll();
  }

  initBackground();

  const mm = gsap.matchMedia();

  mm.add("(min-width: 768px)", () => {
    setupHero(false);
    setupAbout(false);
    setupWorks();
    setupBlog(false);
    setupContact();
  });

  mm.add("(max-width: 767px)", () => {
    setupHero(true);
    setupAbout(true);
    setupWorksMobile();
    setupBlog(true);
    setupContact();
  });
}

function setupHero(isMobile: boolean): void {
  const heroLines = gsap.utils.toArray<HTMLElement>(".hero-line");
  const heroSub = document.querySelector<HTMLElement>(".hero-sub");
  const heroSection = document.querySelector<HTMLElement>("#hero");
  const heroScrollHint = document.querySelector<HTMLElement>(".hero-scroll-hint");

  gsap.from(heroLines, {
    yPercent: 110,
    opacity: 0,
    duration: 1.1,
    stagger: isMobile ? 0.06 : 0.09,
    ease: "expo.out",
  });

  if (heroSub) {
    gsap.from(heroSub, {
      y: 20,
      opacity: 0,
      duration: 0.8,
      delay: 0.5,
      ease: "power2.out",
    });
  }

  if (heroSection) {
    const exitTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: heroSection,
        start: "top top",
        end: "bottom top",
        scrub: true,
        invalidateOnRefresh: true,
      },
    });

    exitTimeline.to(
      heroLines,
      {
        yPercent: isMobile ? -30 : -60,
        opacity: 0,
        stagger: 0.05,
        ease: "none",
      },
      0,
    );

    if (heroSub) {
      exitTimeline.to(heroSub, { y: -40, opacity: 0, ease: "none" }, 0);
    }

    if (!isMobile) {
      exitTimeline.to(heroSection, { scale: 0.92, ease: "none" }, 0);
    }
  }

  if (heroScrollHint && heroSection) {
    gsap.to(heroScrollHint, {
      opacity: 0,
      ease: "none",
      scrollTrigger: {
        trigger: heroSection,
        start: "top top",
        end: "+=200",
        scrub: true,
        invalidateOnRefresh: true,
      },
    });
  }
}

function setupAbout(isMobile: boolean): void {
  const aboutHeading = document.querySelector<HTMLElement>(".about-heading");
  const aboutLines = gsap.utils.toArray<HTMLElement>(".about-line");
  const aboutCard = document.querySelector<HTMLElement>(".about-card");

  if (aboutHeading) {
    gsap.from(aboutHeading, {
      x: isMobile ? 0 : -80,
      y: isMobile ? 30 : 0,
      opacity: 0,
      ease: "none",
      scrollTrigger: {
        trigger: "#about",
        start: "top 85%",
        end: "top 35%",
        scrub: true,
        invalidateOnRefresh: true,
      },
    });
  }

  if (aboutLines.length > 0) {
    gsap.from(aboutLines, {
      x: isMobile ? 0 : 60,
      y: isMobile ? 30 : 40,
      opacity: 0,
      stagger: 0.15,
      ease: "none",
      scrollTrigger: {
        trigger: "#about",
        start: "top 85%",
        end: "top 35%",
        scrub: true,
        invalidateOnRefresh: true,
      },
    });
  }

  if (aboutCard) {
    gsap.from(aboutCard, {
      y: 60,
      opacity: 0,
      duration: 0.7,
      ease: "expo.out",
      scrollTrigger: {
        trigger: "#about",
        start: "top 70%",
        toggleActions: "play none none reverse",
        invalidateOnRefresh: true,
      },
    });
  }
}

function setupWorks(): void {
  const track = document.querySelector<HTMLElement>(".works-track");
  const pin = document.querySelector<HTMLElement>(".works-pin");
  if (!track || !pin) return;

  const distance = (): number => track.scrollWidth - window.innerWidth;

  const horizontalTween = gsap.to(track, {
    x: () => -distance(),
    ease: "none",
    scrollTrigger: {
      trigger: "#works",
      start: "top top",
      end: () => `+=${distance()}`,
      pin,
      pinSpacing: true,
      scrub: 1,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  document.querySelectorAll<HTMLElement>(".work-card").forEach((card) => {
    gsap.from(card, {
      scale: 0.88,
      opacity: 0.35,
      ease: "none",
      scrollTrigger: {
        trigger: card,
        containerAnimation: horizontalTween,
        start: "left 90%",
        end: "left 55%",
        scrub: true,
        invalidateOnRefresh: true,
      },
    });
  });

  const trackParent = track.parentElement;
  if (trackParent) {
    trackParent.addEventListener("focusin", () => {
      trackParent.scrollLeft = 0;
      trackParent.scrollTop = 0;
    });
  }
}

function setupWorksMobile(): void {
  document.querySelectorAll<HTMLElement>(".work-card").forEach((card) => {
    gsap.from(card, {
      y: 40,
      opacity: 0,
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

function setupBlog(isMobile: boolean): void {
  const blogHeadingBlock = document.querySelector<HTMLElement>(".blog-heading-block");
  const blogCards = gsap.utils.toArray<HTMLElement>(".blog-card");

  if (blogHeadingBlock) {
    gsap.from(blogHeadingBlock, {
      y: 40,
      opacity: 0,
      duration: 0.6,
      ease: "expo.out",
      scrollTrigger: {
        trigger: "#blog",
        start: "top 80%",
        invalidateOnRefresh: true,
      },
    });

    gsap.to(blogHeadingBlock, {
      yPercent: -6,
      ease: "none",
      scrollTrigger: {
        trigger: "#blog",
        start: "top bottom",
        end: "bottom top",
        scrub: true,
        invalidateOnRefresh: true,
      },
    });
  }

  if (blogCards.length > 0) {
    gsap.from(blogCards, {
      y: 70,
      opacity: 0,
      rotateX: isMobile ? 0 : 8,
      duration: 0.8,
      stagger: isMobile ? 0.08 : 0.12,
      ease: "expo.out",
      scrollTrigger: {
        trigger: "#blog",
        start: "top 70%",
        invalidateOnRefresh: true,
      },
    });
  }
}

function setupContact(): void {
  const contactChars = gsap.utils.toArray<HTMLElement>(".contact-char");
  const contactLinks = document.querySelector<HTMLElement>(".contact-links");

  if (contactChars.length > 0) {
    gsap.from(contactChars, {
      yPercent: 120,
      opacity: 0,
      stagger: 0.03,
      ease: "none",
      scrollTrigger: {
        trigger: "#contact",
        start: "top 85%",
        end: "top 40%",
        scrub: true,
        invalidateOnRefresh: true,
      },
    });
  }

  if (contactLinks) {
    gsap.from(contactLinks.children, {
      y: 24,
      opacity: 0,
      stagger: 0.08,
      duration: 0.5,
      ease: "power2.out",
      scrollTrigger: {
        trigger: "#contact",
        start: "top 60%",
        invalidateOnRefresh: true,
      },
    });
  }
}
