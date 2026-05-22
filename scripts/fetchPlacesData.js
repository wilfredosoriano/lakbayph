#!/usr/bin/env node
/**
 * scripts/fetchPlacesData.js
 *
 * Fetches ALL Philippine tourist attractions from OpenStreetMap (Overpass API).
 * No destinations are hardcoded — the script queries the entire Philippines and
 * groups results by whatever city/municipality each place is tagged with in OSM.
 *
 *  ✅ Free — no API key, no billing account
 *  ✅ ODbL license — safe for permanent offline storage in published apps
 *  ✅ Safe for App Store & Play Store
 *
 * Output: scripts/output/places.json  (gist-ready format)
 *
 * ── Run ──────────────────────────────────────────────────────────────────────
 *   node scripts/fetchPlacesData.js
 *
 * ── Attribution (required by ODbL) ──────────────────────────────────────────
 *   Add "© OpenStreetMap contributors" somewhere in your app's About screen.
 *
 * Requires Node 18+.
 */

const fs   = require('fs');
const path = require('path');

const OUT_PATH = path.join(__dirname, 'output', 'places.json');

// Public Overpass API mirrors — tries each in order if one is busy
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// ── Philippines bounding box ──────────────────────────────────────────────────
// south, west, north, east
const PH_BBOX = '4.5,116.9,21.5,127.0';

// ── Overpass query ────────────────────────────────────────────────────────────

function buildQuery() {
  return `
[out:json][timeout:180][bbox:${PH_BBOX}];
(
  nwr["tourism"~"^(attraction|museum|viewpoint|theme_park|zoo|aquarium|artwork)$"]["name"];
  nwr["natural"~"^(beach|waterfall|cave_entrance|hot_spring|volcano)$"]["name"];
  nwr["leisure"~"^(nature_reserve|park)$"]["name"];
  nwr["historic"~"^(ruins|fort|monument|memorial|archaeological_site|lighthouse|church|building)$"]["name"];
);
out body center;
  `.trim();
}

// ── Category mapping ──────────────────────────────────────────────────────────

function resolveCategory(tags) {
  if (tags.natural === 'beach')                                                    return 'beach';
  if (['waterfall','cave_entrance','hot_spring','volcano'].includes(tags.natural)) return 'nature';
  if (['nature_reserve','park'].includes(tags.leisure))                            return 'nature';
  if (tags.tourism === 'viewpoint')                                                return 'nature';
  if (['aquarium','zoo','theme_park'].includes(tags.tourism))                      return 'activity';
  if (['museum','art_gallery'].includes(tags.tourism))                             return 'landmark';
  if (tags.historic)                                                               return 'landmark';
  return 'landmark';
}

// ── Destination grouping ──────────────────────────────────────────────────────
// Reads OSM address tags to figure out which city/municipality a place belongs to.
// Returns null if no location info is available.

function resolveDestination(tags) {
  const raw =
    tags['addr:city']         ||
    tags['addr:municipality'] ||
    tags['is_in:city']        ||
    tags['addr:town']         ||
    tags['addr:village']      ||
    tags['addr:province']     ||
    null;

  if (!raw) return null;

  // "El Nido, Palawan" → "El Nido"
  const city = raw.split(',')[0].trim();
  if (!city) return null;

  // Title-case normalisation: "el nido" → "El Nido"
  return city
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// ── Junk filter ───────────────────────────────────────────────────────────────

const JUNK_FRAGMENTS = [
  'barangay', 'brgy ', 'sitio ', 'purok ',
  'elementary', 'high school', 'national school', 'university', 'college',
  'hospital', 'clinic', 'health center', 'pharmacy', 'drugstore',
  'cemetery', 'memorial park', 'funeral',
  'kingdom hall', 'jehovah', 'seventh day', 'adventist',
  'pentecostal', 'evangelical', 'born again',
  'mosque', 'masjid', 'islamic', 'balik islam',
  'iglesia ni cristo', 'inc locale', 'church of christ',
  'gas station', 'petron', 'caltex', 'shell ',
  'campsite', 'camp site', 'glamping',
  'resort ', ' resort', 'hotel ', ' hotel', 'pension', 'hostel',
  'homestay', 'apartelle',
  'parking', 'terminal', 'bus stop', 'bus station',
  'water district', 'electric cooperative', 'power corp',
  'hardware', 'motor shop', 'auto shop',
  'salon', 'barbershop', 'laundry', 'nail spa',
  'minimart', 'sari-sari store', 'convenience store',
  'pawnshop', 'money changer', 'atm center',
];

const FORCE_KEEP = [
  'falls', 'waterfall', 'lagoon', 'lake ', ' lake',
  'beach', 'island', 'cave', 'spring', 'hot spring',
  'reef', 'marine park', 'rice terrace', 'rice field',
  'viewpoint', 'view deck', 'view point',
  'national park', 'heritage', 'museum', 'shrine', 'ruins',
  'fort ', ' fort', 'lighthouse', 'surf break',
  'chocolate hills', 'tarsier', 'hanging coffin',
  'zipline', 'skywalk',
];

function shouldInclude(name) {
  const lower = name.toLowerCase();
  if (FORCE_KEEP.some(f => lower.includes(f)))    return true;
  if (JUNK_FRAGMENTS.some(f => lower.includes(f))) return false;
  return true;
}

// ── Coordinate extraction ─────────────────────────────────────────────────────

function getCoords(element) {
  if (element.type === 'node' && element.lat != null) {
    return [element.lon, element.lat];
  }
  if (element.center) {
    return [element.center.lon, element.center.lat];
  }
  return null;
}

// ── Overpass fetch with mirror fallback ───────────────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function overpassFetch(query) {
  let lastError;
  for (const url of OVERPASS_MIRRORS) {
    try {
      console.log(`  Trying ${url.replace('https://', '').split('/')[0]}...`);
      const res = await fetch(url, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept':       '*/*',
          'User-Agent':   'LakbayPH/1.0 (Philippine travel app; lakbayph.app@gmail.com)',
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!res.ok) {
        const body = await res.text();
        if ([429, 502, 503, 504].includes(res.status)) {
          console.log(`  Server busy (${res.status}), trying next mirror...`);
          lastError = new Error(`${res.status}`);
          await sleep(4000);
          continue;
        }
        throw new Error(`Overpass error ${res.status}: ${body.slice(0, 300)}`);
      }

      return await res.json();
    } catch (e) {
      lastError = e;
      await sleep(4000);
    }
  }
  throw lastError;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });

  console.log('LakbayPH — Tourist Attraction Fetcher');
  console.log('Source : OpenStreetMap (Overpass API)');
  console.log('Region : All Philippines\n');

  console.log('Fetching from Overpass API (this may take 30–60 seconds)...');
  const data     = await overpassFetch(buildQuery());
  const elements = data.elements || [];
  console.log(`  Raw results: ${elements.length} elements\n`);

  // Group by destination derived from OSM tags
  const destinations = {};   // destName → Map(osmId → entry)
  let skippedNoName  = 0;
  let skippedJunk    = 0;
  let skippedNoDest  = 0;

  for (const el of elements) {
    const tags = el.tags || {};
    const name = tags['name:en'] || tags.name || '';

    if (!name.trim())          { skippedNoName++;  continue; }
    if (!shouldInclude(name))  { skippedJunk++;    continue; }

    const coords = getCoords(el);
    if (!coords) continue;

    const dest = resolveDestination(tags);
    if (!dest) { skippedNoDest++; continue; }

    if (!destinations[dest]) destinations[dest] = new Map();
    if (destinations[dest].has(el.id)) continue;  // deduplicate

    // Build a location string from OSM address tags (best-effort)
    const locParts = [];
    const street   = tags['addr:street'] || tags['addr:place'] || '';
    const barangay = tags['addr:barangay'] || tags['addr:suburb'] || '';
    const cityTag  = tags['addr:city'] || tags['addr:municipality'] || tags['addr:town'] || '';
    const province = tags['addr:province'] || tags['addr:state'] || '';
    if (street)   locParts.push(street);
    if (barangay) locParts.push(`Brgy. ${barangay}`);
    if (cityTag)  locParts.push(cityTag);
    if (province && province !== cityTag) locParts.push(province);
    const location = locParts.length > 0 ? locParts.join(', ') : null;

    destinations[dest].set(el.id, {
      name:            name.trim(),
      category:        resolveCategory(tags),
      description:     tags['description:en'] || tags.description || '',
      mustVisit:       false,
      entranceFee:     null,
      visitLength:     null,
      bestTimeToVisit: null,
      howToGetThere:   null,
      itineraryTip:    null,
      location,
      coordinates:     coords,
      travel:          {},
      // reference only — remove before uploading to gist
      _osmId:          el.id,
      _osmType:        el.type,
      _osmTag:         tags.tourism || tags.natural || tags.historic || tags.leisure || '',
    });
  }

  // Convert Maps → sorted arrays with clean IDs
  const finalDestinations = {};
  const destNames = Object.keys(destinations).sort();
  let total = 0;

  for (const dest of destNames) {
    const places = Array.from(destinations[dest].values());
    const slug   = dest.toLowerCase().replace(/\s+/g, '-');

    places.forEach((p, i) => {
      p.id = `${slug}-${i + 1}`;
    });

    finalDestinations[dest] = places;
    total += places.length;

    console.log(`${dest}: ${places.length} places`);
    places.forEach(p => console.log(`  [${p.category}] ${p.name}`));
  }

  console.log(`\nSkipped — no name      : ${skippedNoName}`);
  console.log(`Skipped — junk filter  : ${skippedJunk}`);
  console.log(`Skipped — no dest tag  : ${skippedNoDest}`);

  const today  = new Date().toISOString().slice(0, 10);
  const output = {
    version:      1,
    updated_at:   today,
    destinations:  finalDestinations,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf8');

  console.log([
    '',
    '✓ Done!',
    `  Destinations : ${destNames.length}`,
    `  Total places : ${total}`,
    `  Output       : scripts/output/places.json`,
    '',
    'Next steps:',
    '  1. Review — remove any destinations or places that slipped through',
    '  2. Set mustVisit: true for the top picks per destination',
    '  3. Fill in entranceFee, visitLength, howToGetThere, itineraryTip',
    '     → paste a destination\'s places to Claude to fill these quickly',
    '  4. Remove _osmId, _osmType, _osmTag fields before uploading',
    '  5. Paste final JSON into your GitHub Gist and bump the version number',
    '',
    'Attribution (required by ODbL license):',
    '  Add "© OpenStreetMap contributors" to your app\'s About / More screen.',
    '',
  ].join('\n'));
}

main().catch(err => {
  console.error(`\nFatal: ${err.message}`);
  process.exit(1);
});
