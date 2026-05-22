/**
 * placesSync.js
 *
 * Silently fetches the latest places data from a GitHub Gist on app launch.
 * Stores new places in SQLite so they're accessible offline from then on.
 *
 * ── HOW TO SET UP YOUR GIST ──────────────────────────────────────────────────
 *
 *  1. Go to https://gist.github.com (sign in with your GitHub account)
 *  2. Create a new public gist
 *  3. Filename: places.json
 *  4. Paste this starter JSON structure:
 *
 *  {
 *    "version": 1,
 *    "updated_at": "2026-05-22",
 *    "destinations": {
 *      "Baguio": [
 *        {
 *          "id": "baguio-burnham-park",
 *          "name": "Burnham Park",
 *          "category": "nature",
 *          "description": "A scenic city park with a man-made lake, rowboat rentals, and open grounds.",
 *          "mustVisit": true,
 *          "entranceFee": 0,
 *          "visitLength": "1 to 2 hrs",
 *          "bestTimeToVisit": "Early morning",
 *          "howToGetThere": "Walk from Session Road or take a jeepney.",
 *          "itineraryTip": "Great first stop of the day.",
 *          "coordinates": [120.5936, 16.4123],
 *          "travel": { "walk": "10 min", "jeepney": "5 min" }
 *        }
 *      ]
 *    }
 *  }
 *
 *  5. Click "Create public gist"
 *  6. On the gist page, click the "Raw" button
 *  7. Copy that URL (looks like: https://gist.githubusercontent.com/USERNAME/HASH/raw/places.json)
 *  8. Paste it below replacing PLACES_GIST_URL
 *
 *  TO ADD NEW PLACES LATER:
 *  - Open your gist → Edit → add new place objects → bump "version" by 1 → Save
 *  - Users get the new places next time they open the app with internet
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getSetting, setSetting, upsertCachedPlaces } from '../database/db';

// ── Replace this with your GitHub Gist raw URL ────────────────────────────────
const PLACES_GIST_URL = 'https://gist.githubusercontent.com/wilfredosoriano/9d218c453c36be51249a07949965a68e/raw/places.json';

/**
 * Runs silently on app launch. Fetches new place data if a newer version is
 * available. Stores everything in SQLite — fully accessible offline after.
 *
 * Returns: { success, newCount, updated?, upToDate?, error? }
 */
export async function fetchAndCachePlaces() {
  // Skip if URL hasn't been configured yet
  if (PLACES_GIST_URL.includes('YOUR_USERNAME')) {
    return { success: false, newCount: 0, error: 'Gist URL not configured' };
  }

  try {
    const storedVersion = await getSetting('places_version', '0');

    // 8-second timeout — don't block the user if network is slow
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(PLACES_GIST_URL, {
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' },
    });
    clearTimeout(timeout);

    if (!response.ok) return { success: false, newCount: 0 };

    const data = await response.json();

    // Already up to date
    if (!data.version || Number(data.version) <= Number(storedVersion)) {
      return { success: true, newCount: 0, upToDate: true };
    }

    // Flatten all destinations → one array
    const allPlaces = [];
    for (const [destination, places] of Object.entries(data.destinations || {})) {
      for (const place of places || []) {
        allPlaces.push({ ...place, destination });
      }
    }

    if (allPlaces.length === 0) return { success: true, newCount: 0 };

    const newCount = await upsertCachedPlaces(allPlaces);
    await setSetting('places_version', String(data.version));

    return { success: true, newCount, updated: true };
  } catch (_) {
    // Silently fail — user is offline or network timed out
    return { success: false, newCount: 0 };
  }
}
