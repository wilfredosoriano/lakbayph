/**
 * geocodePlaces.js
 *
 * Reads places_gist.json, reverse-geocodes every place's coordinates via
 * Nominatim (OSM, free, no API key), and adds a formatted `location` string
 * (street, barangay, city, province) to each place.
 *
 * Safe to re-run — skips places that already have a `location` field,
 * so if the run is interrupted you can just run it again.
 *
 * Run: node scripts/geocodePlaces.js
 */

const fs   = require('fs');
const path = require('path');

const INPUT  = path.join(__dirname, 'output/places_gist.json');
const OUTPUT = path.join(__dirname, 'output/places_gist.json');  // overwrite in-place

const DELAY_MS      = 1200;   // 1.2 s between requests (Nominatim requires ≥ 1 s)
const RETRY_DELAY   = 10000;  // 10 s wait after a rate-limit or server error
const MAX_RETRIES   = 3;
const SAVE_EVERY    = 20;     // write progress to disk every N places

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Format address from Nominatim response ────────────────────────────────────
// Based on actual PH Nominatim field names (tested against Baguio, Manila,
// Davao, Vigan, Angeles sample coordinates).

function formatLocation(addr) {
  if (!addr) return null;

  const parts = [];

  // 1. Street
  const street = addr.road || addr.pedestrian || addr.footway || addr.path || '';
  if (street) parts.push(street);

  // 2. Barangay
  //   - `village` or `suburb` are the most reliable for named barangays
  //   - `quarter` is sometimes the district/cluster (e.g. "Clark Global City", "Intramuros")
  //     but also sometimes a long zone string like "Abanao - Zandueta - Chugum" — skip those
  let barangay = '';
  if (addr.village && !/^Barangay\s*\d+/i.test(addr.village)) {
    barangay = addr.village;
  } else if (addr.suburb && !/^District\s*\d+/i.test(addr.suburb) && !/^\d+$/.test(addr.suburb.trim())) {
    barangay = addr.suburb;
  } else if (addr.quarter && addr.quarter.split(/[\s,\-]+/).length <= 3 && !/^Barangay\s*\d+/i.test(addr.quarter)) {
    barangay = addr.quarter;
  } else if (addr.neighbourhood && !/^Purok\s/i.test(addr.neighbourhood)) {
    barangay = addr.neighbourhood;
  }
  if (barangay) parts.push(barangay);

  // 3. City / Municipality
  const city = addr.city || addr.town || addr.municipality || '';
  if (city) parts.push(city);

  // 4. Province — use `state` when it differs from the region name
  //   Chartered cities (Baguio, Davao) have no state; Metro Manila uses region
  const state  = addr.state  || '';
  const region = addr.region || '';
  if (state && state !== city && state !== region
      && !state.includes('National Capital')
      && !state.includes('Metropolitan')) {
    parts.push(state);
  }

  return parts.length > 0 ? parts.join(', ') : null;
}

// ── Nominatim reverse geocode (with retry) ────────────────────────────────────

async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':      'LakbayPH/1.0 (Philippine travel app; lakbayph.app@gmail.com)',
          'Accept':          'application/json',
          'Accept-Language': 'en',
        },
      });

      if (res.status === 429 || res.status === 503 || res.status === 502) {
        process.stdout.write(` [rate-limited, waiting ${RETRY_DELAY / 1000}s]`);
        await sleep(RETRY_DELAY);
        continue;
      }

      if (!res.ok) {
        process.stdout.write(` [HTTP ${res.status}]`);
        return null;
      }

      const data = await res.json();
      if (data.error) return null;                 // e.g. {"error":"Unable to geocode"}
      return formatLocation(data.address);

    } catch (err) {
      process.stdout.write(` [network error: ${err.message}]`);
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY);
    }
  }
  return null;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const raw = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

  // Flatten all places
  const allPlaces = [];
  for (const [dest, places] of Object.entries(raw.destinations)) {
    for (const place of places) {
      allPlaces.push({ dest, place });
    }
  }

  const total    = allPlaces.length;
  const toGeocode = allPlaces.filter(e => !e.place.location).length;
  let done       = 0;
  let located    = 0;
  let failed     = 0;
  let skipped    = 0;

  console.log(`\nLakbayPH — Nominatim Reverse Geocoder`);
  console.log(`Total places      : ${total}`);
  console.log(`Already located   : ${total - toGeocode}`);
  console.log(`To geocode        : ${toGeocode}`);
  console.log(`Estimated time    : ~${Math.ceil(toGeocode * DELAY_MS / 60000)} minutes\n`);

  for (const { dest, place } of allPlaces) {
    done++;

    // Already geocoded in a previous run — skip
    if (place.location) {
      skipped++;
      process.stdout.write(`\r  [${done}/${total}] ⏭  ${place.name.slice(0, 45).padEnd(45)}`);
      continue;
    }

    const [lon, lat] = place.coordinates;
    process.stdout.write(`\r  [${done}/${total}] ⏳ ${place.name.slice(0, 45).padEnd(45)}`);

    const location = await reverseGeocode(lat, lon);

    if (location) {
      place.location = location;
      located++;
      process.stdout.write(`\r  [${done}/${total}] ✓  ${place.name.slice(0, 30).padEnd(30)} → ${location.slice(0, 50)}`);
    } else {
      failed++;
      process.stdout.write(`\r  [${done}/${total}] ✗  ${place.name.slice(0, 45).padEnd(45)} (no address)`);
    }

    // Save progress periodically so a crash doesn't lose work
    if (done % SAVE_EVERY === 0) {
      fs.writeFileSync(OUTPUT, JSON.stringify(raw, null, 2), 'utf8');
    }

    await sleep(DELAY_MS);
  }

  // Final save
  raw.version    = Math.max(raw.version || 2, 3);
  raw.updated_at = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(OUTPUT, JSON.stringify(raw, null, 2), 'utf8');

  const totalLocated = skipped + located;
  console.log(`\n\n✅ Done!`);
  console.log(`   Located this run : ${located}`);
  console.log(`   Already had one  : ${skipped}`);
  console.log(`   Total with location : ${totalLocated} / ${total}`);
  console.log(`   Still missing    : ${failed}`);
  console.log(`\n   Output → scripts/output/places_gist.json  (version ${raw.version})`);
  if (totalLocated === total) {
    console.log(`   All places located! Paste into your Gist to push to the app.\n`);
  } else {
    console.log(`   Run again to retry the ${failed} that failed.\n`);
  }
}

main().catch(err => {
  console.error(`\nFatal: ${err.message}`);
  process.exit(1);
});
