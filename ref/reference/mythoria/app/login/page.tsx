'use client';
// app/login/page.tsx
//
// Three distinct flows, driven entirely by NEXT_PUBLIC_CHAIN:
//
//  hive       → username input → Keychain signs → verify → JWT
//              (username IS the wallet identifier on Hive)
//
//  robinhood  → detect EIP-6963 wallets → user picks one → wallet signs
//              → username input (short game name) → verify → JWT
//
//  solana     → detect Wallet-Standard wallets → user picks one → wallet signs
//              → username input (short game name) → verify → JWT
//
// For Robinhood / Solana, the wallet address is too long to use as a display
// name so we collect a short game username AFTER signing.

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGameStore } from "@/features/game-store/game-store";
import { SiteHeader } from "@/components/site-layout";
import { activeChain } from "@/lib/client/chain";

// ─── Hive ────────────────────────────────────────────────────────────────────
// Window.hive_keychain is declared globally in types/hive-keychain.d.ts

function isHiveKeychainAvailable() {
  return typeof window !== "undefined" && !!window.hive_keychain;
}

async function signWithHive(username: string, message: string): Promise<{ signature: string }> {
  return new Promise((resolve, reject) => {
    if (!window.hive_keychain) { reject(new Error("Hive Keychain not found")); return; }
    window.hive_keychain.requestSignBuffer(username, message, "Posting", (r) => {
      if (r.success && r.result) resolve({ signature: r.result });
      else reject(new Error(r.message ?? "Signature denied"));
    });
  });
}

// ─── Robinhood (EIP-6963) ────────────────────────────────────────────────────

const ROBINHOOD_CHAIN_ID_HEX = "0x1237";

interface EIP6963Info { uuid: string; name: string; icon: string; rdns: string; }
interface EIP6963Provider {
  info: EIP6963Info;
  provider: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
}

function subscribeToEIP6963(onChange: (w: EIP6963Provider[]) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const seen = new Set<string>();
  let current: EIP6963Provider[] = [];
  function onAnnounce(e: Event) {
    const ev = e as CustomEvent<EIP6963Provider>;
    if (!ev.detail?.info?.rdns || seen.has(ev.detail.info.rdns)) return;
    seen.add(ev.detail.info.rdns);
    current = [...current, ev.detail];
    onChange(current);
  }
  window.addEventListener("eip6963:announceProvider", onAnnounce);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  return () => window.removeEventListener("eip6963:announceProvider", onAnnounce);
}

async function connectAndSignRobinhood(w: EIP6963Provider): Promise<{ wallet: string; signature: string; message: string }> {
  const { provider } = w;
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts?.length) throw new Error("No accounts returned from wallet.");
  const address = accounts[0];
  // Verify chain
  const chainId = (await provider.request({ method: "eth_chainId" })) as string;
  if ("0x" + parseInt(chainId, 16).toString(16) !== ROBINHOOD_CHAIN_ID_HEX) {
    throw new Error("Wrong network. Please switch to Robinhood Chain (ID 4663) in your wallet.");
  }
  const message = `mythoria:login:${address.toLowerCase()}:robinhood:${Date.now()}`;
  const msgHex = "0x" + Buffer.from(message, "utf8").toString("hex");
  const signature = (await provider.request({ method: "personal_sign", params: [msgHex, address] })) as string;
  return { wallet: address.toLowerCase(), signature, message };
}

// ─── Solana (Wallet Standard) ─────────────────────────────────────────────────

interface SolanaWalletStd {
  name: string;
  icon: string;
  chains: readonly string[];
  features: Record<string, unknown>;
  accounts: ReadonlyArray<{ address: string; publicKey: Uint8Array }>;
}

function subscribeToSolanaWallets(onChange: (w: SolanaWalletStd[]) => void): () => void {
  if (typeof window === "undefined") return () => {};
  // Use @wallet-standard/app if available, otherwise detect window.solana
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getWallets } = require("@wallet-standard/app") as { getWallets: () => { get: () => SolanaWalletStd[]; on: (e: string, cb: () => void) => () => void } };
    const api = getWallets();
    const emit = () => {
      const list = api.get().filter((w) =>
        w.chains.some((c) => c.startsWith("solana:")) &&
        ("standard:connect" in w.features) &&
        ("solana:signMessage" in w.features || "solana:signAndSendTransaction" in w.features)
      );
      onChange(list);
    };
    emit();
    const off1 = api.on("register", emit);
    const off2 = api.on("unregister", emit);
    return () => { off1(); off2(); };
  } catch {
    // Fallback: detect window.solana (Phantom legacy)
    if ((window as any).solana) {
      const w: SolanaWalletStd = {
        name: "Phantom",
        icon: "",
        chains: ["solana:mainnet"],
        features: { "standard:connect": {}, "solana:signMessage": {} },
        accounts: [],
      };
      onChange([w]);
    }
    return () => {};
  }
}

async function connectAndSignSolana(w: SolanaWalletStd): Promise<{ wallet: string; signature: string; message: string }> {
  const features = w.features;
  const connectFn = (features["standard:connect"] as any)?.connect;
  const signMsgFn = (features["solana:signMessage"] as any)?.signMessage;
  if (!connectFn) throw new Error(`${w.name} does not support connect.`);
  if (!signMsgFn) throw new Error(`${w.name} does not support message signing.`);

  const connectResult = await connectFn({ silent: false });
  const account = connectResult?.accounts?.[0] ?? w.accounts[0];
  if (!account) throw new Error(`${w.name} did not return an account.`);

  const message = `mythoria:login:${account.address}:solana:${Date.now()}`;
  const encoded = new TextEncoder().encode(message);
  const [result] = await signMsgFn({ account, message: encoded });
  if (!result?.signature) throw new Error(`${w.name} did not return a signature.`);

  // bs58 encode
  let sigStr: string;
  try {
    const { default: bs58 } = await import("bs58");
    sigStr = bs58.encode(result.signature);
  } catch {
    sigStr = Buffer.from(result.signature).toString("hex");
  }

  return { wallet: account.address, signature: sigStr, message };
}

// ─── Shared types ─────────────────────────────────────────────────────────────

type LoginStep =
  | "idle"          // initial state
  | "picking"       // Robinhood/Solana wallet picker shown
  | "signing"       // waiting for wallet extension approval
  | "username"      // Robinhood/Solana: collecting short game username after signing
  | "verifying"     // posting to /api/auth/login
  | "error";

// ─── LoginPageContent ─────────────────────────────────────────────────────────

function LoginPageContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const storeLogin   = useGameStore((s) => s.login);
  const isLoggedIn   = useGameStore((s) => s.isLoggedIn);

  // Hive
  const [hiveUsername, setHiveUsername] = useState("");
  const [hiveWalletReady, setHiveWalletReady] = useState(false);

  // Robinhood / Solana — wallet discovery
  const [robinWallets,  setRobinWallets]  = useState<EIP6963Provider[]>([]);
  const [solanaWallets, setSolanaWallets] = useState<SolanaWalletStd[]>([]);
  const [scanned,       setScanned]       = useState(false);
  const robinCleanupRef = useRef<(() => void) | null>(null);
  const solanaCleanupRef = useRef<(() => void) | null>(null);

  // Shared post-sign state (Robinhood / Solana)
  const [signedWallet,    setSignedWallet]    = useState<string>("");
  const [signedMessage,   setSignedMessage]   = useState<string>("");
  const [signedSignature, setSignedSignature] = useState<string>("");
  const [signingWallet,   setSigningWallet]   = useState<string>("");

  // Game username (Robinhood / Solana only)
  const [gameUsername, setGameUsername] = useState("");

  // Flow state
  const [step,  setStep]  = useState<LoginStep>("idle");
  const [error, setError] = useState<string | null>(null);

  const redirect = searchParams.get("redirect") ?? "/play";

  useEffect(() => {
    if (isLoggedIn) router.replace(redirect);
  }, [isLoggedIn, router, redirect]);

  // Chain-specific init after mount
  useEffect(() => {
    if (activeChain === "hive") {
      setHiveWalletReady(isHiveKeychainAvailable());
      return;
    }
    if (activeChain === "robinhood") {
      robinCleanupRef.current = subscribeToEIP6963((wallets) => {
        setRobinWallets(wallets);
        setScanned(true);
      });
      const t = setTimeout(() => setScanned(true), 600);
      return () => { robinCleanupRef.current?.(); clearTimeout(t); };
    }
    if (activeChain === "solana") {
      solanaCleanupRef.current = subscribeToSolanaWallets((wallets) => {
        setSolanaWallets(wallets);
        setScanned(true);
      });
      const t = setTimeout(() => setScanned(true), 600);
      return () => { solanaCleanupRef.current?.(); clearTimeout(t); };
    }
  }, []);

  // ── Hive submit ─────────────────────────────────────────────────
  async function handleHiveLogin() {
    const user = hiveUsername.trim().toLowerCase();
    if (!user) return;
    if (!hiveWalletReady) {
      setError("Hive Keychain is not installed.");
      setStep("error");
      return;
    }
    setError(null);
    setStep("signing");
    const message = `mythoria:login:${user}:hive:${Date.now()}`;
    try {
      const { signature } = await signWithHive(user, message);
      setStep("verifying");
      await submitLogin({ wallet: user, username: user, message, signature });
    } catch (e) {
      setStep("error");
      setError(e instanceof Error ? e.message : "Signing failed.");
    }
  }

  // ── Robinhood wallet selected ────────────────────────────────────
  async function handleRobinhoodWallet(w: EIP6963Provider) {
    setError(null);
    setStep("signing");
    setSigningWallet(w.info.name);
    try {
      const result = await connectAndSignRobinhood(w);
      setSignedWallet(result.wallet);
      setSignedMessage(result.message);
      setSignedSignature(result.signature);
      setStep("username");
    } catch (e) {
      setStep("idle");
      setError(e instanceof Error ? e.message : "Wallet connection failed.");
    }
  }

  // ── Solana wallet selected ───────────────────────────────────────
  async function handleSolanaWallet(w: SolanaWalletStd) {
    setError(null);
    setStep("signing");
    setSigningWallet(w.name);
    try {
      const result = await connectAndSignSolana(w);
      setSignedWallet(result.wallet);
      setSignedMessage(result.message);
      setSignedSignature(result.signature);
      setStep("username");
    } catch (e) {
      setStep("idle");
      setError(e instanceof Error ? e.message : "Wallet connection failed.");
    }
  }

  // ── Username submit (Robinhood / Solana) ─────────────────────────
  async function handleUsernameSubmit() {
    const uname = gameUsername.trim().toLowerCase();
    if (!uname) return;
    setStep("verifying");
    try {
      await submitLogin({
        wallet:    signedWallet,
        username:  uname,
        message:   signedMessage,
        signature: signedSignature,
      });
    } catch (e) {
      setStep("username");
      setError(e instanceof Error ? e.message : "Login failed.");
    }
  }

  // ── Shared API call ──────────────────────────────────────────────
  async function submitLogin(payload: {
    wallet: string; username: string; message: string; signature: string;
  }) {
    const res  = await fetch("/api/auth/login", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    const data = await res.json() as { token?: string; username?: string; error?: string };
    if (!res.ok || !data.token) {
      throw new Error(data.error ?? "Login failed. Please try again.");
    }
    storeLogin(data.token, data.username ?? payload.username);
    router.replace(redirect);
  }

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="bracket-frame bg-card/40">

            {/* Header */}
            <div className="text-center mb-8">
              <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-2">
                Mythoria
              </p>
              <h1 className="text-3xl font-bold tracking-wider text-foreground">
                ENTER THE REALM
              </h1>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {activeChain === "hive"
                  ? "Connect your Hive Keychain to begin your adventure."
                  : activeChain === "robinhood"
                  ? "Connect your Robinhood Chain wallet to begin your adventure."
                  : "Connect your Solana wallet to begin your adventure."}
              </p>
              <span className="mt-3 inline-block text-[10px] font-semibold tracking-widest uppercase px-2 py-1 border border-primary/40 text-primary/70 rounded-sm">
                {activeChain} chain
              </span>
            </div>

            {/* ── Error banner ── */}
            {error && (
              <div className="mb-5 px-4 py-3 rounded-md border border-destructive/50 bg-destructive/10 text-xs text-destructive leading-relaxed">
                {error}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                HIVE flow
            ═════════════════════════════════════════���════════════ */}
            {activeChain === "hive" && (
              <>
                {/* Keychain not detected */}
                {!hiveWalletReady && (
                  <div className="mb-5 px-4 py-3 rounded-md border border-destructive/50 bg-destructive/10 text-xs text-destructive leading-relaxed">
                    <span className="font-semibold">Hive Keychain not detected.</span>{" "}
                    Install the{" "}
                    <a href="https://hive-keychain.com" target="_blank" rel="noreferrer"
                       className="underline underline-offset-2 hover:opacity-80">
                      Hive Keychain browser extension
                    </a>{" "}
                    to sign in.
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label htmlFor="hive-username"
                           className="block text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">
                      Hive Username
                    </label>
                    <div className="flex">
                      <span className="px-3 py-2.5 border border-r-0 border-border rounded-l-md bg-primary/10 text-primary text-sm font-semibold">
                        @
                      </span>
                      <input
                        id="hive-username"
                        type="text"
                        value={hiveUsername}
                        onChange={(e) => { setHiveUsername(e.target.value.replace(/\s/g, "").toLowerCase()); setError(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing && hiveUsername.trim() && hiveWalletReady && step === "idle") void handleHiveLogin(); }}
                        placeholder="youraccount"
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        disabled={step === "signing" || step === "verifying"}
                        className="flex-1 bg-input/40 border border-border rounded-r-md px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground/60 leading-relaxed">
                      Hive Keychain will prompt you to sign a message with your Posting key. No tokens are spent.
                    </p>
                  </div>

                  {step === "signing"   && <p className="text-xs text-primary animate-pulse">Waiting for Hive Keychain approval…</p>}
                  {step === "verifying" && <p className="text-xs text-primary animate-pulse">Verifying signature…</p>}

                  <button
                    type="button"
                    onClick={() => void handleHiveLogin()}
                    disabled={!hiveUsername.trim() || !hiveWalletReady || step === "signing" || step === "verifying"}
                    className="w-full border border-primary text-primary rounded-md px-4 py-2.5 text-sm font-semibold tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {step === "signing"   ? "Waiting for Keychain…"
                     : step === "verifying" ? "Verifying…"
                     : "Sign in with Hive Keychain \u2192"}
                  </button>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════════════════
                ROBINHOOD flow
            ══════════════════════════════════════════════════════ */}
            {activeChain === "robinhood" && (
              <>
                {/* idle: show detected wallets */}
                {(step === "idle" || step === "error") && (
                  <div className="space-y-3">
                    {!scanned && <WalletSkeleton />}
                    {scanned && robinWallets.length === 0 && (
                      <div className="px-4 py-6 border border-border/40 rounded-md text-center">
                        <p className="text-sm text-muted-foreground">No EVM wallets detected.</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          Install{" "}
                          <a href="https://metamask.io" target="_blank" rel="noreferrer" className="underline underline-offset-2">MetaMask</a>
                          {" "}or another Robinhood Chain-compatible wallet.
                        </p>
                      </div>
                    )}
                    {robinWallets.map((w) => (
                      <WalletButton
                        key={w.info.uuid}
                        name={w.info.name}
                        icon={w.info.icon}
                        subtitle="Robinhood Chain"
                        onClick={() => void handleRobinhoodWallet(w)}
                        busy={false}
                        disabled={false}
                      />
                    ))}
                  </div>
                )}

                {/* signing */}
                {step === "signing" && (
                  <p className="text-sm text-muted-foreground text-center py-4 animate-pulse">
                    Check <span className="text-primary font-semibold">{signingWallet}</span> and approve the signature request…
                  </p>
                )}

                {/* username — collect short game name after wallet signed */}
                {step === "username" && (
                  <UsernameStep
                    chainLabel="Robinhood Chain"
                    walletAddress={signedWallet}
                    value={gameUsername}
                    onChange={setGameUsername}
                    onSubmit={() => void handleUsernameSubmit()}
                    busy={false}
                  />
                )}

                {/* verifying */}
                {step === "verifying" && (
                  <p className="text-xs text-primary animate-pulse text-center py-4 tracking-widest">Authenticating…</p>
                )}
              </>
            )}

            {/* ══════════════════════════════════════════════════════
                SOLANA flow
            ══════════════════════════════════════════════════════ */}
            {activeChain === "solana" && (
              <>
                {(step === "idle" || step === "error") && (
                  <div className="space-y-3">
                    {!scanned && <WalletSkeleton />}
                    {scanned && solanaWallets.length === 0 && (
                      <div className="px-4 py-6 border border-border/40 rounded-md text-center">
                        <p className="text-sm text-muted-foreground">No Solana wallets detected.</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          Install{" "}
                          <a href="https://phantom.app" target="_blank" rel="noreferrer" className="underline underline-offset-2">Phantom</a>
                          {", "}
                          <a href="https://solflare.com" target="_blank" rel="noreferrer" className="underline underline-offset-2">Solflare</a>
                          {" "}or another Solana wallet and reload.
                        </p>
                      </div>
                    )}
                    {solanaWallets.map((w) => (
                      <WalletButton
                        key={w.name}
                        name={w.name}
                        icon={w.icon}
                        subtitle="Solana"
                        onClick={() => void handleSolanaWallet(w)}
                        busy={false}
                        disabled={false}
                      />
                    ))}
                  </div>
                )}

                {step === "signing" && (
                  <p className="text-sm text-muted-foreground text-center py-4 animate-pulse">
                    Check <span className="text-primary font-semibold">{signingWallet}</span> and approve the signature request…
                  </p>
                )}

                {step === "username" && (
                  <UsernameStep
                    chainLabel="Solana"
                    walletAddress={signedWallet}
                    value={gameUsername}
                    onChange={setGameUsername}
                    onSubmit={() => void handleUsernameSubmit()}
                    busy={false}
                  />
                )}

                {step === "verifying" && (
                  <p className="text-xs text-primary animate-pulse text-center py-4 tracking-widest">Authenticating…</p>
                )}
              </>
            )}

            {/* Footer */}
            <p className="mt-8 text-xs text-muted-foreground/60 text-center leading-relaxed">
              No password is ever shared with Mythoria.
              <br />
              {activeChain === "hive"
                ? "Your Posting key signature proves wallet ownership."
                : "Your signed message proves wallet ownership."}
            </p>

          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function WalletSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1].map((i) => (
        <div key={i} className="h-14 rounded-md bg-muted/20 border border-border/30 animate-pulse" />
      ))}
    </div>
  );
}

function WalletButton({
  name, icon, subtitle, onClick, busy, disabled,
}: {
  name: string; icon: string; subtitle: string;
  onClick: () => void; busy: boolean; disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-3 w-full px-4 py-3 rounded-md bg-card/30 border border-border/40 hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
    >
      {icon ? (
        <img src={icon} alt="" className="w-9 h-9 rounded-md flex-shrink-0" />
      ) : (
        <span className="w-9 h-9 rounded-md bg-muted/30 flex-shrink-0 flex items-center justify-center text-xs font-bold text-primary">
          {name[0]}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold tracking-wide text-foreground">{name}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
      </div>
      <span className="text-[10px] font-semibold tracking-widest text-primary flex-shrink-0">
        {busy ? "…" : "CONNECT \u2192"}
      </span>
    </button>
  );
}

/**
 * UsernameStep — shown after a Robinhood/Solana wallet has signed.
 * The wallet address is already proven; we just need a short display name.
 */
function UsernameStep({
  chainLabel, walletAddress, value, onChange, onSubmit, busy,
}: {
  chainLabel: string;
  walletAddress: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  const short = walletAddress.length > 12
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    : walletAddress;

  return (
    <div className="space-y-4">
      {/* Wallet confirmed badge */}
      <div className="px-3 py-2 rounded-md bg-primary/10 border border-primary/30 flex items-center gap-2">
        <span className="text-xs font-semibold text-primary">Wallet verified</span>
        <span className="text-xs text-muted-foreground font-mono ml-auto">{short}</span>
      </div>

      <div>
        <label htmlFor="game-username"
               className="block text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">
          Choose your game username
        </label>
        <input
          id="game-username"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\s/g, "").toLowerCase())}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing && value.trim() && !busy) onSubmit(); }}
          placeholder="enter a username"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          disabled={busy}
          className="w-full bg-input/40 border border-border rounded-md px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        />
        <p className="mt-2 text-xs text-muted-foreground/60 leading-relaxed">
          This is your in-game display name on {chainLabel}. Lowercase letters and numbers only.
        </p>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!value.trim() || busy}
        className="w-full border border-primary text-primary rounded-md px-4 py-2.5 text-sm font-semibold tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {busy ? "Verifying…" : "Enter the Realm \u2192"}
      </button>
    </div>
  );
}

// ─── Page export ─────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-background text-muted-foreground text-sm">
        Loading…
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
