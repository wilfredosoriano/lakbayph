#!/usr/bin/env node
/**
 * scripts/buildPlacesData.js
 *
 * Generates src/data/placesData.js by:
 *   1. Injecting Google photo URLs into existing matching entries
 *   2. Appending curated new tourist attractions from cleanPlacesData.json
 *
 * Run: node scripts/buildPlacesData.js
 */

const fs   = require('fs');
const path = require('path');

const CLEAN_PATH = path.join(__dirname, 'output', 'cleanPlacesData.json');
const OUT_PATH   = path.join(__dirname, '..', 'src', 'data', 'placesData.js');

const clean = JSON.parse(fs.readFileSync(CLEAN_PATH, 'utf8'));

// ── Image lookup ──────────────────────────────────────────────────────────────
// Build a fast name → image map for each destination
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

// ── New curated places per destination ──────────────────────────────────────
// Each entry: { googleSearchName, name, category, description, mustVisit,
//   entranceFee, visitLength, bestTimeToVisit, howToGetThere, itineraryTip,
//   coordinates, travel }
const NEW_PLACES = {

  Coron: [
    {
      googleSearchName: 'Pass Island Beach',
      name: 'Pass Island Beach',
      category: 'beach',
      description: 'Pristine white sand island with crystal-clear waters, accessible only by boat from Coron Town.',
      mustVisit: false,
      entranceFee: 100,
      visitLength: '1.5 to 2.5 hrs',
      bestTimeToVisit: 'Morning to early afternoon',
      howToGetThere: 'Reached by boat from Coron Town, usually part of a northern island-hopping tour package.',
      itineraryTip: 'Good as a swimming and relaxation stop paired with other northern island spots on the same boat day.',
      coordinates: [119.9238795, 11.9910222],
      travel: { ferry: '30 min', walk: null, van: null, jeepney: null, tricycle: null },
    },
    {
      googleSearchName: 'Duiklocatie Okikawa Maru',
      name: 'Okikawa Maru Wreck',
      category: 'activity',
      description: 'WWII Japanese supply ship wreck — one of the most accessible wrecks in Coron for snorkelers and divers.',
      mustVisit: false,
      entranceFee: 250,
      visitLength: '1 to 2 hrs',
      bestTimeToVisit: 'Morning for best water visibility',
      howToGetThere: 'Reached by boat from Coron Town — usually grouped with other wreck dives on the same day tour.',
      itineraryTip: 'Best combined with other nearby wrecks like Akitsushima on a dedicated wreck dive day.',
      coordinates: [119.96975, 12.017788],
      travel: { ferry: '20 min', walk: null, van: null, jeepney: null, tricycle: null },
    },
    {
      googleSearchName: 'Duiklocatie Akitsushima',
      name: 'Akitsushima Wreck',
      category: 'activity',
      description: 'A sunken Japanese WWII seaplane tender — one of the largest wrecks in Coron and great for diving.',
      mustVisit: false,
      entranceFee: 250,
      visitLength: '1 to 2 hrs',
      bestTimeToVisit: 'Morning for calm and clear water',
      howToGetThere: 'Reached by boat from Coron Town — usually combined with the Okikawa Maru wreck on a dive day.',
      itineraryTip: 'Pair with other wreck sites so the full boat day is maximized across multiple diving stops.',
      coordinates: [119.9475, 11.9904],
      travel: { ferry: '25 min', walk: null, van: null, jeepney: null, tricycle: null },
    },
    {
      googleSearchName: 'Nagbinet Island',
      name: 'Nagbinet Island',
      category: 'beach',
      description: 'Remote island with soft white sand and turquoise water — less visited and perfect for a quiet escape.',
      mustVisit: false,
      entranceFee: 100,
      visitLength: '1.5 to 2.5 hrs',
      bestTimeToVisit: 'Morning to early afternoon',
      howToGetThere: 'Reached by boat from Coron Town on northern island route tours — less common in standard packages.',
      itineraryTip: 'Best for those wanting fewer crowds — pair with Pass Island on a northern island-hopping day.',
      coordinates: [119.9410, 11.9950],
      travel: { ferry: '45 min', walk: null, van: null, jeepney: null, tricycle: null },
    },
    {
      googleSearchName: 'Kiwit Flowing Pool',
      name: 'Kiwit Flowing Pool',
      category: 'nature',
      description: 'Natural freshwater pool fed by mountain springs and surrounded by mangroves — a refreshing hidden gem.',
      mustVisit: false,
      entranceFee: 100,
      visitLength: '1 to 2 hrs',
      bestTimeToVisit: 'Morning to early afternoon',
      howToGetThere: 'Reached by boat from Coron Town then a short walk — sometimes included in northern island tours.',
      itineraryTip: 'A refreshing stop after sun-heavy island time — works well as a late morning stop on the same boat day.',
      coordinates: [119.9200, 11.9800],
      travel: { ferry: '40 min', walk: null, van: null, jeepney: null, tricycle: null },
    },
  ],

  'El Nido': [
    {
      googleSearchName: 'Lio Beach',
      name: 'Lio Beach',
      category: 'beach',
      description: 'Peaceful, less-crowded beach north of El Nido Town — great for sunset watching and beachside dining.',
      mustVisit: false,
      entranceFee: 0,
      visitLength: '1.5 to 3 hrs',
      bestTimeToVisit: 'Late afternoon to sunset',
      howToGetThere: 'Usually reached by short tricycle or e-bike ride from El Nido Town — about 10 minutes heading north.',
      itineraryTip: 'Save this for a chill afternoon when you want a quieter beach than Las Cabanas — the sunset view here is excellent.',
      coordinates: [119.4000, 11.2000],
      travel: { tricycle: '10 min', walk: '30 min', van: null, jeepney: null, ferry: null },
    },
    {
      googleSearchName: 'Papaya Beach',
      name: 'Papaya Beach',
      category: 'beach',
      description: 'A quieter beach on the northern end of El Nido with soft white sand and clear water.',
      mustVisit: false,
      entranceFee: 0,
      visitLength: '1 to 2 hrs',
      bestTimeToVisit: 'Morning to late afternoon',
      howToGetThere: 'Usually reached by tricycle or e-bike from El Nido Town heading north — about 15 minutes away.',
      itineraryTip: 'A good option for an early morning swim before island tours depart, or a relaxed half-day on a non-tour day.',
      coordinates: [119.4100, 11.2200],
      travel: { tricycle: '15 min', walk: null, van: null, jeepney: null, ferry: null },
    },
    {
      googleSearchName: 'El Nido Via Ferrata Canopy Walk',
      name: 'El Nido Via Ferrata Canopy Walk',
      category: 'activity',
      description: 'Climb and traverse the limestone cliffs above El Nido Town using iron rungs, ropes, and a canopy walk.',
      mustVisit: false,
      entranceFee: 900,
      visitLength: '2 to 3 hrs',
      bestTimeToVisit: 'Morning or late afternoon to avoid peak heat',
      howToGetThere: 'Operators are located in El Nido Town Proper — book in advance as group sizes are limited for safety.',
      itineraryTip: 'Best as a dedicated non-boat-day activity — the views over El Nido Bay from the top are worth the climb.',
      coordinates: [119.4096, 11.1833],
      travel: { walk: '10 min', tricycle: null, van: null, jeepney: null, ferry: null },
    },
    {
      googleSearchName: 'Taraw Cliff',
      name: 'Taraw Cliff',
      category: 'activity',
      description: 'Steep limestone cliff hike above El Nido Town offering one of the best panoramic views in Palawan.',
      mustVisit: true,
      entranceFee: 200,
      visitLength: '2 to 3 hrs',
      bestTimeToVisit: 'Early morning or late afternoon',
      howToGetThere: 'Guides are required — book at the El Nido Tourism Office in town. The trailhead is within walking distance.',
      itineraryTip: 'Schedule this on a day without island tours — the climb is demanding, and the view deserves your full attention.',
      coordinates: [119.4063, 11.1893],
      travel: { walk: '5 min', tricycle: null, van: null, jeepney: null, ferry: null },
    },
    {
      googleSearchName: 'Ille Cave',
      name: 'Ille Cave',
      category: 'landmark',
      description: 'Prehistoric cave with ancient burial sites and a freshwater river flowing through it — a UNESCO fossil site.',
      mustVisit: false,
      entranceFee: 50,
      visitLength: '1 to 2 hrs',
      bestTimeToVisit: 'Morning to early afternoon',
      howToGetThere: 'Located in New Ibajay, about 20 km north of El Nido Town — usually reached by van or rented motorbike.',
      itineraryTip: 'Good for a day when Nacpan Beach is also on the plan — both are heading north so they can be combined efficiently.',
      coordinates: [119.4400, 11.2600],
      travel: { van: '30 min', tricycle: null, walk: null, jeepney: null, ferry: null },
    },
    {
      googleSearchName: 'Cudugnon Cave',
      name: 'Cudugnon Cave',
      category: 'landmark',
      description: 'Sea cave with ancient burial jars — swim through the entrance at low tide and explore inside.',
      mustVisit: false,
      entranceFee: 200,
      visitLength: '45 to 90 min',
      bestTimeToVisit: 'Morning to early afternoon, at low tide',
      howToGetThere: 'Reached by island-hopping boat as part of Tour C from El Nido Town — combined with Matinloc Shrine and Secret Beach.',
      itineraryTip: 'Let the tide schedule guide your stop timing — the cave entrance requires low tide to enter safely.',
      coordinates: [119.6600, 11.1200],
      travel: { ferry: '1.5 hrs', walk: null, van: null, jeepney: null, tricycle: null },
    },
    {
      googleSearchName: 'Cathedral Cave',
      name: 'Cathedral Cave',
      category: 'landmark',
      description: 'Towering sea cave with cathedral-like rock formations — a kayaking highlight in the Bacuit Archipelago.',
      mustVisit: false,
      entranceFee: 200,
      visitLength: '1 to 1.5 hrs',
      bestTimeToVisit: 'Morning when light filters through the rock openings',
      howToGetThere: 'Reached by island-hopping boat from El Nido Town — typically included in Tour A or Tour B packages.',
      itineraryTip: 'The best light inside the cave is in the morning — time your tour day so this stop is made before noon.',
      coordinates: [119.3600, 11.1700],
      travel: { ferry: '40 min', walk: null, van: null, jeepney: null, tricycle: null },
    },
  ],

  Siargao: [
    {
      googleSearchName: 'Cloud 9 Surfing Area',
      name: 'Cloud 9 Boardwalk',
      category: 'activity',
      description: 'Iconic wooden boardwalk leading to the famous Cloud 9 surf break — great for watching surfers even if you do not surf.',
      mustVisit: true,
      entranceFee: 0,
      visitLength: '30 to 90 min',
      bestTimeToVisit: 'Early morning or late afternoon',
      howToGetThere: 'Short tricycle or scooter ride from General Luna accommodations toward the Cloud 9 area.',
      itineraryTip: 'A classic Siargao stop even for non-surfers — the boardwalk view and surrounding cafes make it a great afternoon hangout.',
      coordinates: [126.1652, 9.8137],
      travel: { tricycle: '10 min', walk: null, van: null, jeepney: null, ferry: null },
    },
    {
      googleSearchName: 'Tayangban Cave Pool',
      name: 'Tayangban Cave Pool',
      category: 'nature',
      description: 'Underground cave pool connected by narrow passages — bring a waterproof light and expect a thrilling swim.',
      mustVisit: true,
      entranceFee: 50,
      visitLength: '1.5 to 3 hrs',
      bestTimeToVisit: 'Morning to early afternoon',
      howToGetThere: 'Usually reached by van or tricycle from General Luna heading inland — about 45 minutes away.',
      itineraryTip: 'Excellent combined with Magpupungko on the same inland day since both are roughly in the same direction.',
      coordinates: [126.1900, 9.8800],
      travel: { van: '45 min', tricycle: '1 hr', walk: null, jeepney: null, ferry: null },
    },
    {
      googleSearchName: 'Coconut Plantation View Point',
      name: 'Coconut Road Viewpoint',
      category: 'nature',
      description: 'Towering coconut palms lining the road create a natural canopy — one of the most iconic sights in Siargao.',
      mustVisit: false,
      entranceFee: 0,
      visitLength: '20 to 45 min',
      bestTimeToVisit: 'Morning or late afternoon for best light',
      howToGetThere: 'Passed along the main road heading out of General Luna toward Pilar — easy to stop during any island trip.',
      itineraryTip: 'Great for a quick photo stop en route to other destinations — no need to dedicate a special trip.',
      coordinates: [126.0300, 9.8700],
      travel: { tricycle: '20 min', van: '15 min', walk: null, jeepney: null, ferry: null },
    },
    {
      googleSearchName: 'Beto Cold Spring',
      name: 'Beto Cold Spring',
      category: 'nature',
      description: 'Natural freshwater cold spring where you can swim and cool off — a favorite local spot away from the beach.',
      mustVisit: false,
      entranceFee: 50,
      visitLength: '1 to 2 hrs',
      bestTimeToVisit: 'Late morning to early afternoon',
      howToGetThere: 'Usually reached by tricycle or habal-habal from General Luna heading toward the interior of the island.',
      itineraryTip: 'Good as an afternoon break on a hot day when you want a change from saltwater — very refreshing.',
      coordinates: [126.0700, 9.9000],
      travel: { tricycle: '30 min', van: '20 min', walk: null, jeepney: null, ferry: null },
    },
  ],

  Bohol: [
    {
      googleSearchName: 'Loboc Ecotourism Adventure Park',
      name: 'Loboc Ecotourism Adventure Park',
      category: 'activity',
      description: 'Zip-lines, tree bridges, and nature walks along the Loboc River — one of the best adventure parks in Bohol.',
      mustVisit: false,
      entranceFee: 150,
      visitLength: '1.5 to 3 hrs',
      bestTimeToVisit: 'Morning to early afternoon',
      howToGetThere: 'Located in Loboc, accessible by van from Tagbilaran or Panglao — usually combined with the Loboc River Cruise nearby.',
      itineraryTip: 'Pair with the Loboc River Cruise on the same day since both are in the Loboc area and share similar travel time.',
      coordinates: [124.0300, 9.6300],
      travel: { van: '45 min', jeepney: null, walk: null, ferry: null, tricycle: null },
    },
    {
      googleSearchName: 'Pangas Falls',
      name: 'Pangas Falls',
      category: 'nature',
      description: 'Stunning waterfall hidden in the Bohol hills — swim in the natural pool at its base.',
      mustVisit: false,
      entranceFee: 30,
      visitLength: '1.5 to 2.5 hrs',
      bestTimeToVisit: 'Morning for cooler temperature and better water level',
      howToGetThere: 'Usually reached by van or motorcycle from Tagbilaran heading to Balilihan — requires a short hike to the falls.',
      itineraryTip: 'Good as a nature add-on for travelers staying multiple days in Bohol who have already seen the main Panglao highlights.',
      coordinates: [123.8900, 9.7800],
      travel: { van: '1 hr', jeepney: null, walk: '20 min', ferry: null, tricycle: null },
    },
    {
      googleSearchName: 'Sikatuna Mirror of The World',
      name: 'Sikatuna Mirror of the World',
      category: 'activity',
      description: 'Family-friendly attraction with a mirror maze, scenic viewpoint, and interactive exhibits in the Bohol hills.',
      mustVisit: false,
      entranceFee: 150,
      visitLength: '1.5 to 2.5 hrs',
      bestTimeToVisit: 'Morning to early afternoon',
      howToGetThere: 'Located in the Bohol interior near Carmen — usually visited as part of a Chocolate Hills countryside tour.',
      itineraryTip: 'Easy to combine with Chocolate Hills on the same day since they are close together in the interior.',
      coordinates: [124.1500, 9.8200],
      travel: { van: '1.5 hrs', jeepney: null, walk: null, ferry: null, tricycle: null },
    },
    {
      googleSearchName: 'TAUG WHALESHARK WATCHING AND SNORKELING',
      name: 'Oslob Whale Shark Watching (Bohol)',
      category: 'activity',
      description: 'Snorkel alongside whale sharks in their natural habitat — one of the most breathtaking ocean experiences in the Philippines.',
      mustVisit: true,
      entranceFee: 1000,
      visitLength: '2 to 3 hrs',
      bestTimeToVisit: 'Early morning — sharks are most active before 9AM',
      howToGetThere: 'Head to the whale shark watching site via organized tour from Tagbilaran or Panglao — depart before 6AM.',
      itineraryTip: 'Book in advance and depart very early — the whale shark encounter happens in the morning and sites get crowded fast.',
      coordinates: [124.0100, 9.5500],
      travel: { van: '1.5 hrs', jeepney: null, walk: null, ferry: null, tricycle: null },
    },
    {
      googleSearchName: 'National Museum of the Philippines - Bohol',
      name: 'National Museum Bohol',
      category: 'landmark',
      description: 'Houses Bohol\'s most significant historical artifacts including the iconic golden tara figurine and Bohol heritage collections.',
      mustVisit: false,
      entranceFee: 0,
      visitLength: '45 to 90 min',
      bestTimeToVisit: 'Morning to early afternoon during museum hours',
      howToGetThere: 'Located in Tagbilaran City, easily reachable on foot or by tricycle from the city center.',
      itineraryTip: 'Good as an opening stop to understand Bohol\'s history before heading to Panglao beaches or countryside sites.',
      coordinates: [123.8540, 9.6575],
      travel: { tricycle: '10 min', walk: '15 min', van: null, jeepney: null, ferry: null },
    },
    {
      googleSearchName: 'Balicasag Marine Sanctuary',
      name: 'Balicasag Marine Sanctuary',
      category: 'activity',
      description: 'Marine protected area around Balicasag Island with spectacular coral walls, sea turtles, and diverse reef fish.',
      mustVisit: true,
      entranceFee: 200,
      visitLength: '2 to 4 hrs',
      bestTimeToVisit: 'Morning for best visibility and calmer seas',
      howToGetThere: 'Boats depart from Alona Beach in Panglao — join a shared snorkel tour or rent a private boat.',
      itineraryTip: 'Treat as a half-day ocean focus — the marine sanctuary and turtle point together make for a full morning without rushing.',
      coordinates: [123.7050, 9.5100],
      travel: { ferry: '45 min', walk: null, van: null, jeepney: null, tricycle: null },
    },
  ],

  Baguio: [
    {
      googleSearchName: 'Lion\'s Head',
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
      googleSearchName: 'Heritage Hill and Nature Park Garden (Old Diplomat Hotel)',
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
      googleSearchName: 'Mirador Heritage and Eco-Spirituality Park',
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
      googleSearchName: 'Mines View Observation Deck',
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
      googleSearchName: 'Choco-laté de Batirol',
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
      googleSearchName: 'Parish of Saint Augustine of Hippo (Bantay Church)',
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
      googleSearchName: 'National Museum of the Philippines - Ilocos',
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
      googleSearchName: 'Plaza Padre Jose Burgos',
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
      googleSearchName: 'RG Jar Factory',
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
      googleSearchName: 'Bicentennial Park',
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

  Sagada: [
    {
      googleSearchName: 'Marlboro Hill',
      name: 'Marlboro Country Hills',
      category: 'nature',
      description: 'Rolling green hills with open pastures and cattle grazing — the most photographed landscape in Sagada.',
      mustVisit: true,
      entranceFee: 0,
      visitLength: '1 to 2 hrs',
      bestTimeToVisit: 'Late afternoon for golden hour light on the hills',
      howToGetThere: 'Usually reached by habal-habal or van from Sagada town — about 20 minutes on rough mountain road.',
      itineraryTip: 'Best as a late afternoon stop after morning cave and valley activities — the golden light on the rolling hills is the best reward.',
      coordinates: [120.9200, 17.1000],
      travel: { van: '20 min', walk: null, tricycle: null, jeepney: null, ferry: null },
    },
    {
      googleSearchName: 'Blue Soil Hills',
      name: 'Blue Soil Hills',
      category: 'nature',
      description: 'Distinctive blue-gray clay hills with dramatic textures and unusual color that stand out against the pine forest backdrop.',
      mustVisit: false,
      entranceFee: 0,
      visitLength: '30 to 60 min',
      bestTimeToVisit: 'Morning to afternoon',
      howToGetThere: 'A short walk from Sagada town center — easy to reach on foot and often combined with nearby town walks.',
      itineraryTip: 'Good as a quick visual contrast to the pine forest scenery — easy to fit in between other Sagada activities.',
      coordinates: [120.9050, 17.0800],
      travel: { walk: '15 min', tricycle: null, van: null, jeepney: null, ferry: null },
    },
    {
      googleSearchName: 'The Bontoc Museum',
      name: 'Bontoc Museum',
      category: 'landmark',
      description: 'Fascinating ethnographic museum in nearby Bontoc town documenting the headhunting culture, rituals, and daily life of Cordillera tribes.',
      mustVisit: false,
      entranceFee: 50,
      visitLength: '45 to 90 min',
      bestTimeToVisit: 'Morning to early afternoon during museum hours',
      howToGetThere: 'Located in Bontoc, about 30 minutes from Sagada by jeepney or van — easy to include on the way to or from Sagada.',
      itineraryTip: 'Best visited on your way from Banaue to Sagada since Bontoc is a natural stopover between the two destinations.',
      coordinates: [120.9700, 17.0800],
      travel: { van: '30 min', jeepney: '35 min', walk: null, tricycle: null, ferry: null },
    },
    {
      googleSearchName: 'Bokong Falls',
      name: 'Bokong Falls',
      category: 'nature',
      description: 'Small but scenic waterfall within Sagada — accessible on a short trek near the town center.',
      mustVisit: false,
      entranceFee: 0,
      visitLength: '45 to 90 min',
      bestTimeToVisit: 'Morning',
      howToGetThere: 'A short 20-minute walk from Sagada town center — ask at your inn for directions to the trailhead.',
      itineraryTip: 'Good as a quick morning warm-up before heading to bigger treks like Bomod-ok Falls — easy and accessible.',
      coordinates: [120.9050, 17.0700],
      travel: { walk: '20 min', van: null, tricycle: null, jeepney: null, ferry: null },
    },
  ],

  Banaue: [
    {
      googleSearchName: 'Aguian View Deck',
      name: 'Aguian Viewpoint',
      category: 'landmark',
      description: 'Alternative viewpoint of the Banaue Rice Terraces offering a wider, less-photographed angle of the UNESCO landscape.',
      mustVisit: false,
      entranceFee: 0,
      visitLength: '30 to 60 min',
      bestTimeToVisit: 'Early morning for clear views',
      howToGetThere: 'A short walk or tricycle ride from Banaue town center — often combined with the main viewpoint nearby.',
      itineraryTip: 'Visit this alongside the main viewpoint for a different perspective — both are close together and can be done in one morning.',
      coordinates: [121.0550, 16.9190],
      travel: { walk: '15 min', tricycle: null, van: null, jeepney: null, ferry: null },
    },
    {
      googleSearchName: 'Bangaan Ifugao Rice Terraces',
      name: 'Bangaan Village Terraces',
      category: 'nature',
      description: 'Authentic Ifugao village clinging to the terraced hillside — one of the most picturesque communities in the Banaue area.',
      mustVisit: false,
      entranceFee: 0,
      visitLength: '1.5 to 3 hrs',
      bestTimeToVisit: 'Morning',
      howToGetThere: 'Usually reached by jeepney from Banaue heading toward Bontoc — Bangaan is a short detour from the main road.',
      itineraryTip: 'Good for a cultural village walk on a day separate from Batad — the terrace views here are equally dramatic but far less crowded.',
      coordinates: [121.0700, 16.9300],
      travel: { jeepney: '30 min', walk: null, van: null, tricycle: null, ferry: null },
    },
    {
      googleSearchName: 'Ducligan Snake River Viewpoint',
      name: 'Ducligan Snake River Viewpoint',
      category: 'landmark',
      description: 'Dramatic viewpoint overlooking the snake-shaped Ifugao river winding through dense rice terraces below.',
      mustVisit: false,
      entranceFee: 0,
      visitLength: '30 to 60 min',
      bestTimeToVisit: 'Morning for clear weather views',
      howToGetThere: 'Usually reached by van or hired motorcycle from Banaue town — about 15 to 20 minutes away on mountain roads.',
      itineraryTip: 'Pair this with the Ducligan hot spring nearby for a full afternoon away from the main terrace circuit.',
      coordinates: [121.0800, 16.9400],
      travel: { van: '20 min', tricycle: null, walk: null, jeepney: null, ferry: null },
    },
    {
      googleSearchName: 'Rice Terraces of the Philippine Cordilleras',
      name: 'Ifugao Cordillera Heritage Site',
      category: 'landmark',
      description: 'The UNESCO-designated cluster of living rice terrace landscapes across the Ifugao highlands — a 2,000-year-old engineering marvel.',
      mustVisit: true,
      entranceFee: 0,
      visitLength: '1 to 2 hrs exploration',
      bestTimeToVisit: 'Morning to early afternoon',
      howToGetThere: 'Signage and heritage markers are scattered throughout the Banaue to Batad area — check at the Tourism Office for current access points.',
      itineraryTip: 'Use this as context for your entire Banaue stay — understanding the cultural and agricultural history deepens the experience of all terrace visits.',
      coordinates: [121.0615, 16.9185],
      travel: { walk: '5 min', tricycle: null, van: null, jeepney: null, ferry: null },
    },
    {
      googleSearchName: 'Batad Saddle Point',
      name: 'Batad Saddle Point',
      category: 'nature',
      description: 'The trailhead saddle where you first see the famous bowl-shaped Batad amphitheater terraces — a memorable first glimpse.',
      mustVisit: true,
      entranceFee: 50,
      visitLength: '30 to 45 min at the saddle',
      bestTimeToVisit: 'Morning for clear sky and best light on the terraces',
      howToGetThere: 'Reached by jeepney from Banaue to Batad Junction, then by habal-habal to the saddle point — total about 1.5 hours from town.',
      itineraryTip: 'Even if you do not continue down to the village, the view from the saddle alone is worth the journey.',
      coordinates: [121.1250, 16.9310],
      travel: { jeepney: '1 hr', walk: null, van: null, tricycle: null, ferry: null },
    },
  ],

  Pangasinan: [
    {
      googleSearchName: 'Patar White Sand Beach',
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
      googleSearchName: 'Death/Depth Pool',
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
      googleSearchName: 'Tondol White Sand Beach',
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
      googleSearchName: 'Masamirey White Sand Beach',
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
      googleSearchName: 'Lucap Wharf',
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
      googleSearchName: 'Bued Mangrove Park',
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
      googleSearchName: 'Camp Puor',
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
      googleSearchName: 'Estanza Beach',
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
  'El Nido': {
    'Big Lagoon':          getImage('El Nido', 'Big Lagoon'),
    'Small Lagoon':        getImage('El Nido', 'Small Lagoon'),
    'Nacpan Beach':        getImage('El Nido', 'Nacpan beach'),
    'Shimizu Island':      getImage('El Nido', 'Big Lagoon to Shimizu Island'),
    '7 Commandos Beach':   getImage('El Nido', 'Seven Commandos Beach'),
    'Cadlao Lagoon':       getImage('El Nido', 'Cadlao Lagoon'),
    'Las Cabanas Beach':   getImage('El Nido', 'Las Cabanas Beach'),
  },
  Siargao: {
    'Naked Island':        getImage('Siargao', 'Naked Island'),
    'Daku Island':         getImage('Siargao', 'Daku Island Beach'),
    'Maasin River':        getImage('Siargao', 'Maasin River'),
    'Pacifico Beach':      getImage('Siargao', 'Pacifico Beach'),
    'Cloud 9 Surf Break':  getImage('Siargao', 'Cloud 9 Surfing Area'),
    'Magpupungko Rock Pools': getImage('Siargao', 'Magpopongko Rock Pools'),
  },
  Bohol: {
    'Philippine Tarsier Sanctuary': getImage('Bohol', 'Philippine Tarsier Sanctuary'),
    'Loboc River Cruise':           getImage('Bohol', 'Loboc River Cruise'),
    'Alona Beach, Panglao':         getImage('Bohol', 'Alona Beach'),
    'Baclayon Church':              getImage('Bohol', 'Baclayon Church'),
    'Hinagdanan Cave':              getImage('Bohol', 'Hinagdanan Cave'),
    'Balicasag Island':             getImage('Bohol', 'Balicasag Island Turtles Point'),
    'Blood Compact Shrine':         getImage('Bohol', 'Blood Compact Shrine'),
    'Man-Made Forest':              getImage('Bohol', 'Bilar Man-Made Forest'),
    'Chocolate Hills':              getImage('Bohol', 'Sikatuna Mirror of The World'),
    'Danao Adventure Park':         getImage('Bohol', 'Loboc Ecotourism Adventure Park'),
  },
  Baguio: {
    'Burnham Park':              getImage('Baguio', 'Burnham Park'),
    'Mines View Park':           getImage('Baguio', 'Mines View Park'),
    'Wright Park':               getImage('Baguio', 'Wright Park'),
    'Baguio Cathedral':          getImage('Baguio', 'Baguio Cathedral'),
    'Camp John Hay':             getImage('Baguio', 'Camp John Hay Park'),
    'Botanical Garden':          getImage('Baguio', 'Baguio Botanical Garden'),
    'BenCab Museum':             getImage('Baguio', 'BenCab Museum'),
    'Bell Church':               getImage('Baguio', 'Bell Church'),
    'Valley of Colors':          getImage('Baguio', 'Valley of Colors'),
    'Tam-Awan Village':          getImage('Baguio', 'Tam-awan Village'),
    'Baguio City Night Market':  getImage('Baguio', 'Baguio Night Market'),
    'Baguio Public Market':      getImage('Baguio', 'Baguio City Market'),
    'The Mansion':               getImage('Baguio', 'The Mansion'),
    'Igorot Stone Kingdom':      getImage('Baguio', 'STOBOSA'),
  },
  Vigan: {
    'Calle Crisologo':               getImage('Vigan', 'Calle Crisologo'),
    'Plaza Salcedo':                 getImage('Vigan', 'Plaza Salcedo'),
    'Bantay Bell Tower':             getImage('Vigan', 'Bantay Watch Tower'),
    'St. Paul Metropolitan Cathedral': getImage('Vigan', 'Metropolitan Cathedral'),
    'Syquia Mansion Museum':         getImage('Vigan', 'Syquia Mansion Museum'),
    'Crisologo Museum':              getImage('Vigan', 'Crisologo Museum'),
  },
  Sagada: {
    'Sumaguing Cave':                    getImage('Sagada', 'Sumaguing Cave'),
    'Hanging Coffins of Echo Valley':    getImage('Sagada', 'Hanging Coffins of Sagada'),
    'Bomod-ok Falls (Big Falls)':        getImage('Sagada', 'Bomod-ok Falls'),
    'Lumiang Cave':                      getImage('Sagada', 'Lumiang Cave'),
    'St. Mary the Virgin Episcopal Church': getImage('Sagada', 'St. Mary Episcopal Church'),
    'Kiltepan Peak':                     getImage('Sagada', 'Kiltepan View'),
    'Marlboro Country':                  getImage('Sagada', 'Marlboro Hill'),
  },
  Banaue: {
    'Banaue Rice Terraces Viewpoint':    getImage('Banaue', 'Banaue Rice Terraces Main Viewdeck'),
    'Batad Rice Terraces':               getImage('Banaue', 'Batad Rice Terraces'),
    'Tappiyah Falls':                    getImage('Banaue', 'Tappiyah Falls'),
    'Banaue Museum':                     getImage('Banaue', 'Banaue Museum'),
    'Hapao Rice Terraces':               getImage('Banaue', 'Hungduan Rice Terraces'),
  },
  Pangasinan: {
    'Hundred Islands National Park':     getImage('Pangasinan', 'Lucap Park - Hundred Islands National Park Gateway'),
    'Quezon Island':                     getImage('Pangasinan', 'Quezon Island Beach'),
    'Bolinao Falls':                     getImage('Pangasinan', 'Bolinao Falls 1'),
    'Enchanted Cave':                    getImage('Pangasinan', 'Enchanted Cave'),
    "Governor's Island":                 getImage('Pangasinan', "Governor's Island"),
    'Cape Bolinao Lighthouse':           getImage('Pangasinan', 'Patar Bolinao Pangasinan'),
    'Patar Beach':                       getImage('Pangasinan', 'Patar White Sand Beach'),
  },
};

// Helper to format a place object as JS
function imgLine(dest, name) {
  const img = (IMG_UPDATES[dest] || {})[name];
  return img ? `      image: '${img}',\n` : `      image: null,\n`;
}

function newPlaceLine(dest, p, idx) {
  const img = getImage(dest, p.googleSearchName);
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
