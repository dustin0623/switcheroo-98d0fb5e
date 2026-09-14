import { cn } from "@/lib/utils";
import logoAsset from "@/assets/cryptocore-logo.png.asset.json";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="CryptoCore"
      className={cn("h-6 w-auto object-contain", className)}
      draggable={false}
    />
  );
}
