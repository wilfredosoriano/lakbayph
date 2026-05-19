#!/usr/bin/env node
/**
 * scripts/cleanPlacesData.js
 *
 * Filters rawPlacesData.json — removes non-tourist entries like generic
 * churches, small shops, campsites, offices, etc.
 *
 * Run:  node scripts/cleanPlacesData.js
 * Input:  scripts/output/rawPlacesData.json
 * Output: scripts/output/cleanPlacesData.json
 */

const fs   = require('fs');
const path = require('path');

const IN_PATH  = path.join(__dirname, 'output', 'rawPlacesData.json');
const OUT_PATH = path.join(__dirname, 'output', 'cleanPlacesData.json');

// ── Google place types that are never tourist attractions ─────────────────────
const JUNK_TYPES = new Set([
  'church', 'mosque', 'hindu_temple', 'place_of_worship', 'synagogue',
  'funeral_home', 'cemetery', 'hospital', 'doctor', 'dentist', 'pharmacy',
  'bank', 'atm', 'finance', 'insurance_agency', 'accounting',
  'car_repair', 'car_dealer', 'car_wash', 'gas_station', 'parking',
  'laundry', 'electrician', 'plumber', 'locksmith', 'moving_company',
  'storage', 'post_office', 'local_government_office', 'courthouse',
  'police', 'fire_station', 'embassy',
  'school', 'university', 'primary_school', 'secondary_school',
  'real_estate_agency', 'lawyer',
  'gym', 'beauty_salon', 'hair_care', 'spa',
  'convenience_store', 'grocery_or_supermarket', 'supermarket',
  'hardware_store', 'furniture_store', 'electronics_store',
  'clothing_store', 'shoe_store', 'jewelry_store', 'book_store',
  'bicycle_store', 'pet_store', 'florist',
  'transit_station', 'bus_station', 'airport', 'ferry_terminal',
  'lodging', 'rv_park', 'campground',
]);

// Keep these types even if mixed with junk types
const KEEP_TYPES = new Set([
  'tourist_attraction', 'natural_feature', 'park', 'beach',
  'museum', 'art_gallery', 'aquarium', 'zoo', 'amusement_park',
  'restaurant', 'cafe', 'bakery', 'bar', 'meal_takeaway', 'food',
  'market', 'shopping_mall',
  'night_club', 'movie_theater', 'bowling_alley',
]);

// Name fragments that flag non-tourist entries
const JUNK_NAME_FRAGMENTS = [
  'kingdom hall', 'jehovah', 'church of christ', 'baptist church',
  'adventist church', 'pentecostal', 'evangelical', 'chapel',
  'parish church', 'cathedral parish', 'diocese', 'archdiocese',
  'masjid', 'mosque', 'islamic center', 'islamic community',
  'balik islam', 'community of',
  'barangay', 'brgy ', 'sitio ', 'purok ',
  'elementary school', 'high school', 'national school',
  'hospital', 'clinic', 'health center', 'pharmacy', 'drugstore',
  'funeral', 'memorial park', 'cemetery',
  'hardware', 'auto shop', 'autoshop', 'motor shop',
  'shoe shine', 'laundry', 'barbershop', 'salon', 'footspa', 'nail',
  'supply store', 'school supply', 'office supply',
  'flower shop', 'pawnshop', 'money changer',
  'gas station', 'petron', 'shell station', 'caltex',
  'home depot', 'true value',
  'atm', 'bank branch',
  'campsite', 'camp site', 'glamping', 'campers',
  'water district', 'electric cooperative', 'power corp',
  'parking', 'terminal', 'bus stop',
  'boutique', 'fashion', 'clothing', 'dress shop',
  'mini market', 'minimart', 'sari-sari', 'convenience',
  'fish and meat', 'meat section', 'fish section',
  'fruit and vegetable', 'vegetable store',
  'homestay', 'pension', 'inn ', 'lodge ', 'hostel',
  'resort ', 'villa ', 'apartelle',
];

// Name fragments that are ALWAYS tourist attractions (override junk check)
const FORCE_KEEP_FRAGMENTS = [
  'falls', 'waterfall', 'lagoon', 'lake', 'beach', 'island',
  'cave', 'spring', 'hot spring', 'reef', 'marine park',
  'rice terrace', 'rice field', 'viewpoint', 'view deck',
  'national park', 'heritage', 'museum', 'shrine', 'ruins',
  'fort', 'lighthouse', 'market', 'plaza', 'park',
  'surf', 'dive', 'snorkel', 'zipline',
];

// ── Filter logic ──────────────────────────────────────────────────────────────

function shouldKeep(place) {
  const name  = (place.name || '').toLowerCase();
  const types = place._types || [];

  // Always keep if name contains a tourist keyword
  if (FORCE_KEEP_FRAGMENTS.some((f) => name.includes(f))) return true;

  // Remove if name contains junk fragment
  if (JUNK_NAME_FRAGMENTS.some((f) => name.includes(f))) return false;

  // Keep if any type is a known tourist type
  if (types.some((t) => KEEP_TYPES.has(t))) return true;

  // Remove if ALL types are junk
  if (types.length > 0 && types.every((t) => JUNK_TYPES.has(t))) return false;

  // Keep if it has a real description (not the generic fallback)
  const isGenericDesc = /^A (popular|notable) (landmark|nature|food|beach|activity|shopping) in/.test(place.description);
  if (!isGenericDesc && place.description) return true;

  // Keep if highly rated with many reviews (likely a real attraction)
  if ((place._rating ?? 0) >= 4.3 && (place._ratingCount ?? 0) >= 100) return true;

  return false;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const raw = JSON.parse(fs.readFileSync(IN_PATH, 'utf8'));

const result = {};
let totalBefore = 0;
let totalAfter  = 0;

console.log('Cleaning places data...\n');

Object.entries(raw).forEach(([dest, places]) => {
  const kept    = places.filter(shouldKeep);
  const removed = places.length - kept.length;

  // Re-index IDs cleanly
  kept.forEach((p, i) => {
    p.id = `${dest.toLowerCase().replace(/\s+/g, '')}-new-${i + 1}`;
  });

  result[dest] = kept;
  totalBefore += places.length;
  totalAfter  += kept.length;

  console.log(`${dest}: ${places.length} → ${kept.length} kept  (${removed} removed)`);
  kept.slice(0, 5).forEach((p) => console.log(`  ✓ [${p.category}] ${p.name}`));
  console.log('  ...');
});

fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2), 'utf8');

console.log([
  '',
  `✓ Done!`,
  `  Before : ${totalBefore} places`,
  `  After  : ${totalAfter} places  (${totalBefore - totalAfter} removed)`,
  `  Saved  : scripts/output/cleanPlacesData.json`,
  '',
  'Next: review cleanPlacesData.json, then paste batches here',
  'to fill entranceFee, visitLength, howToGetThere, itineraryTip.',
  '',
].join('\n'));
