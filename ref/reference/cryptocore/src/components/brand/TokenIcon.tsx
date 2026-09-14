import { cn } from "@/lib/utils";
import tokenAsset from "@/assets/hash-token.png.asset.json";

export function TokenIcon({ className }: { className?: string }) {
  return (
    <img
      src={tokenAsset.url}
      alt="$HASH token"
      className={cn("size-5 object-contain", className)}
      draggable={false}
      loading="lazy"
    />
  );
}
