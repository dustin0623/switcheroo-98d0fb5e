import type { Metadata } from "next";
import { config }           from "@/lib/config/config";
import { getChainBranding } from "@/lib/config/branding";

const branding = getChainBranding(config.blockchain.chain);

export const metadata: Metadata = {
  title: "Marketplace",
  description: `Trade ${branding.gameName} heroes with ${branding.tokenName}. Filter by rarity, price and stats.`,
  openGraph: {
    title: `${branding.gameName} Marketplace`,
    description: `Buy and sell pixel-mining heroes on the ${branding.gameName} marketplace.`,
  },
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
