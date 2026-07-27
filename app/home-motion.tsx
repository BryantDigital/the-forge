"use client";

import { useEffect } from "react";

export function HomeMotion() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealElements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

    if (reducedMotion || !("IntersectionObserver" in window)) {
      revealElements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    document.documentElement.classList.add("motion-ready");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    revealElements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return null;
}
