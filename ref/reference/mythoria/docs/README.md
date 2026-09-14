# Terracore External APIs

Reference for the public Terracore game APIs consumed (or potentially consumed) by this app. Each endpoint below has a corresponding `*.schema.json` file under [`./api/`](./api/) describing the shape of the response (types only, no live data).

Base URL: `https://api.terracoregame.com`

Replace `mirafun` with the target username where applicable.

## Player

| Endpoint | Method | Schema |
|---|---|---|
| `/player/{username}` | GET | [`api/player.schema.json`](./api/player.schema.json) |

## Battle

| Endpoint | Method | Query params | Schema |
|---|---|---|---|
| `/battle` | GET | `limit`, `offset`, `maxDefense` | [`api/battle.schema.json`](./api/battle.schema.json) |

## Quests

| Endpoint | Method | Schema |
|---|---|---|
| `/quest_board?username={username}` | GET | [`api/quest_board.schema.json`](./api/quest_board.schema.json) |
| `/quests/{username}` | GET | [`api/quests.schema.json`](./api/quests.schema.json) |

## Inventory & Logs

| Endpoint | Method | Schema |
|---|---|---|
| `/items/{username}` | GET | [`api/items.schema.json`](./api/items.schema.json) |
| `/nft_logs/{username}` | GET | [`api/nft_logs.schema.json`](./api/nft_logs.schema.json) |
| `/forge_logs/{username}` | GET | [`api/forge_logs.schema.json`](./api/forge_logs.schema.json) |
| `/salvage_logs/{username}` | GET | [`api/salvage_logs.schema.json`](./api/salvage_logs.schema.json) |
| `/claim_logs/{username}` | GET | [`api/claim_logs.schema.json`](./api/claim_logs.schema.json) |

## Marketplace

| Endpoint | Method | Schema |
|---|---|---|
| `/marketplace/listings/items` | GET | [`api/marketplace_items.schema.json`](./api/marketplace_items.schema.json) |
| `/marketplace/listings/relics` | GET | [`api/marketplace_relics.schema.json`](./api/marketplace_relics.schema.json) |
| `/marketplace/listings/consumables` | GET | [`api/marketplace_consumables.schema.json`](./api/marketplace_consumables.schema.json) |
| `/marketplace_logs?action=purchase&limit=200&offset=1` | GET | [`api/marketplace_logs.schema.json`](./api/marketplace_logs.schema.json) |
| `/marketplace_logs/{username}` | GET | [`api/marketplace_logs_user.schema.json`](./api/marketplace_logs_user.schema.json) |

The per-user endpoint (`/marketplace_logs/{username}`) returns a raw JSON array (no `totalPages` wrapper) of every marketplace event involving that user as buyer or seller. `action` is one of `purchase`, `transfer`, or `cancel`. For non-purchase actions, `price` and `marketplace` may be `null`; for transfers, `buyer` is the recipient; for cancels, `buyer` is `null`.

Note: `https://www.terracoregame.com/{username}/market_logs` is a web page (SPA HTML), not a JSON API — no schema captured.


## Leaderboard

| Endpoint | Method | Query params | Schema |
|---|---|---|---|
| `/leaderboard` | GET | `limit`, `offset` | [`api/leaderboard.schema.json`](./api/leaderboard.schema.json) |

## Schema format

Each `*.schema.json` mirrors the response structure with primitive type names (`"string"`, `"integer"`, `"number"`, `"boolean"`, `"null"`) in place of values. Arrays are represented as a single-element list; for arrays of objects, keys from all sampled items are merged so optional fields are visible.

---

## Simulated (local) endpoints

The app ships with a deterministic mock backend that mirrors every upstream shape above, served under `/api/mock/*` by TanStack server routes. Data is generated from a seeded PRNG keyed off `citizen1`…`citizen10`, so responses are stable across reloads. TypeScript types live in [`src/mock/types.ts`](../src/mock/types.ts); the dataset builder is [`src/mock/dataset.ts`](../src/mock/dataset.ts); the Zustand store that consumes the routes is [`src/stores/game-store.ts`](../src/stores/game-store.ts).

| Upstream | Simulated |
|---|---|
| `/player/{username}` | `/api/mock/player/{username}` |
| `/battle` | `/api/mock/battle` |
| `/quest_board` | `/api/mock/quest_board` |
| `/quests/{username}` | `/api/mock/quests/{username}` |
| `/items/{username}` | `/api/mock/items/{username}` |
| `/nft_logs/{username}` | `/api/mock/nft_logs/{username}` |
| `/forge_logs/{username}` | `/api/mock/forge_logs/{username}` |
| `/salvage_logs/{username}` | `/api/mock/salvage_logs/{username}` |
| `/claim_logs/{username}` | `/api/mock/claim_logs/{username}` |
| `/marketplace/listings/items` | `/api/mock/marketplace/listings/items` |
| `/marketplace/listings/relics` | `/api/mock/marketplace/listings/relics` |
| `/marketplace/listings/consumables` | `/api/mock/marketplace/listings/consumables` |
| `/marketplace_logs` | `/api/mock/marketplace_logs` |
| `/marketplace_logs/{username}` | `/api/mock/marketplace_logs/{username}` |
| `/leaderboard` | `/api/mock/leaderboard` |

Swap in the real backend by changing the `BASE` constant in `src/stores/game-store.ts`.
