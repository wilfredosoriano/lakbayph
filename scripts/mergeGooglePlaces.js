#!/usr/bin/env node
/**
 * scripts/mergeGooglePlaces.js
 *
 * Selects tourist attractions from cleanPlacesData.json and
 * outputs a merge plan:
 *   - imageUpdates: existing place IDs/names to update with Google photo
 *   - newPlaces: new tourist-only entries to add per destination
 *
 * Run: node scripts/mergeGooglePlaces.js
 * Output: scripts/output/mergePlan.json
 */

const fs   = require('fs');
const path = require('path');

const IN_PATH  = path.join(__dirname, 'output', 'cleanPlacesData.json');
const OUT_PATH = path.join(__dirname, 'output', 'mergePlan.json');

const raw = JSON.parse(fs.readFileSync(IN_PATH, 'utf8'));

// ── Tourist type check ─────────────────────────────────────────────────────────
const TOURIST_TYPES = new Set([
  'tourist_attraction', 'natural_feature', 'park', 'beach',
  'museum', 'art_gallery', 'aquarium', 'zoo', 'amusement_park',
]);

// Names to skip even if they have tourist types
const SKIP_NAME_FRAGMENTS = [
  'assistance center', 'information center', 'floating dock',
  'eco-tour office', 'parking area', 'parking lot',
  'bus stop', 'terminal', 'one pedxina', 'jededia',
  'bogtong mpa', 'tourist information', 'visitor center',
  'tourism office', 'barangay ', 'brgy ', 'sitio ',
  'doner shawarma', 'kebab', 'falafel',
  'resort ', ' resort', 'villa ', ' villa', 'pension',
  'inn ', ' inn', 'lodge ', ' lodge', 'campground',
  'campsite', 'camp site', 'glamping',
  'farm ', ' farm', 'property', 'compound',
  'basketball court', 'skate park', 'cemetery beach',
];

// Only skip if these appear AND there's no strong tourist signal
const SOFT_SKIP_FRAGMENTS = [
  'view deck', 'viewpoint', 'view point', 'observation deck',
  'wharf', 'boardwalk', 'boulevard',
];

function isTourist(place) {
  const types = place._types || [];
  const name = (place.name || '').toLowerCase();

  if (!types.some(t => TOURIST_TYPES.has(t))) return false;

  // Hard skip
  if (SKIP_NAME_FRAGMENTS.some(f => name.includes(f))) return false;

  // Must have image to be useful
  if (!place.image) return false;

  return true;
}

// Score: higher rating × more reviews = better
function score(p) {
  const r = p._rating ?? 0;
  const c = p._ratingCount ?? 0;
  return r * Math.log10(c + 2);
}

// Normalise a name for fuzzy matching
function norm(s) {
  return (s || '').toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Check if two names are likely the same place
function namesMatch(a, b) {
  const na = norm(a), nb = norm(b);
  if (na === nb) return true;
  if (na.length > 5 && nb.includes(na)) return true;
  if (nb.length > 5 && na.includes(nb)) return true;
  // Partial word overlap for long names
  const wordsA = na.split(' ').filter(w => w.length > 3);
  const wordsB = new Set(nb.split(' ').filter(w => w.length > 3));
  const shared = wordsA.filter(w => wordsB.has(w));
  return shared.length >= 2 && shared.length / Math.max(wordsA.length, wordsB.size) > 0.5;
}

// ── Existing place names by destination (for matching) ──────────────────────
const EXISTING = {
  Coron: [
    'Kayangan Lake', 'Twin Lagoon', 'Barracuda Lake', 'Maquinit Hot Spring',
    'Siete Pecados Marine Park', 'Coron Town Market', 'Skeleton Wreck',
    'Black Island', 'CYC Beach', 'Coron Palawan Reef',
  ],
  'El Nido': [
    'Big Lagoon', 'Small Lagoon', 'Nacpan Beach', 'Secret Beach',
    'Matinloc Shrine', 'El Nido Town Proper', 'Shimizu Island',
    '7 Commandos Beach', 'Cadlao Lagoon', 'Lagen Island', 'Las Cabanas Beach',
  ],
  Siargao: [
    'Cloud 9 Surf Break', 'Sugba Lagoon', 'Magpupungko Rock Pools',
    'Naked Island', 'Sohoton Cove', 'Siargao Night Market',
    'Guyam Island', 'Daku Island', 'Maasin River', 'Pacifico Beach', 'Kermit Restaurant',
  ],
  Bohol: [
    'Chocolate Hills', 'Philippine Tarsier Sanctuary', 'Loboc River Cruise',
    'Alona Beach, Panglao', 'Baclayon Church', 'Hinagdanan Cave',
    'Balicasag Island', 'Danao Adventure Park', 'Bohol Bee Farm',
    'Blood Compact Shrine', 'Panglao Public Market', 'Man-Made Forest',
  ],
  Baguio: [
    'Burnham Park', 'Baguio City Night Market', 'Mines View Park',
    'Wright Park', 'Good Taste Restaurant', 'Strawberry Farm, La Trinidad',
    'Baguio Cathedral', 'The Mansion', 'Camp John Hay', 'Botanical Garden',
    'Tam-Awan Village', 'BenCab Museum', 'SM Baguio Sky Terrace',
    'Bell Church', 'Igorot Stone Kingdom', 'Baguio Public Market',
    'Cafe by the Ruins', 'Philippine Military Academy',
    'Dragon Treasure Castle', 'Valley of Colors',
  ],
  Vigan: [
    'Calle Crisologo', 'Plaza Salcedo', 'Bantay Bell Tower',
    'Vigan Longganisa Market', 'Baluarte Zoo', 'St. Paul Metropolitan Cathedral',
    'Syquia Mansion Museum', 'Burnay Pottery District',
    'Kalesa Ride around Heritage Village', 'Crisologo Museum',
    'Plaza Burgos Night Market', 'Hidden Garden',
  ],
  Sagada: [
    'Sumaguing Cave', 'Hanging Coffins of Echo Valley', 'Kiltepan Peak',
    'Lake Danum', 'Sagada Weaving', 'Bomod-ok Falls (Big Falls)',
    'Lumiang Cave', 'Marlboro Country', 'Sagada Pine Forest Walk',
    'Log Cabin Cafe', 'St. Mary the Virgin Episcopal Church',
  ],
  Banaue: [
    'Banaue Rice Terraces Viewpoint', 'Batad Rice Terraces', 'Tappiyah Falls',
    'Tam-an Village', 'Banaue Museum', 'Hapao Rice Terraces',
    'Pula Rice Terraces', 'Banaue Market', "People's Lodge Restaurant",
    'Poitan Village',
  ],
  Pangasinan: [
    'Hundred Islands National Park', 'Quezon Island', 'Bolinao Falls',
    'Cape Bolinao Lighthouse', 'Patar Beach', 'Manaoag Church',
    'Enchanted Cave', 'Lingayen Beach', 'Bangus Festival Street Food',
    'Bolinao Marine Laboratory', "Governor's Island", 'Dagupan Bangus Market',
  ],
};

// ── Max new places to add per destination ─────────────────────────────────────
const MAX_NEW = {
  Coron: 8, 'El Nido': 8, Siargao: 8, Bohol: 8,
  Baguio: 5, Vigan: 5, Sagada: 5, Banaue: 5, Pangasinan: 8,
};

// ── Process each destination ───────────────────────────────────────────────────
const plan = {};

Object.entries(raw).forEach(([dest, places]) => {
  const existing = EXISTING[dest] || [];
  const tourists = places.filter(isTourist);

  // ── 1. Image updates for existing places ────────────────────────────────
  const imageUpdates = [];
  existing.forEach(existingName => {
    const match = tourists.find(g => namesMatch(existingName, g.name));
    if (match && match.image) {
      imageUpdates.push({ existingName, googleName: match.name, image: match.image });
    }
  });

  // ── 2. New places not already in existing ──────────────────────────────
  const alreadyCovered = new Set(existing.map(norm));

  const newCandidates = tourists
    .filter(g => !existing.some(e => namesMatch(e, g.name)))
    .filter(g => {
      // Additional quality filter for new places
      const r = g._rating ?? 0;
      const c = g._ratingCount ?? 0;
      return (r >= 4.0 && c >= 10) || (r >= 4.5 && c >= 3) || (r >= 4.7 && c >= 1);
    })
    .sort((a, b) => score(b) - score(a))
    .slice(0, MAX_NEW[dest] || 8);

  plan[dest] = { imageUpdates, newPlaces: newCandidates };

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log(`\n${dest}:`);
  console.log(`  Image updates: ${imageUpdates.length}`);
  imageUpdates.forEach(u => console.log(`    ${u.existingName} ← ${u.googleName}`));
  console.log(`  New places: ${newCandidates.length}`);
  newCandidates.forEach(p =>
    console.log(`    ⭐${p._rating ?? '?'} (${p._ratingCount ?? 0}) ${p.name}`)
  );
});

fs.writeFileSync(OUT_PATH, JSON.stringify(plan, null, 2), 'utf8');
console.log(`\n✓ Saved to ${OUT_PATH}`);
