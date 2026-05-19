#!/usr/bin/env node
/**
 * scripts/fetchPlacesData.js
 *
 * Fetches Philippine tourist attraction data using Google Places API (New).
 * Outputs: scripts/output/rawPlacesData.json
 *
 * ── Setup ────────────────────────────────────────────────────────────────────
 * 1. Go to https://console.cloud.google.com
 * 2. Create a project (or use an existing one)
 * 3. Enable "Places API (New)"
 * 4. APIs & Services → Credentials → Create API Key
 * 5. (Optional but safe) Set a $0 spending limit in Billing → Budgets & Alerts
 * 6. Run:
 *      GOOGLE_PLACES_KEY=your_key node scripts/fetchPlacesData.js
 *
 * ── Cost estimate ────────────────────────────────────────────────────────────
 * Nearby Search  → $0.032 per request  (1 request per destination = ~$0.30 total)
 * Place Details  → $0.017 per request  (1 per place fetched)
 * Photo          → $0.007 per photo
 * Google gives $200 free credit/month → this script costs < $1 total.
 *
 * Requires Node 18+.
 */

const fs   = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────

const API_KEY = process.env.GOOGLE_PLACES_KEY || 'YOUR_KEY_HERE';
const OUT_PATH = path.join(__dirname, 'output', 'rawPlacesData.json');

// Max photo width stored as URL (no extra cost — photo URLs are free to store,
// you only pay when the app loads them)
const PHOTO_MAX_WIDTH = 800;

// Place types to search per destination
// https://developers.google.com/maps/documentation/places/web-service/place-types
const SEARCH_TYPES = [
  'tourist_attraction',
  'natural_feature',
  'park',
  'museum',
  'zoo',
  'aquarium',
  'beach',
  'restaurant',
  'market',
];

// Google place type → your app's category
const TYPE_TO_CATEGORY = {
  beach:              'beach',
  natural_feature:    'nature',
  park:               'nature',
  campground:         'nature',
  zoo:                'nature',
  aquarium:           'nature',
  restaurant:         'food',
  food:               'food',
  cafe:               'food',
  bakery:             'food',
  bar:                'food',
  meal_takeaway:      'food',
  market:             'shopping',
  shopping_mall:      'shopping',
  store:              'shopping',
  church:             'landmark',
  mosque:             'landmark',
  hindu_temple:       'landmark',
  place_of_worship:   'landmark',
  museum:             'landmark',
  tourist_attraction: 'landmark',
  amusement_park:     'activity',
  stadium:            'activity',
  gym:                'activity',
};

const DESTINATIONS = [
  { key: 'Coron',       lat: 11.9987, lon: 119.8684, radiusM: 15000 },
  { key: 'El Nido',     lat: 11.1868, lon: 119.4082, radiusM: 15000 },
  { key: 'Siargao',     lat:  9.8137, lon: 126.1652, radiusM: 20000 },
  { key: 'Bohol',       lat:  9.6590, lon: 123.8543, radiusM: 30000 },
  { key: 'Baguio',      lat: 16.4023, lon: 120.5960, radiusM: 10000 },
  { key: 'Vigan',       lat: 17.5747, lon: 120.3870, radiusM:  8000 },
  { key: 'Sagada',      lat: 17.0867, lon: 120.9028, radiusM: 10000 },
  { key: 'Banaue',      lat: 16.9185, lon: 121.0598, radiusM: 15000 },
  { key: 'Pangasinan',  lat: 16.1573, lon: 119.9791, radiusM: 30000 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HEADERS = {
  'Content-Type':  'application/json',
  'X-Goog-Api-Key': API_KEY,
  'X-Goog-FieldMask': [
    'places.id',
    'places.displayName',
    'places.types',
    'places.rating',
    'places.userRatingCount',
    'places.editorialSummary',
    'places.photos',
    'places.location',
    'places.regularOpeningHours',
    'places.priceLevel',
  ].join(','),
};

// Nearby Search (New) — returns up to 20 places per call
async function nearbySearch(lat, lon, radiusM, type) {
  const body = {
    includedTypes:  [type],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lon },
        radius: radiusM,
      },
    },
    rankPreference: 'POPULARITY',
  };

  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method:  'POST',
    headers: HEADERS,
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Nearby Search ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.places ?? [];
}

// Build a photo URL from a photo resource name (no extra API call needed)
function buildPhotoUrl(photoName) {
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${PHOTO_MAX_WIDTH}&key=${API_KEY}`;
}

function resolveCategory(types = []) {
  for (const t of types) {
    if (TYPE_TO_CATEGORY[t]) return TYPE_TO_CATEGORY[t];
  }
  return 'landmark';
}

function buildEntry(destKey, place, index) {
  const name     = place.displayName?.text ?? 'Unknown';
  const category = resolveCategory(place.types ?? []);
  const desc     = place.editorialSummary?.text ?? '';
  const photo    = place.photos?.[0]?.name
    ? buildPhotoUrl(place.photos[0].name)
    : null;

  return {
    id:              `${destKey.toLowerCase().replace(/\s+/g, '')}-new-${index + 1}`,
    name,
    category,
    description:     desc || `A popular ${category} in ${destKey}.`,
    mustVisit:       false,
    entranceFee:     null,   // fill with AI after
    visitLength:     null,
    bestTimeToVisit: null,
    howToGetThere:   null,
    itineraryTip:    null,
    image:           photo,
    coordinates:     [
      place.location?.longitude ?? 0,
      place.location?.latitude  ?? 0,
    ],
    travel: { walk: null, tricycle: null, jeepney: null, van: null, ferry: null },
    _googleId:    place.id,
    _types:       place.types ?? [],
    _rating:      place.rating ?? null,
    _ratingCount: place.userRatingCount ?? 0,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function processDestination(dest, destIdx) {
  console.log(`\n[${destIdx + 1}/${DESTINATIONS.length}] ${dest.key}`);

  const seen   = new Map(); // id → entry  (deduplication)
  const errors = [];

  for (const type of SEARCH_TYPES) {
    await sleep(300); // stay well under rate limits

    let places;
    try {
      places = await nearbySearch(dest.lat, dest.lon, dest.radiusM, type);
    } catch (e) {
      errors.push(`${type}: ${e.message}`);
      continue;
    }

    for (const place of places) {
      if (!place.id || seen.has(place.id)) continue;
      seen.set(place.id, buildEntry(dest.key, place, seen.size));
    }
  }

  const results = Array.from(seen.values());

  // Sort: highest rated first so must-visit candidates bubble up
  results.sort((a, b) => {
    const ra = a._rating ?? 0, rb = b._rating ?? 0;
    const ca = a._ratingCount ?? 0, cb = b._ratingCount ?? 0;
    if (rb !== ra) return rb - ra;
    return cb - ca;
  });

  // Re-assign clean sequential IDs after sort
  results.forEach((p, i) => {
    p.id = `${dest.key.toLowerCase().replace(/\s+/g, '')}-new-${i + 1}`;
  });

  const withImg = results.filter(p => p.image).length;
  console.log(`  ${results.length} places  |  ${withImg} with photos`);
  if (errors.length) {
    console.log(`  Warnings: ${errors.join(', ')}`);
  }
  results.forEach(p => {
    const star = p._rating ? `⭐${p._rating}` : '   ';
    const img  = p.image ? '📷' : '  ';
    console.log(`  ${img} ${star}  ${p.name}`);
  });

  return results;
}

async function main() {
  if (API_KEY === 'YOUR_KEY_HERE') {
    console.error([
      '',
      '  Missing API key!',
      '',
      '  Setup steps:',
      '  1. Go to https://console.cloud.google.com',
      '  2. Create a project → Enable "Places API (New)"',
      '  3. APIs & Services → Credentials → Create API Key',
      '  4. (Safe) Set a $0 spending limit in Billing → Budgets & Alerts',
      '  5. Run:  GOOGLE_PLACES_KEY=your_key node scripts/fetchPlacesData.js',
      '',
    ].join('\n'));
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });

  console.log('LakbayPH — Place Data Fetcher (Google Places API)');
  console.log(`Fetching ${DESTINATIONS.length} destinations...\n`);

  const result = {};
  let total    = 0;

  for (let i = 0; i < DESTINATIONS.length; i++) {
    result[DESTINATIONS[i].key] = await processDestination(DESTINATIONS[i], i);
    total += result[DESTINATIONS[i].key].length;
    await sleep(500);
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2), 'utf8');

  const withImg = Object.values(result).flat().filter(p => p.image).length;

  console.log([
    '',
    '✓ Done!',
    `  Total places : ${total}`,
    `  With photos  : ${withImg} (${Math.round(withImg / total * 100)}%)`,
    `  Saved to     : scripts/output/rawPlacesData.json`,
    '',
    'Next steps:',
    '  1. Review the JSON — remove irrelevant entries (hotels, gas stations, etc.)',
    '  2. Paste batches to Claude → fill: entranceFee, visitLength,',
    '     bestTimeToVisit, howToGetThere, itineraryTip',
    '  3. Merge enriched entries into src/data/placesData.js',
    '',
  ].join('\n'));
}

main().catch((err) => {
  console.error(`\nFatal: ${err.message}`);
  process.exit(1);
});
