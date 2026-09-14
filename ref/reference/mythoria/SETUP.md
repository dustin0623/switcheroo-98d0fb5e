# Mythoria — Self-Hosted Setup Guide

This guide covers everything you need to configure when running Mythoria on
Coolify (or any self-hosted Docker / compose environment).

---

## 1. Environment Variables

Copy `.env.example` to `.env` and fill in every value before starting the app.

| Variable | Description |
|---|---|
| `MONGODB_URI` | Full MongoDB connection string (e.g. `mongodb://user:pass@host:27017/mythoria`) |
| `NEXTAUTH_SECRET` | Random 32-byte secret — generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Public base URL of the app (e.g. `https://mythoria.yourdomain.com`) |

---

## 2. Scheduled Tasks

### Quest Board — daily reset

The quest board resets automatically every day using **lazy generation**. No
external cron job is required.

When a player opens the quest board, the API checks whether a board already
exists for the current UTC date. If not (i.e. the day rolled over since the
last visit), it generates a fresh board of 6 slots from the active quest
templates and caches it in MongoDB. Every subsequent request that day reads
the cached doc instantly.

This means:
- No cron daemon or scheduler is needed.
- The first player to visit after midnight pays a one-time ~200 ms generation
  cost; all others get the cached result.
- If no one visits on a given day the board is simply generated on the next
  visit — no gaps or errors.

---

## 3. MongoDB Indexes (recommended)

Run these once after the database is created to ensure query performance:

```js
// quest_boards — one board per date
db.quest_boards.createIndex({ date: 1 }, { unique: true });

// active_quests — fast lookup by player wallet
db.active_quests.createIndex({ player_wallet: 1, status: 1 });
db.active_quests.createIndex({ quest_board_slot_id: 1 });

// quest_templates — filter active templates
db.quest_templates.createIndex({ is_active: 1 });
```

---

## 4. Seeding Quest Templates

Quest templates are the base definitions that the board generator picks from.
Seed them once from the reference smart-contract scripts:

```bash
node reference/TerraCore-Smart-Contract/scripts/seed-quest-templates.js
```

Make sure `MONGODB_URI` is set in the environment before running the script.

---

## 5. Health Check

A simple way to verify the app is running and the database is connected:

```bash
curl https://<YOUR_DOMAIN>/api/health
```

Expected response:

```json
{ "ok": true }
```
