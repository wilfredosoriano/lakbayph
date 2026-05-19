#!/usr/bin/env node
/**
 * scripts/buildPlacesData.js
 *
 * Generates src/data/placesData.js by:
 *   1. Injecting Wikimedia image URLs into existing matching entries
 *   2. Appending curated new tourist attractions
 *
 * Run: node scripts/fetchWikimediaImages.js   (first time / after adding places)
 *      node scripts/buildPlacesData.js
 */

const fs   = require('fs');
const path = require('path');

const WIKI_PATH = path.join(__dirname, 'output', 'wikimediaImages.json');
const OUT_PATH  = path.join(__dirname, '..', 'src', 'data', 'placesData.js');

const wikiImages = fs.existsSync(WIKI_PATH)
  ? JSON.parse(fs.readFileSync(WIKI_PATH, 'utf8'))
  : {};

// ── Image lookup ──────────────────────────────────────────────────────────────
function norm(s) {
  return (s || '').toLowerCase()
    .replace(/[ñ]/g, 'n').replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i').replace(/[óòöô]/g, 'o').replace(/[úùüû]/g, 'u')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getImage(_, searchName) {
  return wikiImages[norm(searchName)] || null;
}

// ── New curated places per destination ──────────────────────────────────────
// Each entry: { name, category, description, mustVisit,
//   entranceFee, visitLength, bestTimeToVisit, howToGetThere, itineraryTip,
//   coordinates, travel }
const NEW_PLACES = {





  Baguio: [
    {
      name: "Lion's Head Sculpture",
      category: 'landmark',
      description: 'Iconic concrete lion sculpture along the Kennon Road entrance to Baguio — a beloved landmark and photo stop.',
      mustVisit: false,
      entranceFee: 0,
      visitLength: '10 to 20 min',
      bestTimeToVisit: 'Any time',
      howToGetThere: 'Located along Kennon Road — passed en route from the lowlands to Baguio City, not typically worth a separate trip from town.',
      itineraryTip: 'Stop here when arriving via Kennon Road for the classic Baguio welcome photo — no need to plan a special trip.',
      coordinates: [120.5948, 16.3890],
      travel: { van: '20 min', walk: null, jeepney: null, ferry: null, tricycle: null },
    },
    {
      name: 'Old Diplomat Hotel Ruins',
      category: 'landmark',
      description: 'Haunting abandoned hotel on top of a hill — one of Baguio\'s most atmospheric heritage sites with sweeping city views.',
      mustVisit: false,
      entranceFee: 0,
      visitLength: '30 to 60 min',
      bestTimeToVisit: 'Morning to early afternoon',
      howToGetThere: 'A short jeepney or taxi ride from central Baguio — it is uphill so vehicles are needed for the final approach.',
      itineraryTip: 'Good to combine with Wright Park since they are close — both can be covered in a single late-morning loop.',
      coordinates: [120.6193, 16.4165],
      travel: { jeepney: '15 min', tricycle: '15 min', van: '10 min', ferry: null, walk: null },
    },
    {
      name: 'Mirador Heritage Park',
      category: 'nature',
      description: 'Peaceful hilltop retreat managed by Maryknoll Sisters with hiking trails, mountain views, and a spiritual ambience.',
      mustVisit: false,
      entranceFee: 0,
      visitLength: '1 to 2 hrs',
      bestTimeToVisit: 'Morning to early afternoon',
      howToGetThere: 'Usually reached by taxi or tricycle from central Baguio — it is uphill in the Maryknoll Road area.',
      itineraryTip: 'Great as a quiet escape from the busier tourist spots — combine with BenCab Museum nearby for a full morning outing.',
      coordinates: [120.5700, 16.4250],
      travel: { tricycle: '20 min', van: '15 min', walk: null, jeepney: null, ferry: null },
    },
    {
      name: 'Mines View Observation Deck',
      category: 'landmark',
      description: 'Elevated viewing platform at the popular Mines View Park offering wide panoramic views over the Benguet mining valley.',
      mustVisit: true,
      entranceFee: 0,
      visitLength: '30 to 60 min',
      bestTimeToVisit: 'Morning for clearest mountain views',
      howToGetThere: 'Short jeepney or van ride from central Baguio — jeepneys to Mines View are easy to find near Session Road.',
      itineraryTip: 'Combine with Wright Park and the Mansion nearby since all three are within minutes of each other.',
      coordinates: [120.6268, 16.4196],
      travel: { jeepney: '20 min', van: '15 min', walk: null, ferry: null, tricycle: null },
    },
    {
      name: 'Choco-laté de Batirol',
      category: 'food',
      description: 'Iconic Baguio cafe serving thick, traditionally ground tablea hot chocolate — a must-try cold mountain morning drink.',
      mustVisit: true,
      entranceFee: 0,
      visitLength: '30 to 60 min',
      bestTimeToVisit: 'Morning or afternoon for the hot chocolate',
      howToGetThere: 'Multiple branches in Baguio — most accessible location is near the Burnham Park and Session Road area.',
      itineraryTip: 'Perfect as a warming stop on any cold Baguio morning — pair it with a bibingka from a nearby stall for the full experience.',
      coordinates: [120.5985, 16.4128],
      travel: { walk: '10 min', jeepney: '5 min', van: null, ferry: null, tricycle: null },
    },
  ],

  Vigan: [
    {
      name: 'Bantay Church',
      category: 'landmark',
      description: 'One of the oldest churches in Ilocos — a Spanish colonial fortress church built in 1591, right beside the famous Bantay Bell Tower.',
      mustVisit: false,
      entranceFee: 0,
      visitLength: '20 to 40 min',
      bestTimeToVisit: 'Morning to afternoon',
      howToGetThere: 'Located right beside the Bantay Bell Tower, usually visited together on a short tricycle or kalesa trip from the heritage zone.',
      itineraryTip: 'Combine with the Bell Tower next door since they are on the same grounds — both can be done together in under an hour.',
      coordinates: [120.3893, 17.5982],
      travel: { tricycle: '10 min', walk: '15 min', van: null, jeepney: null, ferry: null },
    },
    {
      name: 'National Museum Ilocos',
      category: 'landmark',
      description: 'Houses significant artifacts from the Ilocos Region, including tobacco industry history, traditional crafts, and colonial-era pieces.',
      mustVisit: false,
      entranceFee: 0,
      visitLength: '45 to 90 min',
      bestTimeToVisit: 'Morning to early afternoon during museum hours',
      howToGetThere: 'Located in the Vigan heritage zone — walking distance from most accommodations near Calle Crisologo.',
      itineraryTip: 'Good as an opening cultural stop before walking Calle Crisologo — the history context makes the heritage street more meaningful.',
      coordinates: [120.3876, 17.5751],
      travel: { walk: '8 min', tricycle: null, van: null, jeepney: null, ferry: null },
    },
    {
      name: 'Plaza Burgos',
      category: 'landmark',
      description: 'Historic plaza in front of the St. Paul Cathedral — the heart of colonial Vigan with a monument to the martyred Father Burgos.',
      mustVisit: false,
      entranceFee: 0,
      visitLength: '15 to 30 min',
      bestTimeToVisit: 'Morning or evening',
      howToGetThere: 'Walking distance from Calle Crisologo and Plaza Salcedo — right at the center of the heritage zone.',
      itineraryTip: 'Just a short walk from Calle Crisologo — easy to include as part of the same heritage walk without adding travel time.',
      coordinates: [120.3875, 17.5745],
      travel: { walk: '5 min', tricycle: null, van: null, jeepney: null, ferry: null },
    },
    {
      name: 'RG Jar Factory (Burnay Pottery)',
      category: 'activity',
      description: 'Watch artisans hand-craft the iconic Vigan burnay jars using centuries-old techniques in a traditional kiln factory.',
      mustVisit: false,
      entranceFee: 0,
      visitLength: '30 to 60 min',
      bestTimeToVisit: 'Morning when potters are actively working',
      howToGetThere: 'Usually reached by tricycle or kalesa from the heritage zone — about 10 minutes south of Calle Crisologo.',
      itineraryTip: 'Good as an afternoon detour if you want to see local craftsmanship — buy a jar directly from the source.',
      coordinates: [120.3903, 17.5620],
      travel: { tricycle: '10 min', walk: null, van: null, jeepney: null, ferry: null },
    },
    {
      name: 'Bicentennial Park',
      category: 'nature',
      description: 'Scenic park along the Mestizo River with colonial structures, open lawns, and a relaxing riverside atmosphere.',
      mustVisit: false,
      entranceFee: 0,
      visitLength: '20 to 45 min',
      bestTimeToVisit: 'Late afternoon',
      howToGetThere: 'Walking distance from the Vigan heritage zone and Calle Crisologo.',
      itineraryTip: 'Easy to include as a gentle evening walk after dinner — the riverside setting offers a peaceful contrast to the busy heritage streets.',
      coordinates: [120.3870, 17.5800],
      travel: { walk: '10 min', tricycle: null, van: null, jeepney: null, ferry: null },
    },
  ],



  Pangasinan: [
    {
      name: 'Patar White Sand Beach',
      category: 'beach',
      description: 'One of the most beautiful and underrated white sand beaches in Northern Luzon — wide, clean, and relatively uncrowded.',
      mustVisit: true,
      entranceFee: 0,
      visitLength: 'Half day to full day',
      bestTimeToVisit: 'Morning to late afternoon',
      howToGetThere: 'Reached by tricycle from Bolinao town — a short ride along the coastal road to the beach entrance.',
      itineraryTip: 'Best combined with Bolinao Falls and the Lighthouse on the same Bolinao day — all three are in the Bolinao area.',
      coordinates: [119.8350, 16.3700],
      travel: { van: '2 hrs', tricycle: '25 min', walk: null, jeepney: null, ferry: null },
    },
    {
      name: 'Blue Lagoon (Bolinao)',
      category: 'nature',
      description: 'Crystal-clear natural swimming pool known locally as the Blue Lagoon or Death Pool — stunning turquoise water.',
      mustVisit: false,
      entranceFee: 30,
      visitLength: '45 to 90 min',
      bestTimeToVisit: 'Morning to early afternoon',
      howToGetThere: 'Located in Bolinao near the marine laboratory — easy to combine with other Bolinao stops on the same day.',
      itineraryTip: 'Great as a short cool-off stop between Bolinao Falls and Patar Beach — keep the visit brief so you have beach time left.',
      coordinates: [119.9050, 16.3800],
      travel: { van: '1.5 hrs', tricycle: '20 min', walk: null, jeepney: null, ferry: null },
    },
    {
      name: 'Tondol White Sand Beach',
      category: 'beach',
      description: 'Shallow sandbar that stretches far into the sea during low tide — one of the best day-trip beaches near Anda.',
      mustVisit: false,
      entranceFee: 30,
      visitLength: '2 to 4 hrs',
      bestTimeToVisit: 'Morning during low tide for the longest sandbar',
      howToGetThere: 'Usually reached by van from Alaminos heading toward Anda town, then a short boat ride to the sandbar.',
      itineraryTip: 'Best as a dedicated Anda beach day rather than squeezing it into a Hundred Islands or Bolinao day — the tide timing matters.',
      coordinates: [119.9400, 16.3100],
      travel: { van: '1 hr', tricycle: null, walk: null, jeepney: null, ferry: '10 min' },
    },
    {
      name: 'Masamirey White Sand Beach',
      category: 'beach',
      description: 'Peaceful and clean white sand beach in Anda, Pangasinan — far less crowded than the more famous Pangasinan beaches.',
      mustVisit: false,
      entranceFee: 0,
      visitLength: '2 to 4 hrs',
      bestTimeToVisit: 'Morning to afternoon',
      howToGetThere: 'Located in Anda, about 1 hour east of Alaminos by van — a separate side trip from the Hundred Islands area.',
      itineraryTip: 'Best as a dedicated quiet beach day for travelers staying multiple days in Pangasinan — Anda is worth the extra drive.',
      coordinates: [119.9720, 16.2900],
      travel: { van: '1 hr', tricycle: null, walk: null, jeepney: null, ferry: null },
    },
    {
      name: 'Lucap Wharf',
      category: 'activity',
      description: 'The main jumping-off point for Hundred Islands boat tours — buy your island-hopping package here.',
      mustVisit: true,
      entranceFee: 0,
      visitLength: '15 to 30 min for booking',
      bestTimeToVisit: 'Early morning to secure a boat before the rush',
      howToGetThere: 'Located in Lucap, Alaminos City — a short tricycle ride from most Alaminos hotels.',
      itineraryTip: 'Arrive early to get first pick of boat packages and start island-hopping before the midday crowds hit.',
      coordinates: [119.9974, 16.1700],
      travel: { tricycle: '10 min', walk: null, van: null, jeepney: null, ferry: null },
    },
    {
      name: 'Bued Mangrove Park',
      category: 'nature',
      description: 'Peaceful mangrove forest walk with bamboo bridges and a viewtower — a hidden eco-tourism gem in Pangasinan.',
      mustVisit: false,
      entranceFee: 30,
      visitLength: '45 to 90 min',
      bestTimeToVisit: 'Morning to early afternoon',
      howToGetThere: 'Located in Sual or Binmaley area — usually reached by van from Dagupan City heading toward the coast.',
      itineraryTip: 'Good as a calm nature stop when transitioning between Dagupan and Alaminos — a refreshing break from driving.',
      coordinates: [120.0700, 16.1800],
      travel: { van: '45 min', tricycle: null, walk: null, jeepney: null, ferry: null },
    },
    {
      name: 'Camp Puor',
      category: 'nature',
      description: 'Mountain camp and nature park with pine trees, hiking trails, and cool mountain air — a refreshing highland escape in Pangasinan.',
      mustVisit: false,
      entranceFee: 30,
      visitLength: '1.5 to 3 hrs',
      bestTimeToVisit: 'Morning to early afternoon',
      howToGetThere: 'Located in the Umingan area of Pangasinan — usually reached by van from Dagupan heading east.',
      itineraryTip: 'Best for travelers who want highland scenery as a contrast to Pangasinan\'s beaches — a full half-day standalone trip.',
      coordinates: [120.4200, 16.1000],
      travel: { van: '1.5 hrs', tricycle: null, walk: null, jeepney: null, ferry: null },
    },
    {
      name: 'Estanza Beach',
      category: 'beach',
      description: 'Quiet beach resort area in Anda with clear water and fine white sand — a relaxed alternative to busier Pangasinan beaches.',
      mustVisit: false,
      entranceFee: 50,
      visitLength: '2 to 4 hrs',
      bestTimeToVisit: 'Morning to afternoon',
      howToGetThere: 'Located in Anda, about 1 hour from Alaminos — best reached by van or rented vehicle.',
      itineraryTip: 'Pair with Tondol Beach and Masamirey on the same Anda day for a relaxed multi-beach exploration.',
      coordinates: [119.9600, 16.3000],
      travel: { van: '1 hr', tricycle: null, walk: null, jeepney: null, ferry: null },
    },
  ],
};

// ── Build the final JS file ───────────────────────────────────────────────────
// Image updates for existing places (from merge plan)
const IMG_UPDATES = {
  Baguio: {
    'Burnham Park':              getImage('Baguio', 'Burnham Park'),
    'Mines View Park':           getImage('Baguio', 'Mines View Park'),
    'Wright Park':               getImage('Baguio', 'Wright Park'),
    'Baguio Cathedral':          getImage('Baguio', 'Baguio Cathedral'),
    'Camp John Hay':             getImage('Baguio', 'Camp John Hay'),
    'Botanical Garden':          getImage('Baguio', 'Botanical Garden'),
    'BenCab Museum':             getImage('Baguio', 'BenCab Museum'),
    'Bell Church':               getImage('Baguio', 'Bell Church'),
    'Valley of Colors':          getImage('Baguio', 'Valley of Colors'),
    'Tam-Awan Village':          getImage('Baguio', 'Tam-Awan Village'),
    'Baguio City Night Market':  getImage('Baguio', 'Baguio City Night Market'),
    'Baguio Public Market':      getImage('Baguio', 'Baguio Public Market'),
    'The Mansion':               getImage('Baguio', 'The Mansion'),
    'Igorot Stone Kingdom':      getImage('Baguio', 'Igorot Stone Kingdom'),
  },
  Vigan: {
    'Calle Crisologo':               getImage('Vigan', 'Calle Crisologo'),
    'Plaza Salcedo':                 getImage('Vigan', 'Plaza Salcedo'),
    'Bantay Bell Tower':             getImage('Vigan', 'Bantay Bell Tower'),
    'St. Paul Metropolitan Cathedral': getImage('Vigan', 'St. Paul Metropolitan Cathedral'),
    'Syquia Mansion Museum':         getImage('Vigan', 'Syquia Mansion Museum'),
    'Crisologo Museum':              getImage('Vigan', 'Crisologo Museum'),
  },
  Pangasinan: {
    'Hundred Islands National Park':     getImage('Pangasinan', 'Hundred Islands National Park'),
    'Quezon Island':                     getImage('Pangasinan', 'Quezon Island'),
    'Bolinao Falls':                     getImage('Pangasinan', 'Bolinao Falls'),
    'Enchanted Cave':                    getImage('Pangasinan', 'Enchanted Cave'),
    "Governor's Island":                 getImage('Pangasinan', "Governor's Island"),
    'Cape Bolinao Lighthouse':           getImage('Pangasinan', 'Cape Bolinao Lighthouse'),
    'Patar Beach':                       getImage('Pangasinan', 'Patar Beach'),
  },
};

// Helper to format a place object as JS
function imgLine(dest, name) {
  const img = (IMG_UPDATES[dest] || {})[name];
  return img ? `      image: '${img}',\n` : `      image: null,\n`;
}

function newPlaceLine(dest, p, idx) {
  const img = getImage(dest, p.name);
  const id  = `${dest.toLowerCase().replace(/[\s']/g, '')}-g${idx + 1}`;
  return `    {
      id: '${id}',
      name: '${p.name.replace(/'/g, "\\'")}',
      category: '${p.category}',
      description: '${p.description.replace(/'/g, "\\'")}',
      mustVisit: ${p.mustVisit},
      entranceFee: ${p.entranceFee},
      visitLength: '${p.visitLength}',
      bestTimeToVisit: '${p.bestTimeToVisit}',
      howToGetThere: '${p.howToGetThere.replace(/'/g, "\\'")}',
      itineraryTip: '${p.itineraryTip.replace(/'/g, "\\'")}',
      image: ${img ? `'${img}'` : 'null'},
      coordinates: [${p.coordinates[0]}, ${p.coordinates[1]}],
      travel: { walk: ${p.travel.walk ? `'${p.travel.walk}'` : 'null'}, tricycle: ${p.travel.tricycle ? `'${p.travel.tricycle}'` : 'null'}, jeepney: ${p.travel.jeepney ? `'${p.travel.jeepney}'` : 'null'}, van: ${p.travel.van ? `'${p.travel.van}'` : 'null'}, ferry: ${p.travel.ferry ? `'${p.travel.ferry}'` : 'null'} },
    }`;
}

// ── Read existing placesData.js and inject images ─────────────────────────────
let content = fs.readFileSync(OUT_PATH, 'utf8');

// Strategy: find each place entry by name and inject/replace the image field
// Places currently have no image field — we'll add it after the description field

function injectImage(content, placeName, dest) {
  const img = (IMG_UPDATES[dest] || {})[placeName];
  if (!img) return content;

  // Find the place block by name (look for name: 'PlaceName')
  const escapedName = placeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const namePattern = new RegExp(
    `(name: '${escapedName}',\\s*\\n(?:.*\\n)*?.*description: '[^']*',)`,
    'g'
  );
  const replacement = `$1\n      image: '${img}',`;

  // Only inject if image field doesn't already exist nearby
  const imgPattern = new RegExp(
    `name: '${escapedName}'[\\s\\S]{0,500}?image:`
  );
  if (imgPattern.test(content)) return content; // already has image

  return content.replace(namePattern, replacement);
}

// Inject images for all existing places
Object.entries(IMG_UPDATES).forEach(([dest, updates]) => {
  Object.keys(updates).forEach(placeName => {
    content = injectImage(content, placeName, dest);
  });
});

// ── Append new places to each destination ────────────────────────────────────
Object.entries(NEW_PLACES).forEach(([dest, newPlaces]) => {
  if (!newPlaces.length) return;

  const newEntries = newPlaces.map((p, i) => newPlaceLine(dest, p, i)).join(',\n');

  // Find the closing bracket of this destination's array
  // Look for: ], followed by next destination comment or end of PLACES_BY_DESTINATION
  const destPattern = new RegExp(
    `(\\/\\/ ── ${dest.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?)(\\n  \\],)`,
  );

  if (destPattern.test(content)) {
    content = content.replace(destPattern, `$1\n${newEntries},\n  $2`);
  } else {
    // Fallback: find by key name
    const keyPattern = new RegExp(`('${dest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}':\\s*\\[)([\\s\\S]*?)(\\n  \\],)`);
    if (keyPattern.test(content)) {
      content = content.replace(keyPattern, `$1$2\n${newEntries},\n  $3`);
    }
  }
});

fs.writeFileSync(OUT_PATH, content, 'utf8');

console.log('\n✓ placesData.js updated!');
Object.entries(IMG_UPDATES).forEach(([dest, updates]) => {
  const count = Object.values(updates).filter(Boolean).length;
  console.log(`  ${dest}: ${count}/${Object.keys(updates).length} images injected`);
});
console.log('\nNew places added:');
Object.entries(NEW_PLACES).forEach(([dest, places]) => {
  console.log(`  ${dest}: +${places.length}`);
});
