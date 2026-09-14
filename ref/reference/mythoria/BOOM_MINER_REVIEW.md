# Boom Miner Multi-Chain Auth System Review

## Overview
The boom-miner project implements a flexible **multi-chain login system** supporting Solana, Robinhood (EVM), and Hive. We need to adapt this architecture for **Mythoria (Hive-only)** with player usernames and persistent authentication.

---

## Key Architectural Patterns

### 1. **Chain Configuration Strategy**

**boom-miner approach:**
```
lib/config/config.ts — Central config
├─ Reads NEXT_PUBLIC_CHAIN (env var, baked at build time)
├─ Reads CHAIN (server-only fallback)
└─ Exports config object with per-chain settings (RPC, token address, etc.)

lib/client/chain.ts — Client-safe chain reader
└─ Reads NEXT_PUBLIC_CHAIN only (no server env vars)

lib/config/branding.ts — Per-chain UI branding
└─ Stateless map: chain → { gameName, tokenName, logo, etc. }
```

**For Mythoria:**
- We deploy single-chain (Hive only), so NEXT_PUBLIC_CHAIN="hive" is constant
- No need for config.blockchain per-chain RPC/contract settings (only needed for payments, which Mythoria doesn't have yet)
- Branding map can stay but will only have hive entry
- **Implication:** Much simpler — no build-time chain selection needed; Hive is hardcoded

---

### 2. **Wallet Adapter Pattern**

**boom-miner structure:**
```
lib/auth/wallet-adapters/
├─ hive.ts       — isHiveKeychainAvailable(), signInWithHiveKeychain()
├─ solana.ts     — Phantom wallet adapter
└─ robinhood.ts  — MetaMask adapter
```

**Hive adapter key functions:**
- `signInWithHiveKeychain(username: string)` — client-side promise
  - Calls `window.hive_keychain.requestSignBuffer(username, message, 'Posting', callback)`
  - Returns `{ wallet, signature, message, publicKey }`
  
- `HiveKeychainResponse` interface — typed Keychain callback response

**For Mythoria:**
- Keep the same Hive adapter as-is (already correct)
- Only need Hive, so no other adapters
- **Implication:** Import and use `signInWithHiveKeychain()` directly in login page

---

### 3. **Server-Side Signature Verification**

**boom-miner structure:**
```
lib/auth/verify-signature.server.ts
├─ getActiveChain() — reads CHAIN env var
├─ verifySolana() — ed25519 via tweetnacl
├─ verifyRobinhood() — EIP-191 (EVM) via ethers
├─ verifyHive() — Hive RPC query + signature check (STUB)
└─ verifyWalletSignature(opts) — dispatcher
```

**Hive verification current state:**
```typescript
async function verifyHive(wallet, message, signature) {
  // Query Hive API for account posting keys
  const account = await condenser_api.get_accounts([wallet]);
  const postingKeys = account.posting.key_auths;
  
  // TODO: Use @hiveio/hive-js to recover public key from signature
  // and verify it matches one of the posting keys
  
  // Currently just checks account exists (dev stub)
  return postingKeys.length > 0;
}
```

**For Mythoria:**
- Implement real signature recovery using `@hiveio/hive-js` (or `dhive`)
- **Key difference from boom-miner stub:**
  - Message format: `mythoria:login:<username>:<nonce>:<timestamp>`
  - Recover public key from the base64 signature
  - Fetch account's posting keys from Hive RPC
  - Verify recovered key matches one of the posting keys
- **Implication:** Need to add `@hiveio/hive-js` or `dhive` as a dependency

---

### 4. **JWT Token Strategy**

**boom-miner approach:**
```typescript
// lib/auth/jwt.ts
signToken({ wallet: string }) → string
verifyToken(token: string) → { wallet: string } | null
```

- Token payload: `{ wallet, iat, exp }`
- Token stored in httpOnly cookie (set by `/api/auth/login`)
- Token also stored in localStorage for client checks

**For Mythoria (our change):**
```typescript
// lib/auth/jwt.ts
signToken({ wallet: string; username: string }) → string
verifyToken(token: string) → { wallet: string; username: string } | null
```

- Token payload: `{ wallet, username, iat, exp }`
- Same storage pattern (httpOnly + localStorage)
- **Implication:** Username becomes available on all client components that decode the token

---

### 5. **Login Flow Architecture**

**boom-miner flow:**

```
User enters wallet (username)
        ↓
LoginCard component (client)
├─ Calls wallet-adapter (e.g., signInWithHiveKeychain)
│  └─ Returns { wallet, signature, message }
│
└─ POST /api/auth/login
   ├─ { wallet, signature, message }
   ├─ Server: verifyWalletSignature()
   ├─ Server: findPlayerByWallet()
   │  └─ If not found → 404 NOT_REGISTERED
   │
   └─ If 404 → Client auto-calls POST /api/auth/register
      ├─ Creates new player in DB
      └─ Returns token
   
   If 200 → Client stores token + redirects to /game

Client: localStorage.setItem('bm_token', token)
Client: hydrate gameStore with player data
Client: router.push('/game')
```

**For Mythoria:**

```
User enters username
        ↓
LoginPageContent (client)
├─ Calls signInWithHiveKeychain(username)
│  └─ Returns { wallet, signature, message }
│
└─ POST /api/auth/login
   ├─ { wallet: username, signature, message }
   ├─ Server: verifyWalletSignature(chain='hive', wallet, message, signature)
   ├─ Server: upsertPlayer(wallet, username) ← auto-creates if needed
   ├─ Server: signToken(wallet, username)
   │  └─ Token includes both wallet and username
   │
   └─ Response: { token, chain: 'hive', player: { ... } }

Client: localStorage.setItem('mythoria_token', token)
Client: Set cookie bm_token via Set-Cookie header (server handles)
Client: hydrate gameStore
Client: router.push('/play')
```

**Key differences:**
1. For Hive, `wallet === username` (Hive is name-based, not address-based)
2. No separate register endpoint — login upserts automatically
3. Token includes username; player model makes username required
4. Chain is never passed by client, determined server-side from `getActiveChain()`

---

### 6. **Auth Guard Pattern (Protected Routes)**

**boom-miner approach:**
```typescript
// components/login/LoginCard.tsx
const branding = chainBranding[activeChain];
// Uses activeChain (from NEXT_PUBLIC_CHAIN) for UI branding

// app/(game)/layout.tsx (client component, our addition for Mythoria)
const isLoggedIn = useGameStore((s) => s.isLoggedIn);

useEffect(() => {
  if (!isLoggedIn) {
    const current = window.location.pathname;
    router.replace(`/login?redirect=${encodeURIComponent(current)}`);
  }
}, [isLoggedIn, router]);

if (!isLoggedIn) return null;  // Render nothing while redirecting
return <>{children}</>;
```

**Middleware layer (what boom-miner shows but Mythoria should adopt):**
```typescript
// middleware.ts — Edge Runtime
export function middleware(request: NextRequest) {
  const token = request.cookies.get('mythoria_token')?.value;
  
  if (!token && request.nextUrl.pathname.startsWith('/(game)')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/(game)/:path*'],
};
```

**Why both layers:**
1. **Middleware:** Fast edge-level check (just cookie presence), redirects before server renders
2. **Layout:** Client-side verification (decodes token, checks expiry), handles edge cases

---

### 7. **Branding & UI State Management**

**boom-miner branding pattern:**
```typescript
// Any component that needs chain-specific UI:
import { activeChain } from '@/lib/client/chain';
import { chainBranding } from '@/lib/config/branding';

const branding = chainBranding[activeChain];
// Use branding.gameName, branding.tokenName, branding.logo, etc.
```

**For Mythoria:**
- Branding map has only `hive` entry
- `activeChain` is always `"hive"` (constant)
- Still use the pattern for consistency and future extensibility
- Logo, game name, token name all come from branding (not hardcoded)

---

### 8. **Game Store Integration**

**boom-miner pattern:**
```typescript
// features/store/gameStore.ts
export const useGameStore = create<GameStore>((set) => ({
  activeUser: '',
  isLoggedIn: false,
  
  hydrate: (payload) => set({
    activeUser: payload.player.wallet,
    isLoggedIn: true,
    players: { [payload.player.wallet]: payload.player },
    // ... more hydration
  }),
}));
```

**For Mythoria changes:**
```typescript
// features/game-store/game-store.ts
activeUser: string;          // username (not wallet)
isLoggedIn: boolean;         // derived from token presence
mythoria_token: string | null;

login: (token, username) => {
  set({ activeUser: username, isLoggedIn: true, mythoria_token: token });
  localStorage.setItem('mythoria_token', token);
};

logout: () => {
  set({ activeUser: '', isLoggedIn: false, mythoria_token: null });
  localStorage.removeItem('mythoria_token');
  // Also delete cookie (via /api/auth/logout)
};
```

---

## Mythoria-Specific Adaptations

### Single-Chain Implications

| Aspect | boom-miner | Mythoria |
|--------|-----------|----------|
| **Build config** | NEXT_PUBLIC_CHAIN env var | Hardcoded "hive" |
| **Chain switching** | Different deployments per chain | N/A |
| **Signature verification** | Dispatcher to 3 methods | Single Hive method |
| **Token payload** | `{ wallet }` | `{ wallet, username }` |
| **Player model** | `wallet` (address or username) | `wallet` = Hive username, with `username` field |
| **Registration** | Separate endpoint | Auto-upsert on login |
| **UI branding** | Dynamic per chain | Static Hive branding |

### Implementation Order

1. **Add `@hiveio/hive-js` dependency** for real signature verification
2. **Update Player model** — add username field, make it required + unique
3. **Update JWT** — include username in payload
4. **Implement real Hive verification** in `lib/chain/hive/verify.ts`
5. **Convert login page to client component** with Keychain flow
6. **Create (game) route group** with auth layout
7. **Add middleware.ts** for cookie-based edge-level guard
8. **Update game store** with login/logout/isAuthenticated
9. **Update nav** to show username + logout when authenticated

---

## Code Snippets Reference

### Hive Verification Pattern (from boom-miner stub → real)

```typescript
// CURRENT (boom-miner stub):
async function verifyHive(wallet, message, signature) {
  const res = await fetch('https://api.hive.blog', {
    method: 'POST',
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'condenser_api.get_accounts',
      params: [[wallet]],
      id: 1,
    }),
  });
  const { result } = await res.json();
  return result?.[0]?.posting?.key_auths?.length > 0;
}

// NEEDED FOR MYTHORIA (pseudocode):
import { PrivateKey } from '@hiveio/hive-js'; // or dhive

async function verifyHive(wallet, message, signature) {
  // 1. Recover public key from signature
  const pubKey = recoverPublicKey(message, signature);
  
  // 2. Fetch account's posting keys from Hive
  const account = await fetchHiveAccount(wallet);
  const postingKeys = account.posting.key_auths.map(([k]) => k);
  
  // 3. Check if recovered key matches one of the posting keys
  return postingKeys.includes(pubKey);
}
```

### Login Page Flow (Client)

```typescript
// app/login/page.tsx
'use client';

const [username, setUsername] = useState('');
const [error, setError] = useState('');

async function handleLogin(e) {
  e.preventDefault();
  
  // 1. Sign with Keychain
  const result = await signInWithHiveKeychain(username);
  
  // 2. Send to API
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      wallet: result.wallet,      // username
      signature: result.signature,
      message: result.message,
    }),
  });
  
  const { token, player } = await res.json();
  
  // 3. Store & redirect
  localStorage.setItem('mythoria_token', token);
  hydrate({ player });
  router.push('/play');
}
```

### Auth Layout (Protected Route)

```typescript
// app/(game)/layout.tsx
'use client';

export default function GameLayout({ children }) {
  const router = useRouter();
  const isLoggedIn = useGameStore((s) => s.isLoggedIn);
  
  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/login');
    }
  }, [isLoggedIn, router]);
  
  if (!isLoggedIn) return null;
  return <>{children}</>;
}
```

---

## Summary: What to Adopt from boom-miner

✅ **Wallet adapter pattern** — Keep `lib/auth/wallet-adapters/hive.ts` as-is  
✅ **Server-side verification dispatcher** — Adapt `verifyWalletSignature()` to call Hive-only  
✅ **JWT pattern** — Add username to token payload  
✅ **Auth guard layout + middleware** — Use same approach (client layout + Edge middleware)  
✅ **Branding map pattern** — Keep for consistency (even if single chain)  
✅ **Token storage** — httpOnly cookie + localStorage  
✅ **Game store structure** — Add login/logout actions + isAuthenticated state  

❌ **Multi-chain dispatcher** — Simplify to Hive-only  
❌ **Per-chain config settings** — Not needed (no blockchain operations)  
❌ **Multiple login components** — Only need LoginHive  
❌ **Chain selection UI** — Not applicable  

---

## Next Steps

1. Read `routing-auth-plan.md` for Mythoria implementation specifics
2. Install `@hiveio/hive-js` or `dhive`
3. Implement real Hive signature verification in `lib/chain/hive/verify.ts`
4. Restructure routes and add auth guards following the plan
5. Test login flow end-to-end with Hive Keychain extension
