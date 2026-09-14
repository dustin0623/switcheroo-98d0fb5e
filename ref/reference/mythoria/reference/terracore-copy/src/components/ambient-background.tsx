import { useEffect, useState } from "react";
import bg1 from "@/assets/backgrounds/bg1.jpg.asset.json";
import bg2 from "@/assets/backgrounds/bg2.jpg.asset.json";
import bg3 from "@/assets/backgrounds/bg3.jpg.asset.json";
import bg4 from "@/assets/backgrounds/bg4.jpg.asset.json";

const IMAGES = [bg1.url, bg2.url, bg3.url, bg4.url];
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
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {IMAGES.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms] ease-in-out"
          style={{
            backgroundImage: `url(${src})`,
            opacity: i === index ? 0.35 : 0,
          }}
        />
      ))}
      {/* Vignette + tint to keep UI readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/60 to-background/90" />
      {/* Grid overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, oklch(1 0 0 / 0.03) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 0.03) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
    </div>
  );
}