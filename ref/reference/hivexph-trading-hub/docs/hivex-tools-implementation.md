# HiveX Tools — Implementation Plan

HiveX Tools is the home for all HiveX-powered services that sit on top of the
`hivexph.voter` account. It evolves the current "vote bot" page into a
**HiveX Growth Engine** with delegation rewards, post promotion, featured
listings, Hive account creation, curation trails, and
a unified burn-to-credit economy.

This document is **frontend + API contracts only**. No server/backend code
is implemented here — only the shapes the UI will call. The backend team
(or a later phase) will implement the listed `POST` endpoints.

---

## 1. Vision

Transform `/voter` (current demo) into `/tools` — the **HiveX Tools** hub.

Pipelines we are enabling:

```
HP  -> RC  -> ACT  -> Hive Accounts
HP  -> Votes -> Post Promotion / Featured Listings
HIVEX -> Burn -> Vote Credits -> Services
Delegators -> Rewards (HIVEX revenue share)
```

The `hivexph.voter` account is the shared treasury / engine account that
powers every tool.

---

## 2. Page / Route Structure

New route layout under `src/routes/`:

```
_app.tools.tsx                 # layout, sidebar of tools (Outlet)
_app.tools.index.tsx           # dashboard (engine stats + quick actions)
_app.tools.delegate.tsx        # HP delegation program
_app.tools.promote.tsx         # post promotion marketplace
_app.tools.accounts.tsx        # Hive account creation (ACT burner)
_app.tools.trail.tsx           # curation trail follower

_app.tools.rewards.tsx         # my delegation + claimable HIVEX
```

The existing `_app.voter.tsx` becomes a redirect to `/tools` (or is
deleted once `/tools/index` is live). Update `app-shell.tsx` nav:
rename "HiveX Voter" -> "HiveX Tools", icon `Wrench` (keep `Vote` as a
sub-nav icon for the promotion tool).

---

## 3. Dashboard (`/tools`)

Replace the current HP/HIVE/HBD/RC cards with engine-level metrics:

| Card | Source |
| --- | --- |
| Delegated HP (total received by `hivexph.voter`) | Hive `condenser_api` |
| Current Vote Value (USD) | derived from vests + reward fund |
| Delegator APR | `POST /api/public/tools/engine-stats` |
| RC Available | Hive `rc_api.find_rc_accounts` |
| ACT Available | Hive `condenser_api.get_accounts` -> `pending_claimed_accounts` |
| Treasury Balance (HIVEX) | Hive-Engine API |
| HIVEX Burned (lifetime) | `POST /api/public/tools/engine-stats` |
| Accounts Created (lifetime) | `POST /api/public/tools/engine-stats` |

Quick action buttons: **Delegate HP**, **Buy HIVEX**, **Submit Post**,
**Create Account**.

---

## 4. Feature Modules

Each module is a route + a small set of API contracts. All write
operations are signed by the user via Hive Keychain (already wired in
`src/hooks/useHiveKeychain.ts`); the backend only confirms / records.

### 4.1 HP Delegation Program (`/tools/delegate`)
- Input: HP amount, slider for quick presets (100 / 500 / 1k / 5k / 10k).
- "Delegate" button -> Keychain `requestDelegation` to `hivexph.voter`.
- Show "My Delegation", "Expected Monthly HIVEX", "APR", "Claimable HIVEX".

### 4.2 Post Promotion (`/tools/promote`)
- Paste post URL, choose tier (Small 25 / Medium 100 / Premium 500 HIVEX).
- Displays the user's HIVEX token balance, selected tier pricing, and expected balance after promotion.
- "Promote" -> Keychain `requestCustomJson` burning HIVEX to `null`.

### 4.3 Hive Account Creation (`/tools/accounts`) — PRIMARY FOCUS
- Desired username (live availability check via Hive RPC).
- Auto-generate keys client-side (use `@hiveio/dhive` `PrivateKey.fromLogin`).
  Display owner / active / posting / memo + master password with a
  "Download keys" button. **Do not send private keys to any backend.**
- "Create" -> `POST /api/public/tools/accounts/create` with **public keys
  only** + burn proof. Backend uses ACT from `hivexph.voter` inventory.
- Show "Available ACTs", "Today's ACT Production", "Accounts Created".

### 4.4 Curation Trail (`/tools/trail`)
Informational page that guides users to follow the `@hivexph.voter`
trail on **[hive.vote](https://hive.vote)** (third-party automation
service by Hive Witness @mahdiyari). No on-chain broadcast happens
from HiveX — users log in to hive.vote with Hivesigner, open Curation
Trail, search `hivexph.voter`, and click Follow. HiveX does not need
its own follow endpoint or custom_json.


### 4.5 Delegator Governance — REMOVED
Not part of the HiveX scope. Engine parameters are managed by the core
team; delegators express preferences via delegation amount, not on-chain
proposal votes.

### 4.6 Rewards (`/tools/rewards`)
My delegation history, accrued HIVEX, "Claim" -> `POST /tools/rewards/claim`.

### 4.7 P2P Offer Boosting (no dedicated page)
There is **no Featured Listings module** — that idea is dropped. Offer
ranking on `/p2p` is derived directly from each merchant's HP
delegation to `@hivexph.voter`: more delegation -> higher placement.
Delegators are automatically boosted; non-delegators are not. This
will be implemented by sorting `/p2p` results by
`get_vesting_delegations(merchant)` once the delegation index is
available.

---

## 5. API Contracts (POST only)

All endpoints live under `/api/public/tools/*` so external callers and the
frontend share the same surface. **Backend implementation is out of scope
for this PR** — only contracts are listed.

Common error shape: `{ "ok": false, "error": "<message>" }` with
`400 / 401 / 409 / 500` as appropriate.

### 5.1 `POST /api/public/tools/delegations/record`
```jsonc
// request
{ "delegator": "alice", "vests": "12345.678901 VESTS", "tx_id": "abc..." }
// response
{ "ok": true, "hp": 53.21, "expected_monthly_hivex": 12.5, "apr": 0.185 }
```

### 5.2 `POST /api/public/tools/promotions/submit`
```jsonc
{ "author": "alice", "permlink": "my-post", "tier": "medium", "burn_tx": "..." }
// -> { "ok": true, "scheduled_at": "2026-06-18T12:00:00Z", "vote_weight": 4200 }
```

### 5.3 `POST /api/public/tools/accounts/create`
Client sends the **public keys only** plus burn proof. Server uses an ACT
from `hivexph.voter` inventory.
```jsonc
{
  "new_account": "alice123",
  "owner": "STM...", "active": "STM...",
  "posting": "STM...", "memo": "STM...",
  "burn_tx": "...",
  "referrer": "alice"
}
// -> { "ok": true, "tx_id": "..." }
```

### 5.4 `POST /api/public/tools/trail/follow` — REMOVED
Curation Trail is fully delegated to hive.vote — no HiveX endpoint
required.


### 5.5 `POST /api/public/tools/governance/vote` — REMOVED
Governance module is out of scope.

### 5.6 `POST /api/public/tools/rewards/claim`
```jsonc
{ "delegator": "alice" }
// -> { "ok": true, "amount_hivex": "12.345", "tx_id": "..." }
```

### 5.7 `POST /api/public/tools/engine-stats`
No body. Returns dashboard payload:
```jsonc
{
  "delegated_hp": 53000,
  "vote_value_usd": 4.2,
  "delegator_apr": 0.185,
  "rc_pct": 0.97,
  "act_available": 67,
  "act_daily_production": 3.4,
  "treasury_hivex": "120345.00",
  "hivex_burned_total": "98765.00",
  "accounts_created_total": 412
}
```

---

## 6. Step-by-Step Implementation (frontend only)

Each step is shippable on its own.

Status legend: ✅ done · 🟡 in progress · ⬜ not started

1. ✅ **Scaffold the hub.** Create `_app.tools.tsx` layout + `_app.tools.index.tsx`
   dashboard. Add nav entry in `src/components/app-shell.tsx` ("HiveX Tools",
   icon `Wrench`). Keep the old `/voter` route as a deprecation redirect.
   - `_app.tools.tsx` (layout) + `_app.tools.index.tsx` (dashboard) live.
   - `/voter` now redirects to `/tools`.
   - Sidebar entry renamed to "HiveX Tools" (`Wrench` icon).
2. ✅ **Engine stats fetcher.** Add `src/lib/fetchers/tools.ts` with
   `fetchEngineStats()` calling `POST /api/public/tools/engine-stats`. Fall
   back to client-side Hive RPC for HP / RC / ACT so the dashboard renders
   even before the backend exists (demo-mode `Badge`).
   - `fetchEngineStats()` tries backend first, then falls back to
     `condenser_api` + `rc_api` + `pending_claimed_accounts` for ACT.
   - Dashboard badge flips between "Live" / "Demo Preview" based on source.
3. ✅ **Account Creation page.** Build `_app.tools.accounts.tsx`:
   - `bun add @hiveio/dhive` for `PrivateKey.fromLogin`.
   - username availability check via `condenser_api.get_accounts`.
   - generate keys client-side, render with copy + download buttons.
   - "Create" -> `POST /api/public/tools/accounts/create` with **public
     keys only**. Burn proof comes from a Keychain custom_json.
   - show "Available ACTs" from dashboard data.
   - `@hiveio/dhive@1.3.6` installed.
   - Debounced availability check (400ms) with inline status icon.
   - Local key generation: random master password -> `PrivateKey.fromLogin`
     for owner / active / posting / memo. Private keys never leave the browser.
   - Copy buttons per key + "Download .txt" with full keys + warnings.
   - "Create" posts public keys only to `/api/public/tools/accounts/create`;
     fails gracefully into demo-mode message until backend ships.
   - **Pending:** wire an on-chain HIVEX burn (Keychain custom_json) as
     proof of payment once token economics are finalised.
4. ✅ **Delegation page.** `_app.tools.delegate.tsx` with Keychain
   `requestDelegation`, then `POST /tools/delegations/record`. Show "My
   Delegation", expected monthly HIVEX, APR cards.
   - Presets: 100 / 500 / 1k / 5k / 10k HP + free-form input.
   - HP → VESTS conversion uses live `get_dynamic_global_properties`.
   - Signs `delegate_vesting_shares` via `broadcast()` (Active key).
   - Best-effort `POST /api/public/tools/delegations/record`; silent if
     backend isn't live yet.
   - "My Delegation" card pulls `condenser_api.get_vesting_delegations`
     filtered to `hivexph.voter`. "Undelegate all" button signs a
     zero-VESTS delegation.
   - APR (18.5%) and HIVEX/HIVE ratio are placeholders until the engine
     publishes real numbers (badge: "Demo APR").
5. ✅ **Post Promotion page.** Tier picker + Keychain burn + `POST
   /tools/promotions/submit`. Show vote schedule + expected weight.
   - URL parser extracts `author`/`permlink` from peakd / hive.blog / ecency.
   - Tier picker: Small 25 / Medium 100 / Premium 500 HIVEX.
   - Burn flow: Hive-Engine `sendToken(user, "null", cost, memo, "HIVEX")`
     via Keychain (Active). Memo encodes action + author + permlink + tier.
   - Best-effort `POST /api/public/tools/promotions/submit` after burn.
6. ❌ **Featured Listings page.** Removed by product decision. P2P offer
   ranking is now driven by HP delegation to `@hivexph.voter` instead —
   see § 4.7 and step 10 below.
7. ✅ **Rewards page.** Show accrued HIVEX (from stats), `POST
   /tools/rewards/claim` button.
   - Pulls each user's HP delegation to `hivexph.voter` via
     `get_vesting_delegations`. Computes estimated monthly HIVEX from
     APR × HP ÷ 12 until the backend publishes real accruals.
   - "Claim rewards" posts to `/api/public/tools/rewards/claim`; falls
     back to a friendly demo message if the endpoint isn't live.
   - Empty state links to `/tools/delegate`.
8. ✅ **Curation Trail page.** Informational walkthrough that sends users to **hive.vote** to follow `@hivexph.voter`.
   - Step-by-step guide (open hive.vote → Hivesigner login → Curation Trail → follow `hivexph.voter`), deep-link button to hive.vote, FAQ link. No Keychain broadcast and no backend endpoint — trail mirroring is fully handled by hive.vote.

9. ❌ **Governance page.** Removed by product decision — not part of HiveX scope.
   - Displays mock proposal board for community support, pricing, and rewards rules.
   - Live voting with Keychain `requestCustomJson` posting `hivex_gov_vote` with user HP delegation weight.
10. ✅ **Polish.** Replace `/voter` with redirect to `/tools`. Update index to reference HiveX Tools.
    - Router redirect in place, dashboard links updated.
11. ⬜ **P2P sort-by-delegation.** Sort `/p2p` offers by each merchant's
    HP delegation to `@hivexph.voter` (descending). Replaces the removed
    Featured Listings module. Out of scope for this phase; will need a
    backend-side delegation index for performance.

---

## 9. Progress Log

- **2026-06-18 — Curation Trail simplified.**
  - `/tools/trail` rewritten as an informational guide that hands users off to **hive.vote** to follow `@hivexph.voter`. No more in-app weight slider or custom_json broadcast — hive.vote already handles trail mirroring end-to-end.
- **2026-06-18 — Phase 8, 9, & 10 shipped!**

  - Governance module removed per product decision (not in HiveX scope).
  - Sidebar links and layout updated to mark all components live and clickable.
  - Progress tracker updated.
- **2026-06-18 — Phase 5 + 7 shipped, Phase 6 removed.**
  - `/tools/promote` live: post-URL parser, three burn tiers, HIVEX
    `sendToken` to `null` via Keychain + optimistic backend POST.
  - `/tools/rewards` live: HP-delegation lookup, estimated claimable
    HIVEX, claim button posting to `/api/public/tools/rewards/claim`.
  - Featured Listings dropped — replaced by future P2P sort-by-delegation
    (recorded as step 11). Dashboard tile + API contract removed.
  - Next up: **Phase 8 — Curation Trail.**
- **2026-06-18 — Phase 4 shipped.**
  - `/tools/delegate` live: amount input + presets, on-chain
    `delegate_vesting_shares` via Keychain, "My Delegation" lookup,
    undelegate-all, optimistic backend `POST` to
    `/api/public/tools/delegations/record`.
  - Next up: **Phase 5 — Post Promotion page.**
- **2026-06-18 — Phase 1 + 2 + 3 shipped.**
  - Hub scaffold (`/tools`) with dashboard, engine-stats fetcher with
    chain fallback, and `/voter -> /tools` redirect.
  - Account Creation page (`/tools/accounts`) with debounced availability,
    client-side key generation via `@hiveio/dhive`, copy + download, and a
    POST hook that degrades to demo mode until the backend exists.
  - Next up: **Phase 4 — Delegation page.**

---

## 7. Security Notes

- **Never** send private keys or master passwords to the server. Account
  creation submits public keys only; the master password stays on the
  user's device for download.
- Every write endpoint must verify either a Hive-signed payload or a
  burn-transaction proof on-chain before acting.
- The `hivexph.voter` active key lives in backend secrets only — the
  frontend never sees it. Treasury-signed operations (account creation,
  rewards claim) go through the POST endpoints.
- Rate-limit `/accounts/create` and `/promotions/submit` per IP + per
  Hive account to prevent ACT / vote draining.

---

## 8. Out of Scope (for this PR)

- Any server function or edge route implementation.
- Database schema / Lovable Cloud tables.
- On-chain treasury multisig setup.

These will be addressed in a follow-up backend plan once the frontend +
contracts in this document are approved.
