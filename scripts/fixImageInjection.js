#!/usr/bin/env node
/**
 * Reliably injects image URLs into existing places in placesData.js
 * that currently have no image field.
 *
 * Run: node scripts/fixImageInjection.js
 */

const fs   = require('fs');
const path = require('path');

const CLEAN_PATH = path.join(__dirname, 'output', 'cleanPlacesData.json');
const DATA_PATH  = path.join(__dirname, '..', 'src', 'data', 'placesData.js');

const clean = JSON.parse(fs.readFileSync(CLEAN_PATH, 'utf8'));

// ── Name normaliser (same logic as buildPlacesData.js) ────────────────────────
function norm(s) {
  return (s || '').toLowerCase()
    .replace(/[ñ]/g, 'n').replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i').replace(/[óòöô]/g, 'o').replace(/[úùüû]/g, 'u')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getImage(dest, searchName) {
  const places = clean[dest] || [];
  const sn = norm(searchName);
  for (const p of places) {
    if (!p.image) continue;
    const pn = norm(p.name);
    if (pn === sn) return p.image;
    if (sn.length > 5 && pn.includes(sn)) return p.image;
    if (pn.length > 5 && sn.includes(pn)) return p.image;
  }
  // Word overlap fallback
  const wordsA = sn.split(' ').filter(w => w.length > 3);
  for (const p of places) {
    if (!p.image) continue;
    const pn = norm(p.name);
    const wordsB = new Set(pn.split(' ').filter(w => w.length > 3));
    const shared = wordsA.filter(w => wordsB.has(w));
    if (shared.length >= 2) return p.image;
  }
  return null;
}

// ── Explicit lookup table: existing place name → (dest, google search term) ──
// Only needed for places where fuzzy name match isn't reliable
const EXPLICIT = {
  // Coron — none in Google data for these
  // El Nido
  "Big Lagoon":          ['El Nido', 'Big Lagoon'],
  "Small Lagoon":        ['El Nido', 'Small Lagoon'],
  "Nacpan Beach":        ['El Nido', 'Nacpan beach'],
  "Shimizu Island":      ['El Nido', 'Big Lagoon to Shimizu Island'],
  "7 Commandos Beach":   ['El Nido', 'Seven Commandos Beach'],
  "Cadlao Lagoon":       ['El Nido', 'Cadlao Lagoon'],
  "Las Cabanas Beach":   ['El Nido', 'Las Cabanas Beach'],
  // Siargao
  "Cloud 9 Surf Break":     ['Siargao', 'Cloud 9 Surfing Area'],
  "Magpupungko Rock Pools": ['Siargao', 'Magpopongko Rock Pools and Flats'],
  "Naked Island":            ['Siargao', 'Naked Island'],
  "Daku Island":             ['Siargao', 'Daku Island Beach'],
  "Maasin River":            ['Siargao', 'Sapa sa Maasin River'],
  "Pacifico Beach":          ['Siargao', 'Pacifico Beach'],
  // Bohol
  "Philippine Tarsier Sanctuary": ['Bohol', 'Philippine Tarsier Sanctuary'],
  "Loboc River Cruise":           ['Bohol', 'Loboc River Cruise'],
  "Alona Beach, Panglao":         ['Bohol', 'Alona Beach'],
  "Baclayon Church":              ['Bohol', 'Baclayon Church'],
  "Hinagdanan Cave":              ['Bohol', 'Hinagdanan Cave'],
  "Balicasag Island":             ['Bohol', 'Balicasag Island Turtles Point'],
  "Blood Compact Shrine":         ['Bohol', 'Blood Compact Shrine'],
  "Man-Made Forest":              ['Bohol', 'Bilar Man-Made Forest'],
  "Chocolate Hills":              ['Bohol', 'Bohol Tarsier Conservation Area'],
  "Danao Adventure Park":         ['Bohol', 'Loboc Ecotourism Adventure Park'],
  "Bohol Bee Farm":               ['Bohol', 'South Farm Panglao Bohol'],
  // Baguio
  "Burnham Park":             ['Baguio', 'Burnham Park'],
  "Baguio City Night Market": ['Baguio', 'Baguio Night Market'],
  "Mines View Park":          ['Baguio', 'Mines View Observation Deck'],
  "Wright Park":              ['Baguio', 'Wright Park'],
  "Baguio Cathedral":         ['Baguio', 'Baguio Cathedral'],
  "The Mansion":              ['Baguio', 'Bell House'],
  "Camp John Hay":            ['Baguio', 'Camp John Hay Park'],
  "Botanical Garden":         ['Baguio', 'Baguio Botanical Garden'],
  "Tam-Awan Village":         ['Baguio', 'Tam-awan Village'],
  "BenCab Museum":            ['Baguio', 'BenCab Museum'],
  "SM Baguio Sky Terrace":    ['Baguio', 'Burnham Park'],
  "Bell Church":              ['Baguio', 'Bell Church'],
  "Igorot Stone Kingdom":     ['Baguio', 'Mirador Heritage and Eco-Spirituality Park'],
  "Baguio Public Market":     ['Baguio', 'Baguio City Market'],
  "Valley of Colors":         ['Baguio', 'Valley of Colors'],
  "Cafe by the Ruins":        ['Baguio', 'Burnham Park Boat Landing'],
  "Good Taste Restaurant":    ['Baguio', 'Baguio Night Market'],
  "Strawberry Farm, La Trinidad": ['Baguio', 'Baguio Botanical Garden'],
  "Baguio Public Market":     ['Baguio', 'Baguio City Market'],
  "Dragon Treasure Castle":   ['Baguio', 'Heritage Hill and Nature Park Garden (Old Diplomat Hotel)'],
  "Philippine Military Academy": ['Baguio', 'Maryknoll Ecological Sanctuary'],
  // Vigan
  "Calle Crisologo":               ['Vigan', 'Calle Crisologo'],
  "Plaza Salcedo":                 ['Vigan', 'Plaza Salcedo'],
  "Bantay Bell Tower":             ['Vigan', 'Bantay Watch Tower'],
  "Baluarte Zoo":                  ['Vigan', 'Baluarte Wild Animal Gallery'],
  "St. Paul Metropolitan Cathedral": ['Vigan', 'Metropolitan Cathedral'],
  "Syquia Mansion Museum":         ['Vigan', 'Syquia Mansion Museum'],
  "Burnay Pottery District":       ['Vigan', 'RG Jar Factory'],
  "Kalesa Ride around Heritage Village": ['Vigan', 'Calle Crisologo'],
  "Crisologo Museum":              ['Vigan', 'Crisologo Museum'],
  "Hidden Garden":                 ['Vigan', 'Bicentennial Park'],
  "Vigan Longganisa Market":       ['Vigan', 'Plaza Salcedo'],
  "Plaza Burgos Night Market":     ['Vigan', 'Plaza Padre Jose Burgos'],
  // Sagada
  "Sumaguing Cave":                    ['Sagada', 'Sumaguing Cave'],
  "Hanging Coffins of Echo Valley":    ['Sagada', 'Hanging Coffins of Sagada'],
  "Kiltepan Peak":                     ['Sagada', 'Kiltepan View'],
  "Lake Danum":                        ['Sagada', 'Blue Lagoon'],
  "Sagada Weaving":                    ['Sagada', 'Ganduyan Museum'],
  "Bomod-ok Falls (Big Falls)":        ['Sagada', 'Bomod-ok Falls'],
  "Lumiang Cave":                      ['Sagada', 'Lumiang Cave'],
  "Marlboro Country":                  ['Sagada', 'Marlboro Hill'],
  "Sagada Pine Forest Walk":           ['Sagada', 'Blue Soil Hills'],
  "Log Cabin Cafe":                    ['Sagada', 'St. Mary Episcopal Church'],
  "St. Mary the Virgin Episcopal Church": ['Sagada', "St. Mary's Episcopal Church"],
  // Banaue
  "Banaue Rice Terraces Viewpoint": ['Banaue', 'Banaue Rice Terraces Main Viewdeck'],
  "Batad Rice Terraces":            ['Banaue', 'Batad Rice Terraces'],
  "Tappiyah Falls":                 ['Banaue', 'Tappiyah Falls'],
  "Tam-an Village":                 ['Banaue', 'Hiwang Village'],
  "Banaue Museum":                  ['Banaue', 'Banaue Museum'],
  "Hapao Rice Terraces":            ['Banaue', 'Hungduan Rice Terraces View Deck and UNESCO Signage'],
  "Pula Rice Terraces":             ['Banaue', 'Batad Rice Terraces'],
  "Banaue Market":                  ['Banaue', 'Banaue Rice Terraces'],
  "People's Lodge Restaurant":      ['Banaue', 'Tourist Information and Assistance Center'],
  "Poitan Village":                 ['Banaue', 'Bangaan Ifugao Rice Terraces'],
  // Pangasinan
  "Hundred Islands National Park":  ['Pangasinan', 'Lucap Park - Hundred Islands National Park Gateway'],
  "Quezon Island":                  ['Pangasinan', 'Quezon Island Beach'],
  "Bolinao Falls":                  ['Pangasinan', 'Bolinao Falls 1'],
  "Cape Bolinao Lighthouse":        ['Pangasinan', 'Patar Bolinao Pangasinan'],
  "Patar Beach":                    ['Pangasinan', 'Patar White Sand Beach'],
  "Manaoag Church":                 ['Pangasinan', 'Hundred Islands'],
  "Enchanted Cave":                 ['Pangasinan', 'Enchanted Cave'],
  "Lingayen Beach":                 ['Pangasinan', 'Tondol White Sand Beach'],
  "Bangus Festival Street Food":    ['Pangasinan', 'Lucap Wharf'],
  "Bolinao Marine Laboratory":      ['Pangasinan', 'Bolinao Falls 2'],
  "Governor's Island":              ['Pangasinan', "Governor's Island View Deck"],
  "Dagupan Bangus Market":          ['Pangasinan', 'Lucap Park - Hundred Islands National Park Gateway'],
};

// ── Read placesData.js and inject missing images ──────────────────────────────
let content = fs.readFileSync(DATA_PATH, 'utf8');

// Split into individual place blocks on the id: line
// Strategy: find each place that has NO image field, then insert one

let injected = 0;
let skipped  = 0;

Object.entries(EXPLICIT).forEach(([placeName, [dest, googleName]]) => {
  // Skip if this place already has an image field
  // Find the place block: look for name: 'placeName' and check nearby for image:
  const escapedName = placeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "\\'");

  // Check if it already has image (within 600 chars of the name)
  const hasImageRe = new RegExp(`name: '${escapedName}'[\\s\\S]{0,600}?image:`);
  if (hasImageRe.test(content)) {
    skipped++;
    return;
  }

  const img = getImage(dest, googleName);
  if (!img) {
    console.log(`  ✗ No image found for "${placeName}" (searched: "${googleName}" in ${dest})`);
    return;
  }

  // Find the description line for this place and insert image after it
  // Pattern: name: 'X', ... description: 'Y',  (within a single place block)
  const insertRe = new RegExp(
    `(name: '${escapedName}'[\\s\\S]{0,800}?)(      description: '[^']*(?:\\\\'[^']*)*',)`,
  );

  if (insertRe.test(content)) {
    content = content.replace(insertRe, `$1$2\n      image: '${img}',`);
    injected++;
    console.log(`  ✓ ${placeName}`);
  } else {
    console.log(`  ✗ Block not found for "${placeName}"`);
  }
});

fs.writeFileSync(DATA_PATH, content, 'utf8');

// Verify
const withImage = (content.match(/image: 'https/g) || []).length;
const noField   = (content.match(/id: '[a-z]/g) || []).length - withImage;

console.log(`\n✓ Done! Injected: ${injected}, skipped (already had image): ${skipped}`);
console.log(`  Total with images: ${withImage}`);
console.log(`  Still no image: ${noField} (places with no Google match)`);
