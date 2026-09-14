'use client';

import { useEffect, useState } from "react";

const IMAGES = [
  "/backgrounds/bg1.jpg",
  "/backgrounds/bg2.jpg",
  "/backgrounds/bg3.jpg",
  "/backgrounds/bg4.jpg",
];
const INTERVAL_MS = 60_000;

export function AmbientBackground() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % IMAGES.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" style={{ pointerEvents: "none", position: "fixed", inset: 0, zIndex: -10, overflow: "hidden" }}>
      {IMAGES.map((src, i) => (
        <div
          key={src}
          className="pointer-events-none absolute inset-0 transition-opacity duration-[2000ms] ease-in-out"
          style={{
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${src})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            opacity: i === index ? 0.55 : 0,
            transition: "opacity 2000ms ease-in-out",
          }}
        />
      ))}
      {/* Vignette — keeps text readable over the bg images */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background/70" />
    </div>
  );
}
