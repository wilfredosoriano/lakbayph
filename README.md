# LakbayPH

A travel planner for the Philippines that works offline.

*Lakbay* is Filipino for "journey." I built this because I kept losing track of itineraries, budgets, and packing lists whenever I was somewhere without signal — which is basically everywhere outside Metro Manila.

---

## What it does

**Trip planning** — Create trips, add activities per day, attach notes and photos. You can set a travel window and group size, which helps when splitting costs later.

**Budget tracker** — Log expenses as you go. The summary shows total spent, remaining budget, and a per-person breakdown.

**Place discovery** — A curated list of destinations across the Philippines, organized by category (beach, food, landmarks, etc.). Browse by destination and add places straight to your itinerary.

**Transport guide** — Jeepney routes, buses, ferries. A basic reference for getting around without having to Google it on-site.

**Packing lists** — Per-trip checklists. You probably think you'll remember everything. You won't.

**Lakbay Assistant** — An offline AI-style planning buddy (premium only). Ask it to plan a trip, log an expense, or find things to do in a destination. It works off the local database, not the internet.

---

## Premium

The free plan is capped at 3 trips. Premium removes that limit and adds:

- Lakbay Assistant
- Memories slideshow
- Trip cover photos
- Priority support

In-app purchases go through RevenueCat.

---

## Tech stack

- React Native + Expo (SDK 54)
- SQLite via `expo-sqlite` (all data stays on-device)
- React Navigation (stack + bottom tabs)
- RevenueCat for IAP
- Expo EAS for builds

---

## Running locally

```bash
npm install
npx expo start
```

For native builds:

```bash
npx expo run:ios
npx expo run:android
```

---

## Project structure

```
src/
  screens/       # App screens
  components/    # Shared UI
  context/       # UserContext, PremiumContext
  database/      # SQLite schema and queries
  data/          # Places and destinations data
  navigation/    # Stack and tab navigators
  theme/         # Colors and fonts
  utils/         # Helpers, chat parser
```

---

## Place data scripts

| Command | What it does |
|---|---|
| `npm run places:new` | Create a new place template |
| `npm run places:images` | Fetch Wikimedia images |
| `npm run places:build` | Build the places data bundle |
| `npm run places:fetch` | Fetch raw places data |
| `npm run places:clean` | Clean and normalize places data |

---

## License

Private.
