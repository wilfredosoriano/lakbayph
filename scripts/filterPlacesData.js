#!/usr/bin/env node
/**
 * scripts/filterPlacesData.js
 *
 * Cleans up scripts/output/places.json:
 *   1. Merges duplicate city name variants (Cebu / Cebu City, etc.)
 *   2. Removes destinations with fewer than MIN_PLACES places
 *   3. Removes known non-tourist suburban/residential cities
 *
 * Input:  scripts/output/places.json
 * Output: scripts/output/places_filtered.json
 *
 * Run:  node scripts/filterPlacesData.js
 */

const fs   = require('fs');
const path = require('path');

const IN_PATH  = path.join(__dirname, 'output', 'places.json');
const OUT_PATH = path.join(__dirname, 'output', 'places_filtered.json');

// ── Config ────────────────────────────────────────────────────────────────────

// Destinations with fewer than this many places are dropped
const MIN_PLACES = 5;

// ── City name merges ──────────────────────────────────────────────────────────
// Key = canonical name to keep, Value = list of variants to merge into it

const MERGE = {
  'Cebu':           ['Cebu City'],
  'Iloilo':         ['Iloilo City'],
  'Makati':         ['Makati City'],
  'Cagayan De Oro': ['Cagayan De Oro City'],
  'Davao':          ['Davao City'],
  'Butuan':         ['Butuan City'],
  'Zamboanga':      ['Zamboanga City'],
  'Batangas':       ['Batangas City'],
};

// ── Non-tourist cities to drop ────────────────────────────────────────────────
// Primarily residential suburban cities with minimal tourist draw.
// Add more here if you see them in the output.

const DROP_CITIES = new Set([
  // Metro Manila suburbs
  'Cainta', 'Taytay', 'Imus', 'General Trias', 'Dasmariñas', 'Dasmarinas',
  'Bacoor', 'Taguig', 'Pasig', 'Mandaluyong', 'Valenzuela', 'Parañaque',
  'Paranaque', 'Las Piñas', 'Las Pinas', 'Muntinlupa', 'Marikina',
  'San Juan', 'Pasay', 'Caloocan', 'Navotas', 'Malabon',
  // Cavite residential
  'Kawit', 'Rosario', 'Silang', 'Indang', 'General Emilio Aguinaldo',
  // Laguna / Rizal residential
  'Biñan', 'Binan', 'Santa Rosa', 'Cabuyao', 'San Pedro',
  'Rizal',   // the province tag leaking into city
  // Bulacan residential
  'Santa Maria', 'Meycauayan', 'Marilao', 'Bocaue',
  // Batangas residential
  'Balayan', 'Rosario',
  // Quezon residential
  'Tiaong', 'Luisiana',
  // Other non-tourist
  'San Jose',    // too generic, multiple San Joses, no clear tourist identity
]);

// ── Main ──────────────────────────────────────────────────────────────────────

const raw = JSON.parse(fs.readFileSync(IN_PATH, 'utf8'));

// Build a lookup: variant name → canonical name
const variantToCanonical = {};
for (const [canonical, variants] of Object.entries(MERGE)) {
  for (const v of variants) {
    variantToCanonical[v] = canonical;
  }
}

// Step 1: Merge variant city names into canonical
const merged = {};
for (const [dest, places] of Object.entries(raw.destinations)) {
  const canonical = variantToCanonical[dest] || dest;
  if (!merged[canonical]) merged[canonical] = [];
  merged[canonical].push(...places);
}

// Step 2: Drop non-tourist cities
let droppedCities = [];
for (const city of DROP_CITIES) {
  if (merged[city]) {
    droppedCities.push(`${city} (${merged[city].length} places)`);
    delete merged[city];
  }
}

// Step 3: Drop destinations below minimum place count
const underMin = Object.entries(merged)
  .filter(([, places]) => places.length < MIN_PLACES)
  .map(([name]) => name);

underMin.forEach(name => delete merged[name]);

// Step 4: Re-assign clean IDs and sort destinations alphabetically
const finalDestinations = {};
const destNames = Object.keys(merged).sort();
let total = 0;

for (const dest of destNames) {
  const slug   = dest.toLowerCase().replace(/\s+/g, '-');
  const places = merged[dest];
  places.forEach((p, i) => { p.id = `${slug}-${i + 1}`; });
  finalDestinations[dest] = places;
  total += places.length;
}

const output = {
  ...raw,
  updated_at:   new Date().toISOString().slice(0, 10),
  destinations: finalDestinations,
};

fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf8');

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('LakbayPH — Place Filter\n');
console.log(`Input  : ${Object.keys(raw.destinations).length} destinations, ${
  Object.values(raw.destinations).flat().length} places`);
console.log(`Output : ${destNames.length} destinations, ${total} places\n`);

if (droppedCities.length) {
  console.log(`Dropped (non-tourist cities):`);
  droppedCities.forEach(c => console.log(`  - ${c}`));
}
console.log(`\nDropped (< ${MIN_PLACES} places): ${underMin.length} destinations`);

console.log('\n=== Remaining destinations ===');
destNames.forEach(d => {
  const count = finalDestinations[d].length;
  console.log(`  ${count.toString().padStart(4)}  ${d}`);
});

console.log(`\n✓ Saved to scripts/output/places_filtered.json`);
console.log('\nNext: review places_filtered.json, then paste to Claude to fill');
console.log('entranceFee, visitLength, howToGetThere, itineraryTip per destination.');
