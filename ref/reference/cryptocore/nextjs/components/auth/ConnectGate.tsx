import { Wallet } from "lucide-react";

import { ConnectWalletModal } from "@/components/auth/ConnectWalletModal";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { TokenIcon } from "@/components/brand/TokenIcon";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/features/stores/authStore";

export function ConnectGate() {
  const needsUsername = useAuthStore((state) => state.address !== null && state.username === null);

  return (
    <div className="grid min-h-[70vh] place-items-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <TokenIcon className="mx-auto mb-5 size-16" />
        <BrandLogo className="mx-auto h-8" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Enter the mine</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect your Solana wallet to start mining, open chests and raid other rigs — or jump
          straight into demo mode and play locally, no wallet required.
        </p>
        {needsUsername ? (
          <ConnectWalletModal open onOpenChange={() => {}} />
        ) : (
          <ConnectWalletModal>
            <Button size="lg" className="mt-6 gap-2">
              <Wallet className="size-4" />
              Connect wallet
            </Button>
          </ConnectWalletModal>
        )}
      </div>
    </div>
  );
}
