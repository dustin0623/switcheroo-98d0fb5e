# CryptoCore

CryptoCore MVP - Lovable AI Full Prompt

Project Overview

Create a modern web-based idle crypto mining game called CryptoCore.

The in-game token is $HASH.

The game is inspired by TerraCore's progression loop, but simplified into a mining game. The focus is on collecting NFT equipment, mining HASH, raiding other players, opening chests, and upgrading permanent player stats.

This is an MVP only.

Do NOT use any backend or database.

Store everything using Zustand + localStorage persistence.

The application should be fully componentized and production-ready so replacing Zustand with Supabase later will be straightforward.

Tech Stack

Use:

React

TypeScript

Vite

TailwindCSS

shadcn/ui

Zustand

React Router

Framer Motion

Lucide Icons

Do NOT use:

Firebase

Supabase

MongoDB

Prisma

API routes

Everything should run locally using Zustand.

Theme

Modern dark dashboard.

Color palette:

Background:
#0B1220

Card:
#111827

Primary:
Bitcoin Orange (#F7931A)

Accent:
Solana Purple (#9945FF)

Success:
#22C55E

Danger:
#EF4444

Use rounded cards with soft shadows.

Animations should feel smooth and premium.

Core Gameplay

Player owns mining equipment.

Mining equipment increases Hash Rate.

Hash Rate continuously mines HASH.

HASH accumulates inside a Vault.

Player decides whether to

Claim HASH

Risk leaving it inside the vault

Leaving HASH inside the vault allows other players to steal it.

Pages

Create these pages.

Dashboard

Mining Rig

Stats

Raid

Chests

Marketplace (UI only)

Profile

Settings

Dashboard

Show

Current Vault

Current Hash Rate

Mining Speed

Claim Button

Current HASH

Mining Progress

Recent Activity

Top Stats

Quick Navigation

Vault should increase every second.

Mining Formula

Mining should update every second.

Formula

Mining/sec

=

Total Hash Rate

×

Mining Multiplier

For MVP

Mining Multiplier = 1

Vault

Vault stores mined HASH.

Vault Capacity Formula

capacity

=

100

Vault Level × 20

Mining stops once vault is full.

Claim

Claim transfers

Vault

↓

Wallet

Vault becomes zero.

Permanent Player Stats

Player has six permanent stats.

Hash Rate

Hack Power

Security

Luck

Firewall

Exploit

These are upgraded using HASH.

Upgrade Cost Formula

cost

=

level²

Example

Level 1

1

Level 2

4

Level 3

9

Level 10

100

Level 100

10000

Equipment System

Equipment Slots

ASIC Miner

Motherboard

Power Supply

Cooling System

Network Module

Firmware Chip

Player can equip only one item per slot.

Equipment Data

Each equipment contains

id

name

slot

rarity

stats

image

level

equipped

Example

ASIC Miner

Rare

Hash Rate +12

Luck +6

Security +5

Random Stat Pool

Stats can roll

Hash Rate

Hack Power

Security

Luck

Firewall

Exploit

Equipment slot DOES NOT affect stat generation.

Every equipment uses the same random stat pool.

No duplicate stats on one item.

Rarity Rules

Common

1 random stat

Uncommon

2 random stats

Rare

3 random stats

Epic

50%

4 stats

50%

5 stats

Legendary

6 stats

Mythic

6 stats

Higher values

Stat Roll Values

Common

1~10

Uncommon

2~20

Rare

3~30

Epic

4~50

Legendary

6~60

Mythic

8~80

Randomize values.

Equipment Score

Display

Power Score

Formula

HashRate

HackPower

Security

Luck

Firewall

Exploit

Sort inventory using score.

Mining Rig Page

Display

6 equipment slots

Inventory grid

Equipment details

Equip

Unequip

Power Score

Current Total Stats

Drag-and-drop is optional.

Total Player Stats

Final Stats

=

Base Stats

Equipment Stats

Display

Hash Rate

Hack Power

Security

Luck

Firewall

Exploit

Live update.

Chests

Display

Bronze

Silver

Gold

Diamond

Bitcoin Chest

Each chest has

price

rarity odds

Open button

Opening animation

Reward modal

Chest Prices

Bronze

100

Silver

300

Gold

750

Diamond

2000

Bitcoin

5000

Chest Rewards

Generate random equipment.

Random slot.

Random rarity.

Random stats.

Random values.

Add to inventory.

Inventory

Grid layout.

Each card displays

Image

Equipment Name

Slot

Rarity

Power Score

Stats

Equip Button

Sell Button (disabled)

Filter

Sort

Search

Raid Page

Mock multiplayer.

Generate 20 fake players.

Each fake player contains

Username

Hash Rate

Vault

Security

Firewall

Hack Power

Random avatar

Raid Button

Raid Formula

Success Chance

=

50

(HackPower

Enemy Security)

÷2

Clamp

Minimum

10%

Maximum

90%

Firewall

Random

1-100

If

≤ Firewall

Raid fails.

Exploit

Steal Percentage

Random

Exploit

↓

100

Example

Exploit

30

Steal

30%

↓

100%

Final Steal

Steal Amount

=

Enemy Vault

×

Steal %

Apply

Security reduction afterwards.

Add stolen amount

↓

Player Wallet.

Mock Players

Generate random fake players every reload.

Use Faker.

No backend.

Marketplace

UI only.

Cards

Filters

Search

Buy Button

Disabled.

Profile

Display

Wallet Balance

Vault

Total Equipment

Highest Hash Rate

Total Raids

Raid Wins

HASH Claimed

Zustand Stores

Create separate stores.

playerStore

equipmentStore

chestStore

raidStore

settingsStore

notificationStore

Persist all stores using Zustand Persist.

Components

StatCard

EquipmentCard

EquipmentSlot

EquipmentGrid

MiningProgress

VaultCard

ChestCard

ChestModal

RaidCard

UpgradeCard

Navbar

Sidebar

Header

Footer

NotificationToast

Reusable.

Animations

Animate

Claim

Chest Opening

Equipment Equip

Stat Increase

Vault Increase

Mining Numbers

Card Hover

Smooth transitions.

Notifications

Examples

+10 HASH

Equipment Equipped

Rare Equipment Found

Raid Successful

Raid Failed

Vault Full

Stat Upgraded

Responsive

Desktop first.

Tablet support.

Mobile support.

Code Architecture

Feature-based folder structure.

Separate

types

constants

utils

hooks

components

pages

stores

lib

No giant components.

Maximum readability.

Future Compatibility

Structure the code so Zustand can later be replaced by Supabase with minimal changes.

Separate game logic from UI.

Keep calculations inside utility functions.

Never place business logic inside components.

Create reusable helper functions for

Mining

Raid

Equipment Generation

Chest Opening

Stat Calculation

Equipment Score

Vault Calculation

Upgrade Cost

These should all live inside a dedicated game logic folder.

Goal

Build a polished, production-quality MVP that feels like a real idle blockchain mining game, with a modern dashboard UI, smooth animations, reusable architecture, and clean TypeScript code. The application should simulate the complete gameplay loop entirely on the client using Zustand and localStorage, making it easy to replace the storage layer with a real backend in the future.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0ad89377-babd-41dd-8c03-c6fb5396fe41).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
