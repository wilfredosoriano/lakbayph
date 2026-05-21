/**
 * Offline intent parser for LakbayPH assistant.
 *
 * Always returns: { text, action?, needsMore? }
 *   text      — bot reply string
 *   action    — { intent, data } → screen shows confirm/cancel card
 *   needsMore — { context } → screen sets pendingContext, waits for next message
 *
 * lang param: 'en' (default) | 'tl' (Filipino/Tagalog)
 *   • Conversational wrapper text is translated to Tagalog when lang === 'tl'
 *   • Proper nouns, place names, prices, and travel data stay in English
 */

import { getBudgetSummary, getTrips, getPackingItems } from '../database/db';
import { PLACES_BY_DESTINATION } from '../data/placesData';

// ── Helpers ───────────────────────────────────────────────────────────────────

function contains(text, kws) {
  return kws.some(kw => text.includes(kw));
}

function fmt(n) {
  return '₱' + Number(n).toLocaleString();
}

function titleCase(str) {
  return str.trim().replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

const CATEGORY_EMOJI = {
  beach: '🏖️', nature: '🌿', food: '🍜',
  landmark: '🏛️', activity: '🎯', shopping: '🛍️',
};

const MONTH_NAMES = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const MONTH_SHORT  = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

// ── General destination knowledge (for places not in PLACES_BY_DESTINATION) ──

const GENERAL_DEST_INFO = {
  'Baguio': {
    emoji: '🌲',
    tagline: 'City of Pines · Cool Mountain Getaway',
    highlights: [
      { name: 'Burnham Park',               fee: 'Free',         note: 'Rowboat & bike rentals, perfect for morning walks' },
      { name: 'Camp John Hay',              fee: '₱30',          note: 'Pine forest trails, Bell House & food park' },
      { name: 'Mines View Park',            fee: '₱30',          note: 'Panoramic highland views + souvenir stalls' },
      { name: 'BenCab Museum',              fee: '₱120',         note: 'World-class Filipino art in the highlands' },
      { name: 'Tam-awan Village',           fee: '₱50',          note: 'Authentic Cordillera architecture & art studios' },
      { name: 'Baguio Night Market',        fee: 'Free',         note: 'Ukay-ukay, street food & pasalubong · Session Road area' },
      { name: 'Strawberry Farm (La Trinidad)', fee: 'Free',      note: 'Pick-your-own strawberries · 15 min from city' },
    ],
    tip: 'Pack a jacket — nights can drop to 14°C. Best months: November to February.',
    budget: '₱1,500–₱3,000/day covers guesthouse, local food & activities.',
  },
  'Tagaytay': {
    emoji: '🌋',
    tagline: 'Taal Volcano Views & Cool Breeze',
    highlights: [
      { name: 'Taal Volcano Viewpoint',      fee: 'Free',    note: 'The iconic volcano-in-a-lake panorama from the ridge' },
      { name: 'Sky Ranch',                   fee: '₱200+',   note: 'Ferris wheel and rides with a Taal Volcano backdrop' },
      { name: 'Picnic Grove',                fee: '₱50',     note: 'Zipline + open picnic area overlooking Taal Lake' },
      { name: "People's Park in the Sky",    fee: '₱30',     note: 'Highest accessible point in Tagaytay, sweeping views' },
      { name: 'Mahogany Market / Bulalo',    fee: 'Free',    note: 'Tagaytay is the bulalo capital — beef bone marrow soup is a must' },
      { name: 'Puzzle Mansion',              fee: '₱150',    note: 'Quirky museum housing 1,000+ completed puzzles' },
    ],
    tip: 'Go early — Tagaytay gets foggy and crowded by noon. Bulalo lunch is non-negotiable.',
    budget: '₱2,000–₱4,000/day.',
  },
  'Vigan': {
    emoji: '🏛️',
    tagline: 'UNESCO Heritage Colonial City',
    highlights: [
      { name: 'Calle Crisologo',     fee: 'Free',  note: 'Cobblestone street of 16th-century Spanish-era bahay na bato' },
      { name: 'Kalesa Ride',         fee: '₱150',  note: 'Horse-drawn carriage through the heritage zone' },
      { name: 'Plaza Salcedo',       fee: 'Free',  note: 'Beautiful nightly dancing fountain show' },
      { name: 'Pagburnayan Pottery', fee: 'Free',  note: 'Watch traditional Burnay clay pottery made by hand' },
      { name: 'Vigan Cathedral',     fee: 'Free',  note: 'Baroque church dating to the 1600s' },
      { name: 'Crisologo Museum',    fee: '₱50',   note: 'Historic documents and artifacts from Ilocos' },
      { name: 'Vigan Empanada',      fee: '₱25–₱40', note: 'Must-try Ilocano street food · Plaza Burgos stalls' },
    ],
    tip: 'Walk Calle Crisologo at night — candlelit lanterns make it magical with far fewer crowds.',
    budget: '₱1,000–₱2,000/day. Accommodation inside the heritage zone is very affordable.',
  },
  'Boracay': {
    emoji: '🏖️',
    tagline: 'World-Famous White Beach Island',
    highlights: [
      { name: 'White Beach',          fee: 'Free',           note: '4 km of powder-white sand · Station 1 is the most scenic' },
      { name: 'Puka Shell Beach',     fee: 'Free',           note: 'Quieter north end beach, great for morning walks' },
      { name: 'Paraw Sailing',        fee: '₱600–₱800/pax',  note: 'Traditional outrigger sailboat at sunset — unmissable' },
      { name: 'Helmet Diving',        fee: '₱900–₱1,200',    note: 'Walk underwater without any certification needed' },
      { name: "Ariel's Point",        fee: '₱1,800+',        note: 'Cliff diving day trip — all-in with food and boat' },
      { name: "D'Mall",               fee: 'Free',           note: 'Main dining and shopping hub along White Beach' },
    ],
    tip: 'Best weather November to May. Book accommodation 2+ months ahead in peak season (Dec–Apr).',
    budget: '₱3,000–₱8,000/day depending on accommodation choice.',
  },
  'El Nido': {
    emoji: '🏝️',
    tagline: 'Limestone Lagoons & Island Hopping',
    highlights: [
      { name: 'Tour A — Small & Big Lagoons', fee: '₱1,200–₱1,500', note: 'Most iconic — kayaking through karst formations' },
      { name: 'Tour B — Caves & Beaches',     fee: '₱1,200–₱1,500', note: 'Cathedral Cave, Pinagbuyutan Island' },
      { name: 'Tour C — Helicopter Island',   fee: '₱1,200–₱1,500', note: 'Best beaches and snorkeling spots' },
      { name: 'Nacpan Twin Beach',            fee: '₱50',            note: 'Voted top 10 beaches in Asia · less touristy' },
      { name: 'El Nido Night Market',         fee: 'Free',           note: 'Fresh BBQ seafood stalls in the town center' },
    ],
    tip: 'Book island tours the evening before — they fill up fast in December to May.',
    budget: '₱3,500–₱6,000/day for accommodation, tours, and food.',
  },
  'Coron': {
    emoji: '🤿',
    tagline: 'WWII Wrecks, Emerald Lakes & Island Hopping',
    highlights: [
      { name: 'Kayangan Lake',          fee: '₱200',        note: 'Clearest lake in Asia, inside a dramatic karst cove' },
      { name: 'Twin Lagoon',            fee: '₱200',        note: 'Two lagoons connected by swimming under a cliff' },
      { name: 'WWII Wreck Diving',      fee: '₱2,500–₱4,000', note: 'World-class dive sites for certified divers' },
      { name: 'Barracuda Lake',         fee: '₱200',        note: 'Thermocline diving inside a limestone crater lake' },
      { name: 'Maquinit Hot Springs',   fee: '₱200',        note: 'Natural saltwater hot spring near the coast' },
      { name: 'Siete Pecados Marine Park', fee: '₱100',     note: 'Snorkeling coral gardens right in the bay' },
    ],
    tip: 'Coron is best for snorkelers and divers. Always bring reef-safe sunscreen.',
    budget: '₱3,000–₱6,000/day for island hopping tours, accommodation, and food.',
  },
  'Cebu': {
    emoji: '🐋',
    tagline: 'Queen City of the South',
    highlights: [
      { name: "Magellan's Cross",              fee: 'Free',          note: 'Historic 1521 Christian symbol at the city center' },
      { name: 'Whale Shark (Oslob)',            fee: '₱500–₱1,000',  note: 'Swim with butanding — book the earliest morning slot' },
      { name: 'Kawasan Falls Canyoneering',     fee: '₱1,500–₱2,500', note: 'Best adventure activity in Cebu — jump, slide & swim' },
      { name: 'Osmeña Peak',                   fee: '₱30',           note: 'Most dramatic summit view in Cebu · 2 hr hike from Dalaguete' },
      { name: 'Moalboal Sardine Run',           fee: '₱300–₱500',    note: 'Snorkel with millions of sardines just off the shore' },
      { name: 'IT Park Night Food Stalls',      fee: 'Free entry',   note: 'Best street food in Cebu City · open after 6 PM' },
    ],
    tip: 'Base in Cebu City, then do day trips south (Oslob, Kawasan Falls) or north (Malapascua, Bantayan).',
    budget: '₱2,000–₱5,000/day depending on activities and accommodation.',
  },
  'Bohol': {
    emoji: '🦎',
    tagline: 'Chocolate Hills, Tarsiers & Panglao Beaches',
    highlights: [
      { name: 'Chocolate Hills',       fee: '₱50',   note: 'Over 1,200 conical hills turning brown in the dry season' },
      { name: 'Tarsier Sanctuary',     fee: '₱60',   note: "See the world's smallest primate in its natural habitat" },
      { name: 'Alona Beach (Panglao)', fee: 'Free',  note: 'Best diving and snorkeling in Bohol, lively at night' },
      { name: 'Loboc River Cruise',    fee: '₱450',  note: 'Floating lunch restaurant through a jungle river' },
      { name: 'Baclayon Church',       fee: 'Free',  note: 'One of the oldest stone churches in the Philippines' },
      { name: 'Hinagdanan Cave',       fee: '₱30',   note: 'Underground lake inside a magical cave system' },
    ],
    tip: 'Hire a tricycle tour (₱1,200–₱1,500) to cover the Bohol Countryside Circuit in one day.',
    budget: '₱2,000–₱4,500/day for accommodation, food, and tours.',
  },
  'Batanes': {
    emoji: '🌾',
    tagline: 'Northernmost Philippines — Untouched & Windswept',
    highlights: [
      { name: 'Marlboro Hills (Racuh A Payaman)', fee: 'Free',        note: 'Iconic rolling hills with free-roaming cows and ocean views' },
      { name: 'Sabtang Island Tour',              fee: '₱300–₱1,500', note: 'Stone Ivatan villages and wild Pacific coastal cliffs' },
      { name: 'Basco Lighthouse',                 fee: 'Free',        note: 'Colonial lighthouse with 360° panoramic views' },
      { name: 'Valugan Boulder Beach',            fee: 'Free',        note: 'Giant volcanic rock coastline on the Pacific side' },
      { name: 'Chamantad-Tinyan Viewpoint',       fee: 'Free',        note: 'Sheer clifftop with an infinite ocean horizon' },
      { name: 'Ivatan Heritage Houses',           fee: '₱30–₱50',     note: 'Centuries-old limestone and cogon-grass homes still in use' },
    ],
    tip: 'Book flights months in advance — very limited seats from Manila. Best weather: March to June.',
    budget: '₱4,000–₱7,000/day including tours and accommodation.',
  },
  'Davao': {
    emoji: '🦅',
    tagline: 'Mount Apo & Durian Capital of the Philippines',
    highlights: [
      { name: 'Philippine Eagle Center', fee: '₱200',     note: "See the national bird — one of the world's largest eagles" },
      { name: 'Eden Nature Park',        fee: '₱300',     note: 'Highland eco-park with ziplines and a scenic cable car' },
      { name: 'Samal Island',            fee: '₱100 boat', note: 'White sand beaches via a short ferry from the city' },
      { name: 'Malagos Garden Resort',   fee: '₱200',     note: 'Butterfly farm, orchid house & adventure activities' },
      { name: 'Davao Night Market',      fee: 'Free',     note: 'Durian, tuna steak & street food · Roxas Avenue after 8 PM' },
      { name: 'Crocodile Park',          fee: '₱200',     note: 'Wildlife encounters and zipline on the outskirts of the city' },
    ],
    tip: "Davao City is one of the safest cities in the Philippines. Don't leave without trying durian.",
    budget: '₱1,500–₱3,000/day. Davao is very affordable for food and transport.',
  },
  'Batangas': {
    emoji: '🌊',
    tagline: 'Taal Volcano, Beaches & World-Class Diving',
    highlights: [
      { name: 'Taal Volcano Trek',    fee: '₱300–₱500',     note: 'Hike the active crater — check PHIVOLCS advisories first' },
      { name: 'Anilao Diving',        fee: '₱800–₱1,500',   note: 'Globally ranked macro diving and coral gardens' },
      { name: 'Matabungkay Beach',    fee: '₱50–₱100',      note: 'Calm white sand beach perfect for families and swimming' },
      { name: 'Fortune Island',       fee: '₱200 + boat',   note: 'Remote island with dramatic cliffs and Greek-style ruins' },
      { name: 'Caleruega Chapel',     fee: '₱50',           note: 'Gorgeous hilltop garden chapel in Nasugbu' },
      { name: 'Batangas Lomi',        fee: '₱80–₱150',      note: 'A thick local noodle soup you absolutely cannot skip' },
    ],
    tip: 'Anilao diving is best on weekdays — weekend boats get crowded. Taal is active, check alerts first.',
    budget: '₱2,000–₱4,000/day depending on activities.',
  },
  'Ilocos Norte': {
    emoji: '💨',
    tagline: 'Bangui Windmills, Beaches & Ilocano Heritage',
    highlights: [
      { name: 'Bangui Windmills',        fee: 'Free',     note: 'Row of giant wind turbines along the northwestern coast' },
      { name: 'Pagudpud Blue Lagoon',    fee: '₱30',      note: 'Turquoise beach with calm clear water for swimming' },
      { name: 'Paoay Church',            fee: 'Free',     note: 'UNESCO baroque church with massive earthquake buttresses' },
      { name: 'Kabigan Falls',           fee: '₱50',      note: 'Waterfall hike near Pagudpud · 1 hr trek each way' },
      { name: 'Laoag Sand Dunes',        fee: '₱600–₱900', note: '4x4 dune bashing and sandboarding adventure' },
      { name: 'Malacañang of the North', fee: '₱30',      note: 'Marcos museum on the peaceful shores of Paoay Lake' },
    ],
    tip: 'Pair Ilocos Norte with Vigan (Ilocos Sur) for a full Ilocandia road trip.',
    budget: '₱1,500–₱3,000/day. Accommodation in Laoag is very affordable.',
  },
  'Pangasinan': {
    emoji: '🏝️',
    tagline: 'Hundred Islands & Wild Beaches',
    highlights: [
      { name: 'Hundred Islands National Park', fee: '₱50 + boat', note: '123 islands to explore — kayak between them freely' },
      { name: 'Bolinao Falls',           fee: '₱40',   note: 'Multi-tiered waterfall system with natural pools' },
      { name: 'Cape Bolinao Lighthouse', fee: '₱30',   note: 'Historic lighthouse with sweeping ocean views' },
      { name: 'Patar Beach',             fee: 'Free',  note: 'Wild orange-tinged sand beach at the tip of Bolinao' },
      { name: 'Enchanted Cave',          fee: '₱150',  note: 'Underground cave with a crystal-clear natural pool inside' },
    ],
    tip: 'Visit Hundred Islands on a weekday to avoid weekend crowds. Bring your own snorkeling gear.',
    budget: '₱1,500–₱2,500/day.',
  },
  'Bukidnon': {
    emoji: '🌿',
    tagline: 'Highland Farms, Ziplines & Cool Mountain Air',
    highlights: [
      { name: 'Dahilayan Adventure Park',      fee: '₱200–₱400', note: "Asia's longest dual zipline at 4,400 ft elevation" },
      { name: 'Monastery of Transfiguration',  fee: 'Free',      note: 'Serene Benedictine monastery on a scenic hilltop' },
      { name: 'Del Monte Pineapple Plantation',fee: 'Free',      note: "World's largest pineapple plantation — open for visits" },
      { name: 'White Water Rafting (Valencia)', fee: '₱800–₱1,500', note: 'River rafting through highland gorges' },
      { name: 'Kaamulan Festival (March)',     fee: 'Free',      note: 'Largest tribal festival in Mindanao' },
    ],
    tip: 'Bukidnon is cooler than Davao. Best enjoyed October to February.',
    budget: '₱1,500–₱3,000/day.',
  },
  'Palawan': {
    emoji: '🌴',
    tagline: 'Island Paradise of the Philippines',
    highlights: [
      { name: 'Puerto Princesa Underground River', fee: '₱735',           note: 'UNESCO World Heritage · one of the New 7 Wonders of Nature' },
      { name: 'El Nido Island Hopping',            fee: '₱1,200–₱1,500',  note: 'Tour A (lagoons) is the most iconic experience' },
      { name: 'Coron Lakes & WWII Wrecks',         fee: '₱1,200–₱1,800',  note: 'Kayangan Lake and world-famous dive sites' },
      { name: 'Nagtabon Beach',                    fee: 'Free',            note: 'Wild undeveloped white sand beach near Puerto Princesa' },
      { name: 'Honda Bay Island Hopping',          fee: '₱500–₱800',       note: 'Closest island hop from Puerto Princesa City' },
    ],
    tip: 'Palawan is huge — Puerto Princesa, El Nido, and Coron are separate trips each needing 2–4 days.',
    budget: '₱3,000–₱7,000/day depending on which part of Palawan you visit.',
  },
  'Metro Manila': {
    emoji: '🏙️',
    tagline: 'The Capital — Culture, Food & History',
    highlights: [
      { name: 'Intramuros',           fee: '₱75',    note: 'Walled city from the Spanish era · Fort Santiago & Manila Cathedral' },
      { name: 'Rizal Park (Luneta)',  fee: 'Free',   note: 'Historic park with the monument of our national hero' },
      { name: 'BGC Art in the City',  fee: 'Free',   note: 'Street art, upscale restaurants & rooftop bars in Bonifacio Global City' },
      { name: 'Divisoria Market',     fee: 'Free',   note: 'Budget shopping heaven — clothes, accessories, pasalubong' },
      { name: 'Binondo Food Tour',    fee: '₱500+',  note: "World's oldest Chinatown · siopao, hopia, and xiao long bao" },
      { name: 'National Museum',      fee: 'Free',   note: 'Philippine history, art, and natural science · free admission' },
    ],
    tip: 'Manila traffic is heavy 7–9 AM and 5–8 PM. Use the MRT or ride-hailing apps to save time.',
    budget: '₱1,500–₱4,000/day depending on accommodation area.',
  },
  'Laguna': {
    emoji: '♨️',
    tagline: 'Hot Springs, Waterfalls & Nature Retreats',
    highlights: [
      { name: 'Pagsanjan Falls',         fee: '₱1,050 boat', note: 'Iconic rapids boat ride to a jungle waterfall' },
      { name: 'Hidden Valley Springs',   fee: '₱1,800+',     note: 'Natural hot spring resort inside a volcanic crater' },
      { name: 'Pansol Hot Springs',      fee: '₱300–₱600',   note: 'Affordable private pool resorts with hot spring water' },
      { name: 'Mount Banahaw',           fee: '₱50',         note: 'Sacred mountain trek — open seasons only, permit required' },
      { name: 'Laguna de Bay Lakeshore', fee: 'Free',        note: 'Peaceful lake view in Los Baños or Paete' },
      { name: 'Buko Pie (Los Baños)',    fee: '₱60–₱150',    note: "Laguna's most famous pasalubong — buy from roadside stalls" },
    ],
    tip: 'Pansol hot spring resorts are day-trip friendly from Manila (1.5 hrs south of the city).',
    budget: '₱1,500–₱3,000/day.',
  },
};

// ── Best time / weather per destination ───────────────────────────────────────

const BEST_TIME = {
  'Baguio':          { best: 'November to February', avoid: 'June–October (heavy rain & fog)', note: 'Cool and dry; strawberry season peaks Dec–Feb.' },
  'Tagaytay':        { best: 'December to February', avoid: 'June–August (foggy, rainy)', note: 'Coolest and clearest for Taal Volcano views.' },
  'Vigan':           { best: 'October to May',       avoid: 'June–September (typhoon season)', note: 'Dry and comfortable for walking the heritage streets.' },
  'Boracay':         { best: 'November to May',      avoid: 'June–October (rough waves, amihan)', note: 'Flat calm seas and sunny White Beach.' },
  'El Nido':         { best: 'November to May',      avoid: 'June–October (rough seas, tours may cancel)', note: 'Calm lagoons and clear water for island hopping.' },
  'Coron':           { best: 'October to May',       avoid: 'June–September (typhoon risk)', note: 'Crystal visibility for diving, lakes, and snorkeling.' },
  'Cebu':            { best: 'January to May',       avoid: 'July–October (typhoon season)', note: 'Hottest and driest; whale sharks in Oslob run year-round.' },
  'Bohol':           { best: 'January to May',       avoid: 'June–October (typhoon season)', note: 'Dry season is perfect for countryside tours and beach days.' },
  'Batanes':         { best: 'March to June',        avoid: 'July–November (strongest typhoons in PH)', note: 'Calmest seas for the Sabtang ferry and clearest skies for photos.' },
  'Davao':           { best: 'Year-round',           avoid: 'None (outside the typhoon belt)', note: "One of the most typhoon-free areas in the Philippines — always a safe bet." },
  'Batangas':        { best: 'November to May',      avoid: 'June–October (rainy, Taal may be restricted)', note: 'Clear water for Anilao diving and good conditions for Fortune Island.' },
  'Ilocos Norte':    { best: 'November to April',    avoid: 'May–October (hot and rainy)', note: 'Dry season for Pagudpud beaches and the Bangui Windmills drive.' },
  'Pangasinan':      { best: 'October to May',       avoid: 'June–September (rain)', note: 'Dry season for Hundred Islands boat tours and Bolinao.' },
  'Siargao':         { best: 'September to November', avoid: 'Jan–Feb (Sugba Lagoon closed for rehab)', note: 'Peak surf season — Cloud 9 waves are at their best in October.' },
  'Palawan':         { best: 'November to May',      avoid: 'June–October (rough seas, tours may cancel)', note: 'Calm waters for El Nido tours and the underground river.' },
  'Bukidnon':        { best: 'October to February',  avoid: 'March–May (very hot)', note: 'Cool highland air and the most lush green landscapes.' },
  'Puerto Princesa': { best: 'November to May',      avoid: 'June–October (underground river may close in rough weather)', note: 'Dry season ensures all boat tours and permits are available.' },
  'Camiguin':        { best: 'March to May',         avoid: 'November–January (rough seas for White Island)', note: 'Best conditions for the White Island sandbar and snorkeling.' },
  'Sagada':          { best: 'November to February', avoid: 'June–September (misty, cave entrances may flood)', note: 'Clear skies for the hanging coffins walk and cave connections.' },
  'Banaue':          { best: 'March to May, Sep–Nov', avoid: 'December–February (foggy viewpoints)', note: 'Greenest terraces in March–May; harvest season in Sep–Nov.' },
  'Laguna':          { best: 'October to May',       avoid: 'June–September (heavy rain; Pagsanjan boat rides can be rough)', note: 'Hot spring resorts are great any time but most pleasant Nov–Feb.' },
  'Metro Manila':    { best: 'November to February', avoid: 'March–May (extreme heat up to 38°C)', note: 'Coolest and most comfortable for walking Intramuros and sightseeing.' },
};

// ── Vibe-based destination suggestions ───────────────────────────────────────

const VIBE_SUGGESTIONS = [
  {
    vibes: ['cold', 'cool', 'cool place', 'malamig', 'cool weather', 'mountain', 'highlands', 'bundok'],
    label: 'cool/cold mountain destinations',
    places: [
      { name: 'Baguio',    note: 'City of Pines · avg 17°C · 6 hrs from Manila' },
      { name: 'Sagada',    note: 'Misty mountain town · caves & hanging coffins · 4 hrs from Baguio' },
      { name: 'Batanes',   note: 'Windswept northernmost tip · rolling hills · flight from Manila' },
      { name: 'Bukidnon',  note: 'Highland farms & ziplines · cool air year-round' },
      { name: 'Tagaytay',  note: 'Taal views & cool breeze · 2 hrs from Manila' },
    ],
  },
  {
    vibes: ['beach', 'island', 'swimming', 'sun', 'white sand', 'mga beach', 'beach trip', 'island hopping'],
    label: 'top beach & island destinations',
    places: [
      { name: 'Boracay',   note: 'World-famous White Beach · calm Nov–May' },
      { name: 'El Nido',   note: 'Limestone lagoons & island hopping · Palawan' },
      { name: 'Siargao',   note: 'Surfer island + Sugba Lagoon · best Sep–Nov' },
      { name: 'Coron',     note: 'Emerald lakes & WWII wrecks · Palawan' },
      { name: 'Bohol',     note: 'Alona Beach diving + Chocolate Hills · Visayas' },
    ],
  },
  {
    vibes: ['adventure', 'hiking', 'extreme', 'thrilling', 'adrenaline', 'pababa', 'spelunking', 'cliff', 'trek'],
    label: 'best adventure destinations',
    places: [
      { name: 'Sagada',    note: 'Cave spelunking, cliff jumping & hanging coffins trek' },
      { name: 'Batanes',   note: 'Raw coastal cliffs, rolling hills & isolated island hikes' },
      { name: 'Siargao',   note: "Surfing, cliff jumping at Ariel's Point, island hopping" },
      { name: 'Batangas',  note: 'Anilao diving, Taal volcano trek & Fortune Island' },
      { name: 'Banaue',    note: 'Batad rice terrace trek to Tappiya Falls' },
    ],
  },
  {
    vibes: ['budget', 'cheap', 'affordable', 'mura', 'tipid', 'low budget', 'sulit'],
    label: 'budget-friendly destinations',
    places: [
      { name: 'Vigan',       note: 'Free to walk, guesthouses ₱500/night · 8 hrs from Manila' },
      { name: 'Pangasinan',  note: 'Hundred Islands day trip · ~₱1,500/day all-in' },
      { name: 'Ilocos Norte', note: 'Bangui + Pagudpud · ~₱2,000/day' },
      { name: 'Batangas',    note: 'Beach resorts 3 hrs from Manila · ₱1,500–₱2,000/day' },
      { name: 'Baguio',      note: 'Affordable guesthouses + free parks · ₱1,500/day' },
    ],
  },
  {
    vibes: ['near manila', 'malapit manila', 'short trip', 'weekend trip', 'day trip', 'nearby', 'pababa sa manila', 'weekend getaway'],
    label: 'weekend trips from Manila',
    places: [
      { name: 'Tagaytay',   note: '2 hrs south · Taal views & bulalo' },
      { name: 'Batangas',   note: '3 hrs south · beaches & diving' },
      { name: 'Laguna',     note: '1.5 hrs south · hot springs & Pagsanjan Falls' },
      { name: 'Zambales',   note: '3 hrs north · Nagsasa Cove & white sand' },
      { name: 'Pangasinan', note: '5 hrs north · Hundred Islands' },
    ],
  },
  {
    vibes: ['diving', 'snorkeling', 'snorkel', 'underwater', 'fish', 'coral', 'scuba', 'whale shark'],
    label: 'top dive & snorkel spots',
    places: [
      { name: 'Coron',     note: 'WWII wreck dives + Kayangan Lake · Palawan' },
      { name: 'Bohol',     note: 'Alona Beach · colorful reefs & whale sharks nearby' },
      { name: 'Cebu',      note: 'Moalboal sardines + Oslob whale sharks' },
      { name: 'Batangas',  note: 'Anilao · globally ranked macro diving' },
      { name: 'Siargao',   note: 'Sugba Lagoon + STFD dive sites' },
    ],
  },
  {
    vibes: ['culture', 'heritage', 'history', 'kasaysayan', 'simbahan', 'church', 'colonial', 'museo', 'museum'],
    label: 'cultural & heritage destinations',
    places: [
      { name: 'Vigan',        note: 'UNESCO heritage colonial city · cobblestone streets' },
      { name: 'Metro Manila', note: 'Intramuros · National Museum · Binondo Chinatown' },
      { name: 'Bohol',        note: 'Baclayon Church + Chocolate Hills + Tarsier' },
      { name: 'Batanes',      note: 'Ivatan stone houses · oldest surviving architecture in PH' },
      { name: 'Banaue',       note: '2,000-year-old rice terraces · living UNESCO heritage' },
    ],
  },
  {
    vibes: ['family', 'kids', 'pamilya', 'mga bata', 'children', 'family trip', 'for kids'],
    label: 'family-friendly destinations',
    places: [
      { name: 'Tagaytay',  note: 'Sky Ranch rides + Taal views · 2 hrs from Manila' },
      { name: 'Bohol',     note: 'Tarsiers + Chocolate Hills + calm Alona Beach' },
      { name: 'Boracay',   note: 'Calm waters at Station 1 · White Beach perfect for kids' },
      { name: 'Davao',     note: 'Philippine Eagle Center + Eden Nature Park + Crocodile Park' },
      { name: 'Batangas',  note: 'Matabungkay calm beach · perfect for first-time swimmers' },
    ],
  },
  {
    vibes: ['romantic', 'honeymoon', 'date', 'couple', 'anniversary', 'magkasamang'],
    label: 'romantic getaways',
    places: [
      { name: 'Batanes',   note: 'Most dramatic & intimate in PH · rolling hills & cliffs' },
      { name: 'El Nido',   note: 'Sunset lagoon kayaking · dramatic limestone backdrop' },
      { name: 'Siargao',   note: 'Laid-back island vibes · stunning sunsets' },
      { name: 'Baguio',    note: 'Cool evenings, pine trees & cozy cafes' },
      { name: 'Vigan',     note: 'Kalesa rides at night through candlelit heritage streets' },
    ],
  },
  {
    vibes: ['nature', 'waterfall', 'falls', 'forest', 'river', 'lake', 'green', 'trees', 'talon'],
    label: 'nature & waterfalls',
    places: [
      { name: 'Iligan',    note: 'Tinago Falls — 240 steps to a hidden paradise' },
      { name: 'Laguna',    note: 'Pagsanjan Falls boat ride + Pansol hot springs' },
      { name: 'Camiguin',  note: 'Katibawasan Falls + Sunken Cemetery + hot springs' },
      { name: 'Batangas',  note: 'Anilao reefs + lush Caleruega chapel grounds' },
      { name: 'Banaue',    note: 'Tappiya Falls after the Batad rice terrace trek' },
    ],
  },
];

// ── Parse trip start date from stored dates string ────────────────────────────

function parseTripDateStr(datesStr) {
  if (!datesStr) return null;
  // Skip "X days" format — no real date
  if (/^\d+\s*days?$/i.test(datesStr.trim())) return null;
  const normalized = datesStr.replace(/\s+[–-]\s+.*$/, '');
  const yearMatch  = datesStr.match(/(\d{4})/);
  const full       = `${normalized}, ${yearMatch?.[1] ?? ''}`;
  const match      = full.match(/([a-z]+)\s+(\d+),?\s*(\d{4})/i);
  if (match) {
    const monthMap = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
    const mKey     = match[1].toLowerCase().slice(0, 3);
    const month    = monthMap[mKey];
    const day      = parseInt(match[2], 10);
    const year     = parseInt(match[3], 10);
    if (month !== undefined && day && year) return new Date(year, month, day);
  }
  return null;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function parseDateInput(text) {
  const t = text.toLowerCase().trim();
  if (/tomorrow|bukas/.test(t)) {
    const d = new Date(); d.setDate(d.getDate() + 1); return d;
  }
  const weekdays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const nextDay = weekdays.findIndex(w => t.includes(w));
  if (t.includes('next') && nextDay !== -1) {
    const d = new Date();
    const diff = (nextDay + 7 - d.getDay()) % 7 || 7;
    d.setDate(d.getDate() + diff); return d;
  }
  const inWeeks = t.match(/in\s+(\d+)\s+week/);
  if (inWeeks) { const d = new Date(); d.setDate(d.getDate() + parseInt(inWeeks[1]) * 7); return d; }
  const inMonths = t.match(/in\s+(\d+)\s+month/);
  if (inMonths) { const d = new Date(); d.setMonth(d.getMonth() + parseInt(inMonths[1])); return d; }
  const inDays = t.match(/in\s+(\d+)\s+day/);
  if (inDays) { const d = new Date(); d.setDate(d.getDate() + parseInt(inDays[1])); return d; }
  const monthDayYear = t.match(/([a-z]+)\s+(\d{1,2})[,\s]+(\d{4})/);
  if (monthDayYear) {
    const mIdx = MONTH_NAMES.indexOf(monthDayYear[1]) !== -1
      ? MONTH_NAMES.indexOf(monthDayYear[1])
      : MONTH_SHORT.indexOf(monthDayYear[1].slice(0, 3));
    if (mIdx !== -1) return new Date(parseInt(monthDayYear[3]), mIdx, parseInt(monthDayYear[2]));
  }
  const monthDay = t.match(/([a-z]+)\s+(\d{1,2})$/);
  if (monthDay) {
    const mIdx = MONTH_NAMES.indexOf(monthDay[1]) !== -1
      ? MONTH_NAMES.indexOf(monthDay[1])
      : MONTH_SHORT.indexOf(monthDay[1].slice(0, 3));
    if (mIdx !== -1) {
      const now = new Date();
      const candidate = new Date(now.getFullYear(), mIdx, parseInt(monthDay[2]));
      if (candidate < now) candidate.setFullYear(now.getFullYear() + 1);
      return candidate;
    }
  }
  const iso = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]));
  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) return parsed;
  return null;
}

function tripDates(startDate, days) {
  const start = startDate ? new Date(startDate) : new Date();
  const end   = new Date(start);
  end.setDate(start.getDate() + days - 1);
  const o     = { month: 'short', day: 'numeric' };
  const oYear = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${start.toLocaleDateString('en-PH', o)} – ${end.toLocaleDateString('en-PH', oYear)}`;
}

// ── Entity extractors ─────────────────────────────────────────────────────────

function extractAmount(text) {
  const c = text.replace(/,/g, '');
  let m;
  m = c.match(/₱\s*(\d+(?:\.\d{1,2})?)/i);                if (m) return parseFloat(m[1]);
  m = c.match(/(\d+(?:\.\d{1,2})?)\s*(?:piso|peso|php)/i); if (m) return parseFloat(m[1]);
  m = c.match(/(?:spend|spent|paid|pay|bought|add|log)\s+(\d+(?:\.\d{1,2})?)/i); if (m) return parseFloat(m[1]);
  m = c.match(/(\d+(?:\.\d{1,2})?)\s+(?:for|in|on|sa)\s/i); if (m) return parseFloat(m[1]);
  const nums = c.match(/\b(\d{2,6})\b/g);
  if (nums) return parseFloat(nums[0]);
  return null;
}

function extractCategory(text) {
  const t = text.toLowerCase();
  if (/food|eat|lunch|dinner|breakfast|meal|snack|kain|restaurant|pagkain|jollibee|mcdonald|fastfood/.test(t)) return 'Food';
  if (/transport|fare|jeepney|tricycle|bus|van|ride|ferry|habal|taxi|grab|commute|byahe/.test(t)) return 'Transport';
  if (/hotel|hostel|stay|lodging|airbnb|room|accommodation|inn|pension|tulog/.test(t)) return 'Accommodation';
  if (/activit|tour|entrance|ticket|island|snorkel|dive|hike|park|museum|attraction/.test(t)) return 'Activities';
  if (/other|misc|pasalubong|shopping|souvenir/.test(t)) return 'Others';
  return null;
}

function extractDestination(text) {
  const patterns = [
    /trip\s+to\s+([a-z][a-z\s]+?)(?:\s+for|\s+\d+\s*day|\s*$)/i,
    /(?:create|plan|new)\s+.*?trip\s+to\s+([a-z][a-z\s]+?)(?:\s+for|\s+\d+\s*day|\s*$)/i,
    /going\s+to\s+([a-z][a-z\s]+?)(?:\s+for|\s+\d+\s*day|\s*$)/i,
    /(?:create|plan)\s+a?\s*trip\s+(?:for\s+)?([a-z][a-z\s]+?)(?:\s+for|\s+\d+\s*day|\s*$)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1].trim().length > 1) return m[1].trim();
  }
  return null;
}

function extractDays(text) {
  let m = text.match(/(\d+)\s*(?:day|araw)/i); if (m) return parseInt(m[1]);
  m = text.match(/(\d+)\s*night/i);            if (m) return parseInt(m[1]);
  m = text.match(/^\s*(\d{1,2})\s*$/);         if (m) return parseInt(m[1]);
  return null;
}

function extractPackingItem(text) {
  const t = text.toLowerCase();
  let m = t.match(/add\s+(.+?)\s+(?:to|sa)\s+(?:my\s+)?(?:packing|pack|list|bag)/);
  if (m) return titleCase(m[1].trim());
  m = t.match(/(?:pack|bring|dalhin|isama)\s+(.+?)(?:\s+to|\s+for|\s*$)/);
  if (m) return titleCase(m[1].trim());
  m = t.match(/packing(?:\s+list)?[:\-]\s*(.+)/);
  if (m) return titleCase(m[1].trim());
  return null;
}

function findTripByName(trips, query) {
  const q = query.toLowerCase();
  return trips.find(t =>
    t.name.toLowerCase().includes(q) || t.destination.toLowerCase().includes(q)
  ) || null;
}

// ── Destination key mapping ────────────────────────────────────────────────────

const DEST_KEYS = {
  // Luzon — North
  baguio: 'Baguio', benguet: 'Baguio', 'la trinidad': 'Baguio', 'city of pines': 'Baguio',
  vigan: 'Vigan', 'ilocos sur': 'Vigan', 'calle crisologo': 'Vigan',
  pangasinan: 'Pangasinan', bolinao: 'Pangasinan', alaminos: 'Pangasinan',
  'hundred islands': 'Pangasinan', lingayen: 'Pangasinan', dagupan: 'Pangasinan',
  batanes: 'Batanes', batan: 'Batanes', sabtang: 'Batanes', basco: 'Batanes',
  'ilocos norte': 'Ilocos Norte', laoag: 'Ilocos Norte', paoay: 'Ilocos Norte',
  pagudpud: 'Ilocos Norte', bangui: 'Ilocos Norte',
  laguna: 'Laguna', pagsanjan: 'Laguna', 'los baños': 'Laguna', 'los banos': 'Laguna',
  batangas: 'Batangas', anilao: 'Batangas', nasugbu: 'Batangas', matabungkay: 'Batangas',
  tagaytay: 'Tagaytay', taal: 'Tagaytay', 'taal lake': 'Tagaytay',
  manila: 'Metro Manila', 'metro manila': 'Metro Manila', intramuros: 'Metro Manila',
  makati: 'Metro Manila', bgc: 'Metro Manila', 'bonifacio global city': 'Metro Manila',
  // Cordillera / Mountain Province
  banaue: 'Banaue', batad: 'Banaue', ifugao: 'Banaue',
  sagada: 'Sagada', 'mountain province': 'Sagada',
  // Luzon — East/West
  zambales: 'Zambales', nagsasa: 'Zambales', pundaquit: 'Zambales',
  rizal: 'Rizal', masungi: 'Rizal', daraitan: 'Rizal', tanay: 'Rizal',
  cagayan: 'Cagayan', palaui: 'Cagayan', tuguegarao: 'Cagayan',
  quezon: 'Quezon', cagbalete: 'Quezon', mauban: 'Quezon',
  abra: 'Abra', kaparkan: 'Abra',
  // Visayas
  bohol: 'Bohol', panglao: 'Bohol', tagbilaran: 'Bohol', 'chocolate hills': 'Bohol',
  cebu: 'Cebu', oslob: 'Cebu', kawasan: 'Cebu', moalboal: 'Cebu',
  boracay: 'Boracay', aklan: 'Boracay', 'white beach': 'Boracay', kalibo: 'Boracay',
  iloilo: 'Iloilo', gigantes: 'Iloilo', carles: 'Iloilo',
  guimaras: 'Guimaras',
  leyte: 'Leyte', kalanggaman: 'Leyte', palompon: 'Leyte',
  siquijor: 'Siquijor', cambugahay: 'Siquijor', salagdoong: 'Siquijor',
  siargao: 'Siargao', 'general luna': 'Siargao', 'cloud 9': 'Siargao', 'del carmen': 'Siargao',
  camiguin: 'Camiguin', mambajao: 'Camiguin', 'white island': 'Camiguin',
  'western samar': 'Western Samar', langun: 'Western Samar', calbiga: 'Western Samar',
  // Mindanao
  davao: 'Davao', samal: 'Davao', 'mount apo': 'Davao',
  iligan: 'Iligan', tinago: 'Iligan',
  bukidnon: 'Bukidnon', malaybalay: 'Bukidnon', dahilayan: 'Bukidnon',
  'surigao del sur': 'Surigao del Sur', hinatuan: 'Surigao del Sur',
  'surigao del norte': 'Surigao del Norte', sohoton: 'Surigao del Norte',
  cotabato: 'North Cotabato', 'asik asik': 'North Cotabato',
  'davao oriental': 'Davao Oriental', aliwagwag: 'Davao Oriental',
  // Palawan
  'puerto princesa': 'Puerto Princesa', 'underground river': 'Puerto Princesa',
  nagtabon: 'Puerto Princesa',
  'el nido': 'El Nido', elnido: 'El Nido', nacpan: 'El Nido', bacuit: 'El Nido',
  coron: 'Coron', busuanga: 'Coron', kayangan: 'Coron',
  palawan: 'Palawan',
};

function findDestKey(text) {
  // Longest match wins — sort by key length descending so 'el nido' beats 'nido'
  const sorted = Object.entries(DEST_KEYS).sort((a, b) => b[0].length - a[0].length);
  for (const [kw, key] of sorted) {
    if (text.includes(kw)) return key;
  }
  return null;
}

// ── Read-only handlers ────────────────────────────────────────────────────────

async function showBudget(lang = 'en') {
  const TL = lang === 'tl';
  const s = await getBudgetSummary('1');
  const pct = s.total > 0 ? Math.round((s.spent / s.total) * 100) : 0;
  const lines = [
    TL ? `Narito ang buod ng iyong budget:\n` : `Here's your budget summary:\n`,
    `💰 ${TL ? 'Kabuuan' : 'Total'}:     ${fmt(s.total)}`,
    `💸 ${TL ? 'Nagastos' : 'Spent'}:     ${fmt(s.spent)} (${pct}%)`,
    `✅ ${TL ? 'Natitira' : 'Remaining'}: ${fmt(s.remaining)}`,
  ];
  if (s.breakdown.length > 0) {
    lines.push(TL ? '\nAyon sa kategorya:' : '\nBy category:');
    s.breakdown.sort((a, b) => b.amount - a.amount).slice(0, 3)
      .forEach(b => lines.push(`• ${b.category}: ${fmt(b.amount)} (${b.percentage}%)`));
  }
  if (pct >= 90)      lines.push(TL ? '\n⚠️ Halos puno na ang budget! Magtipid na.' : '\n⚠️ Almost at the limit! Stick to essentials.');
  else if (pct >= 70) lines.push(TL ? '\n📌 Malapit na maubos. Unahin ang mga importanteng gastos.' : '\n📌 Getting tight. Prioritize your must-dos.');
  else if (pct < 30)  lines.push(TL ? '\n😊 Maganda ang pag-gastos mo! I-log ang bawat gastos para accurate.' : '\n😊 Great pacing! Log every expense to stay accurate.');
  return lines.join('\n');
}

async function showTrips(lang = 'en') {
  const TL = lang === 'tl';
  const trips = await getTrips();
  if (!trips || trips.length === 0) {
    return TL
      ? `Wala ka pa ring trips!\n\nSubukan: "Mag-plan ng trip sa Baguio para sa 3 araw"`
      : `You don't have any trips yet!\n\nTry: "Plan a trip to Baguio for 3 days"`;
  }
  const list = trips.map(t =>
    `${t.emoji || '✈️'} ${t.name}\n   📍 ${t.destination} · ${t.days} ${TL ? 'araw' : `day${t.days !== 1 ? 's' : ''}`}`
  ).join('\n\n');
  return TL
    ? `Ang iyong mga trips (${trips.length}):\n\n${list}\n\nTanungin mo ako tungkol sa kahit alin — budget, listahan ng dala, o kung ano ang gagawin doon.`
    : `Your trips (${trips.length}):\n\n${list}\n\nAsk me about any of them — budget, packing list, or what to do there.`;
}

async function showPackingList(tripName, trips, lang = 'en') {
  const TL = lang === 'tl';
  const trip = tripName ? findTripByName(trips, tripName) : trips[0];
  if (!trip) return TL
    ? `Hindi ko makita ang trip na iyon. Subukan ang "Ipakita ang aking mga trips" para makita ang listahan.`
    : `I couldn't find that trip. Try "Show my trips" to see what you have.`;
  const items = await getPackingItems(trip.id);
  if (!items || items.length === 0) {
    return TL
      ? `Wala pa ring gamit na naka-lista para sa "${trip.name}".\n\nSubukan: "Dagdag sunscreen sa listahan ng dala para sa ${trip.name}"`
      : `No packing items yet for "${trip.name}".\n\nTry: "Add sunscreen to packing list for ${trip.name}"`;
  }
  const packed   = items.filter(i => i.checked);
  const unpacked = items.filter(i => !i.checked);
  const lines = [TL ? `🎒 Listahan ng dala para sa "${trip.name}":\n` : `🎒 Packing list for "${trip.name}":\n`];
  if (unpacked.length) {
    lines.push(TL ? 'Kailangan pa dalhin:' : 'Still needed:');
    unpacked.forEach(i => lines.push(`  ☐ ${i.item}`));
  }
  if (packed.length) {
    lines.push(TL ? `\nNakalagay na (${packed.length}/${items.length}):` : `\nPacked (${packed.length}/${items.length}):`);
    packed.forEach(i => lines.push(`  ✓ ${i.item}`));
  }
  return lines.join('\n');
}

function showPlacesInDestination(destKey, opts = {}, lang = 'en') {
  const TL = lang === 'tl';

  // ── Try app-curated places first ──────────────────────────────────────────
  const places = PLACES_BY_DESTINATION[destKey];
  if (places && places.length > 0) {
    const filtered = opts.mustVisit ? places.filter(p => p.mustVisit) : places;
    const shown    = filtered.slice(0, 7);
    const header   = opts.mustVisit
      ? (TL ? `⭐ Mga dapat bisitahin sa ${destKey}:\n` : `⭐ Must-visit in ${destKey}:\n`)
      : (TL ? `📍 Mga lugar sa ${destKey} (${filtered.length} total):\n` : `📍 Places to visit in ${destKey} (${filtered.length} total):\n`);
    const lines = [header];
    shown.forEach(p => {
      const fee  = p.entranceFee > 0 ? ` · ₱${p.entranceFee}` : (TL ? ' · Libre' : ' · Free entry');
      const star = p.mustVisit ? ' ⭐' : '';
      lines.push(`${CATEGORY_EMOJI[p.category] || '📍'} ${p.name}${fee}${star}`);
      if (p.itineraryTip) lines.push(`   💡 ${p.itineraryTip.slice(0, 90)}${p.itineraryTip.length > 90 ? '…' : ''}`);
    });
    if (filtered.length > 7) lines.push(TL
      ? `\n...at ${filtered.length - 7} pa sa Discover tab`
      : `\n...and ${filtered.length - 7} more in the Discover tab`);
    lines.push(TL
      ? '\nBuksan ang Discover tab para sa mga larawan, direksyon, at tips.'
      : '\nOpen the Discover tab for photos, directions, and itinerary tips.');
    return lines.join('\n');
  }

  // ── Fall back to general knowledge base ───────────────────────────────────
  const info = GENERAL_DEST_INFO[destKey];
  if (!info) return null;

  const shown = opts.mustVisit ? info.highlights.slice(0, 5) : info.highlights;
  const lines = [
    TL ? `${info.emoji} Mga gagawin sa ${destKey}` : `${info.emoji} What to do in ${destKey}`,
    `${info.tagline}\n`,
  ];

  shown.forEach(h => {
    lines.push(`• ${h.name} · ${h.fee}`);
    lines.push(`  ${h.note}`);
  });

  lines.push(`\n💡 ${info.tip}`);
  lines.push(`💰 ${info.budget}`);

  return lines.join('\n');
}

function showBestTime(destKey, lang = 'en') {
  const TL = lang === 'tl';
  const info = BEST_TIME[destKey];
  if (!info) return showWeatherInfo(null, lang);
  return [
    TL ? `📅 Pinakamainam na panahon para bisitahin ang ${destKey}\n` : `📅 Best time to visit ${destKey}\n`,
    `✅ ${TL ? 'Pumunta' : 'Go'}:    ${info.best}`,
    `⚠️ ${TL ? 'Iwasan' : 'Avoid'}: ${info.avoid}`,
    `\n💡 ${info.note}`,
    TL
      ? `\nPangkalahatang tuntunin: Ang dry season ng Pilipinas ay Nobyembre–Mayo. Ang rainy season ay Hunyo–Oktubre, na may mga bagyo na tumataas mula Agosto–Oktubre.`
      : `\nGeneral rule: Philippines dry season is November–May. Rainy season is June–October, with typhoons peaking August–October.`,
  ].join('\n');
}

function showWeatherInfo(destKey, lang = 'en') {
  const TL = lang === 'tl';
  if (destKey) {
    const info = BEST_TIME[destKey];
    if (info) return showBestTime(destKey, lang);
  }
  return [
    TL ? `🌤 Gabay sa Panahon ng Pilipinas\n` : `🌤 Philippines Weather Guide\n`,
    TL ? `☀️ Dry Season (Amihan): Nobyembre hanggang Mayo` : `☀️ Dry Season (Amihan): November to May`,
    TL ? `   Malamig na hangin mula NE · Pinakamainam para sa beach at outdoor trips` : `   Cool NE winds · Best for beaches & outdoor trips`,
    TL ? `🌧 Rainy Season (Habagat): Hunyo hanggang Oktubre` : `🌧 Rainy Season (Habagat): June to October`,
    TL ? `   Mainit at mahalumigmig · Umuulan hapon-hapon` : `   Hot & humid · Afternoon thunderstorms daily`,
    TL ? `🌀 Typhoon Season: Hulyo hanggang Nobyembre` : `🌀 Typhoon Season: July to November`,
    TL ? `   Pinakamalakas Agosto–Oktubre · Iwasan ang mga lugar na nakalantad` : `   Peaks August–October · Avoid exposed coasts`,
    TL ? `\n📍 Mga lugar na halos walang bagyo:` : `\n📍 Typhoon-free zones:`,
    TL ? `   • Davao at Mindanao — halos hindi tinatamaan` : `   • Davao & Mindanao — almost never hit`,
    TL ? `   • Palawan — napoprotektahan ng Borneo` : `   • Palawan — sheltered by Borneo`,
    TL ? `\n📍 Laging malamig:` : `\n📍 Always cool:`,
    `   • Baguio, Sagada, Batanes, Bukidnon (highlands)`,
    TL
      ? `\nTanungin mo ako ng "pinakamainam na panahon sa Batanes" o "kailan pumunta sa Boracay" para sa mga tiyak na destinasyon!`
      : `\nAsk me "best time for Batanes" or "when to go to Boracay" for specific destinations!`,
  ].join('\n');
}

function showVisa(lang = 'en') {
  const TL = lang === 'tl';
  return [
    TL ? `🛂 Paglalakbay sa Pilipinas — Pagpasok at Visa\n` : `🛂 Philippines Travel — Entry & Visa\n`,
    TL ? `✅ Karamihan sa mga nasyonalidad ay hindi kailangan ng visa` : `✅ No visa needed for most nationalities`,
    TL ? `   • 30 araw na libreng pagpasok para sa karamihan ng passport holder` : `   • 30-day free entry for most passport holders`,
    TL ? `   • Maaaring palawigin sa Bureau of Immigration (BI)` : `   • Extendable at Bureau of Immigration (BI)`,
    TL ? `\n📋 Kailangan mo sa pagdating:` : `\n📋 What you need at arrival:`,
    `   • Return or onward ticket`,
    TL ? `   • Katibayan ng tirahan` : `   • Proof of accommodation`,
    TL ? `   • Sapat na pondo (₱1,000/araw ang inirekomenda)` : `   • Sufficient funds (₱1,000/day recommended)`,
    TL ? `\n🔄 Palawigin ang iyong pananatili:` : `\n🔄 Extending your stay:`,
    `   • First extension: 29 days (₱3,130 at BI)`,
    TL ? `   • Maaaring mag-extend nang maraming beses hanggang 36 buwan` : `   • Multiple extensions allowed up to 36 months`,
    `   • Online extension: etravel.gov.ph`,
    TL ? `\n🇵🇭 Paglalakbay sa loob ng Pilipinas:` : `\n🇵🇭 Traveling within the Philippines:`,
    TL ? `   • Hindi kailangan ng panloob na visa` : `   • No internal visa needed`,
    TL ? `   • Magdala ng valid na government ID` : `   • Bring a valid government ID`,
    TL ? `   • Ang ilang isla ay nangangailangan ng eTravel QR code registration` : `   • Some islands require eTravel QR code registration`,
    TL
      ? `\nMag-register sa etravel.gov.ph bago ang anumang domestic flight o inter-island ferry.`
      : `\nRegister at etravel.gov.ph before any domestic flight or inter-island ferry.`,
  ].join('\n');
}

async function showTripCountdown(trips, lang = 'en') {
  const TL = lang === 'tl';
  if (!trips || trips.length === 0) {
    return TL
      ? `Wala ka pa ring trips. Gumawa ng isa para magsimula ang countdown! ✈️`
      : `You don't have any trips yet. Create one to start the countdown! ✈️`;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let upcoming    = null;
  let nearestDiff = Infinity;
  let ongoingTrip = null;

  for (const tr of trips) {
    const start = parseTripDateStr(tr.dates);
    if (!start) continue;
    start.setHours(0, 0, 0, 0);
    const diff = Math.ceil((start - today) / 86400000);
    if (diff === 0) {
      ongoingTrip = tr;
    } else if (diff > 0 && diff < nearestDiff) {
      nearestDiff = diff;
      upcoming = { trip: tr, start, diff };
    }
  }

  // Currently on a trip
  if (ongoingTrip) {
    const start   = parseTripDateStr(ongoingTrip.dates);
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + ongoingTrip.days - 1);
    endDate.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((endDate - today) / 86400000) + 1;
    return [
      TL ? `✈️ KASALUKUYAN KANG NASA TRIP MO!\n` : `✈️ You're on your trip RIGHT NOW!\n`,
      `${ongoingTrip.emoji || '✈️'} ${ongoingTrip.name}`,
      `📍 ${ongoingTrip.destination}`,
      TL
        ? `⏱ ${daysLeft} araw pa ang natitira sa iyong trip`
        : `⏱ ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left in your trip`,
      TL ? `\nMag-enjoy ka! Maligayang biyahe! 🎉` : `\nHave a great trip! 🎉 Enjoy every moment.`,
    ].join('\n');
  }

  // No trip with dates
  if (!upcoming) {
    const noDate = trips.filter(tr => !parseTripDateStr(tr.dates));
    if (noDate.length > 0 && noDate.length === trips.length) {
      return TL
        ? `Ang iyong mga trips ay walang petsa pa.\n\nI-edit ang isang trip para magdagdag ng petsa, tapos maaari akong mag-countdown para sa iyo! ✈️`
        : `Your trips don't have start dates yet.\n\nEdit a trip to add dates, then I can count down for you! ✈️`;
    }
    return TL
      ? `Lahat ng iyong mga upcoming trips ay nakaraan na. Panahon na para mag-plano ng bagong adventure! 🗺️\n\nSubukan: "Mag-plan ng trip sa Siargao para sa 5 araw"`
      : `All your upcoming trips have already passed. Time to plan a new adventure! 🗺️\n\nTry: "Plan a trip to Siargao for 5 days"`;
  }

  const { trip, diff } = upcoming;
  const lines = [TL ? `⏳ Countdown para sa ${trip.name}\n` : `⏳ Countdown to ${trip.name}\n`];

  if (diff === 1)       lines.push(TL ? `Bukas na! 🎉 Ihanda na ang iyong mga gamit!` : `Tomorrow! 🎉 Get your bags ready!`);
  else if (diff <= 3)   lines.push(TL ? `${diff} araw na lang — malapit na! 🎒` : `Only ${diff} days to go — almost there! 🎒`);
  else if (diff <= 7)   lines.push(TL ? `${diff} araw pa — ngayong linggo na! 🎒` : `${diff} days to go — this week! 🎒`);
  else if (diff <= 14)  lines.push(TL ? `${diff} araw pa — susunod na linggo!` : `${diff} days to go — next week!`);
  else if (diff <= 30)  lines.push(TL ? `${diff} araw pa (~${Math.ceil(diff / 7)} linggo)` : `${diff} days to go (~${Math.ceil(diff / 7)} weeks)`);
  else                  lines.push(TL ? `${diff} araw pa` : `${diff} days to go`);

  lines.push(`\n${trip.emoji || '✈️'} ${trip.name}`);
  lines.push(`📍 ${trip.destination}`);
  if (trip.dates && !/^\d+\s*days?$/i.test(trip.dates)) lines.push(`📅 ${trip.dates}`);
  lines.push(TL ? `🗓 ${trip.days} araw na trip` : `🗓 ${trip.days} day${trip.days !== 1 ? 's' : ''} trip`);

  if (diff <= 3)       lines.push(TL
    ? `\n🎒 I-check na ang iyong listahan ng dala! Tanungin: "listahan ng dala para sa ${trip.name}"`
    : `\n🎒 Better check your packing list! Ask me "packing list for ${trip.name}"`);
  else if (diff <= 14) lines.push(TL
    ? `\n💡 Tanungin: "ano ang gagawin sa ${trip.destination}" para planuhin ang iyong itinerary!`
    : `\n💡 Ask me "what to do in ${trip.destination}" to plan your itinerary!`);
  else                 lines.push(TL
    ? `\n💰 Tanungin: "kumusta ang budget ko?" para makita kung naka-track ka.`
    : `\n💰 Ask me "how's my budget?" to see if you're on track.`);

  return lines.join('\n');
}

function suggestDestination(t, lang = 'en') {
  const TL = lang === 'tl';
  for (const entry of VIBE_SUGGESTIONS) {
    if (entry.vibes.some(v => t.includes(v))) {
      const lines = [TL
        ? `🗺️ Mga ${entry.label} sa Pilipinas:\n`
        : `🗺️ ${titleCase(entry.label)} in the Philippines:\n`];
      entry.places.forEach(p => {
        lines.push(`• ${p.name}`);
        lines.push(`  ${p.note}`);
      });
      lines.push(TL
        ? `\nTanungin mo ako ng "ano ang gagawin sa [destinasyon]" para sa buong detalye!`
        : `\nAsk me "what to do in [destination]" for full details on any of these!`);
      return lines.join('\n');
    }
  }
  return null;
}

async function smartFallback(t, userName, trips, lang = 'en') {
  const TL = lang === 'tl';

  // 1. Destination is mentioned but no query keyword → offer suggestions
  const destKey = findDestKey(t);
  if (destKey) {
    const result = showPlacesInDestination(destKey, { mustVisit: false }, lang);
    if (result) return result;
  }

  // 2. Trip-related words → show their trips
  if (contains(t, ['trip', 'lakbay', 'biyahe', 'travel', 'byahe', 'lakad'])) {
    return await showTrips(lang);
  }

  // 3. Money / cost mentioned → budget
  if (contains(t, ['₱', 'piso', 'peso', 'pera', 'bayad', 'gastos', 'budget', 'money', 'cost', 'magkano'])) {
    return await showBudget(lang);
  }

  // 4. Vibe-based suggestions
  const vibeResult = suggestDestination(t, lang);
  if (vibeResult) return vibeResult;

  // 5. Greetings → friendly response
  if (contains(t, ['hello', 'hi', 'hey', 'kumusta', 'kamusta', 'musta', 'good morning', 'good afternoon', 'magandang'])) {
    const tripData = trips && trips.length > 0
      ? (TL
          ? `\n\nMayroon kang ${trips.length} trip${trips.length !== 1 ? 's' : ''} na nakatakda. Tanungin mo ako tungkol sa kanila!`
          : `\n\nYou have ${trips.length} trip${trips.length !== 1 ? 's' : ''} planned. Ask me anything about them!`)
      : (TL
          ? `\n\nWala ka pa ring trips — subukan ang "Mag-plan ng trip sa Baguio para sa 3 araw" para magsimula!`
          : `\n\nYou don't have any trips yet — try "Plan a trip to Baguio for 3 days" to start!`);
    return TL
      ? `Kumusta, ${userName}! 😊${tripData}\n\nAko ay may alam sa iyong mga trips, budget, listahan ng dala, at mga destinasyon sa buong Pilipinas. Magtanong ka lang!`
      : `Kamusta, ${userName}! 😊${tripData}\n\nI know your trips, budget, packing lists, and destinations all across the Philippines. Just ask!`;
  }

  // 6. True fallback — show specific actionable examples
  return TL
    ? `Hindi ko naintindihan iyon, ${userName}. Narito ang ilang maaari mong itanong:\n\n🗺️ "Ano ang gagawin sa Baguio?"\n⏳ "Ilang araw na lang ang trip ko?"\n🌤 "Pinakamainam na panahon sa Batanes?"\n🎒 "Dagdag jacket sa listahan ng dala"\n💸 "Nagastos ng ₱350 sa pagkain"\n✈️ "Mag-plan ng trip sa El Nido para sa 4 araw"\n\nO subukan: "Gusto ko ng malamig na lugar" at magmumungkahi ako ng mga destinasyon!`
    : `I didn't quite catch that, ${userName}. Here are some things you can ask:\n\n🗺️ "What to do in Baguio?"\n⏳ "How many days left in my trip?"\n🌤 "Best time to visit Batanes?"\n🎒 "Add jacket to packing list"\n💸 "Spent ₱350 on food"\n✈️ "Plan a trip to El Nido for 4 days"\n\nOr try: "I want somewhere cold" and I'll suggest destinations!`;
}

function showTransport(t, lang = 'en') {
  const TL = lang === 'tl';
  if (/jeepney/.test(t)) return TL
    ? `🚌 Jeepney — Hari ng kalsada\n\nBayad: ₱13–₱15 minimum\n\nParaan ng pagsakay:\n1. Ihinto — itaas ang kamay\n2. Sabihin sa driver ang iyong hintuan\n3. Ipasa ang bayad pasulong sa driver\n4. Sabihing "Para!" para huminto\n\nTip: Magdala ng barya.`
    : `🚌 Jeepney — The king of the road\n\nFare: ₱13–₱15 minimum\n\nHow to ride:\n1. Flag it down — raise your hand\n2. Tell the driver your stop\n3. Pass fare forward to the driver\n4. Say "Para!" to stop\n\nTip: Keep small bills ready.`;
  if (/tricycle/.test(t)) return TL
    ? `🛺 Tricycle — Ang sasakyan sa barangay\n\nBayad: ₱10–₱50 bawat tao\n\nParaan ng pagsakay:\n1. Ihinto kahit saan\n2. Makipag-usap sa bayad bago sumakay\n3. Charter rate = 3–4x para sa buong sidecar\n\nTip: Laging itanong ang bayad bago sumakay.`
    : `🛺 Tricycle — Your neighborhood ride\n\nFare: ₱10–₱50 per person\n\nHow to ride:\n1. Flag one down anywhere\n2. Agree on fare before getting in\n3. Charter rate = 3–4x for the whole sidecar\n\nTip: Always negotiate the fare first.`;
  if (/ferry|boat/.test(t)) return TL
    ? `⛵ Ferry/Bangka — Para sa island hopping\n\nBayad: ₱150–₱2,000+\n\nParaan ng pagsakay:\n1. Bumili ng tiket sa port terminal\n2. Dumating nang 30–45 minuto bago\n3. Magdala ng valid ID para sa pag-board\n\nTip: Mag-book nang maaga sa peak season.`
    : `⛵ Ferry/Boat — For island hopping\n\nFare: ₱150–₱2,000+\n\nHow to ride:\n1. Buy ticket at the port terminal\n2. Arrive 30–45 min early\n3. Bring valid ID for boarding\n\nTip: Book in advance during peak season.`;
  if (/\bbus\b/.test(t)) return TL
    ? `🚍 Bus — Paglalakbay sa ibang lalawigan\n\nBayad: ₱50–₱800\n\nMga pangunahing operator: Victory Liner, Partas, Ceres\n\nTip: Ang night bus ay makatipid ng oras at bayad sa hotel.`
    : `🚍 Bus — Inter-provincial travel\n\nFare: ₱50–₱800\n\nMajor operators: Victory Liner, Partas, Ceres\n\nTip: Night buses save time and hotel cost.`;
  if (/van|fx|shuttle/.test(t)) return TL
    ? `🚐 Van/FX — Mas mabilis kaysa bus\n\nBayad: ₱80–₱500 bawat upuan\nUmaalis kapag puno — walang nakatakdang iskedyul.\n\nTip: Pumunta bago mag-8 AM para sa pinaka-maaasahang trips.`
    : `🚐 Van/FX — Faster than buses\n\nFare: ₱80–₱500 per seat\nDeparts when full — no fixed schedule.\n\nTip: Go before 8 AM for most reliable trips.`;
  if (/habal/.test(t)) return TL
    ? `🏍️ Habal-Habal — Motorsiklo para sa bundok\n\nBayad: ₱20–₱200\n\nKailangan sa mga liblib na lugar at barangay sa bundok.\n\nTip: Palaging itanong ang bayad bago sumakay.`
    : `🏍️ Habal-Habal — Mountain road motorcycle\n\nFare: ₱20–₱200\n\nEssential in remote areas and mountain barangays.\n\nTip: Always agree on fare before riding.`;
  if (/grab|taxi/.test(t)) return TL
    ? `🚗 Grab / Taxi — Door-to-door na pagsakay\n\nAng Grab ay available sa karamihan ng mga lungsod.\n\nTip: I-enable ang ride sharing (GrabShare) para makatipid ng 20–30%.`
    : `🚗 Grab / Taxi — Door-to-door rides\n\nGrab is available in most cities.\n\nTip: Enable ride sharing (GrabShare) to save 20–30%.`;
  return TL
    ? `Paano mo gustong maglakbay?\n\n🚌 Jeepney — ₱13–₱15 (lungsod)\n🛺 Tricycle — ₱10–₱50 (barangay)\n⛵ Ferry — ₱150–₱2,000+ (mga isla)\n🚍 Bus — ₱50–₱800 (inter-city)\n🚐 Van/FX — ₱80–₱500 (lalawigan)\n🏍️ Habal-Habal — ₱20–₱200 (bundok)\n🚗 Grab — metro + app surge\n\nTanungin mo ako tungkol sa isa!`
    : `How do you want to get around?\n\n🚌 Jeepney — ₱13–₱15 (city routes)\n🛺 Tricycle — ₱10–₱50 (barangay)\n⛵ Ferry — ₱150–₱2,000+ (islands)\n🚍 Bus — ₱50–₱800 (inter-city)\n🚐 Van/FX — ₱80–₱500 (provincial)\n🏍️ Habal-Habal — ₱20–₱200 (mountain)\n🚗 Grab — metered + app surge\n\nAsk me about a specific one!`;
}

function showFood(lang = 'en') {
  const TL = lang === 'tl';
  return TL
    ? `🍽️ Mga tip sa pagkain:\n\n• Kumain sa lokal na carinderia — mura at tunay\n• Budget na ₱100–₱250 bawat kain sa lokal na lugar\n• Subukan ang lechon, sinigang, adobo para sa lokal na lasa\n• Bisitahin ang palengke para sa mga meryenda\n• Ang Mang Inasal at Jollibee ay abot-kayang pagpipilian\n• Ang halo-halo ay kailangan sa mainit na hapon`
    : `🍽️ Food tips:\n\n• Eat at local carinderias — cheap and authentic\n• Budget ₱100–₱250 per meal at local spots\n• Try lechon, sinigang, adobo for local flavors\n• Visit the palengke (wet market) for snacks\n• Mang Inasal and Jollibee are affordable go-tos\n• Halo-halo is a must on hot afternoons`;
}

function showAccommodation(lang = 'en') {
  const TL = lang === 'tl';
  return TL
    ? `🏨 Mga tip sa tirahan:\n\n• Mga guesthouse: ₱400–₱800/gabi\n• Mga hostel (solo): ₱200–₱500/higaan\n• Mag-book nang isang linggo bago sa peak season (Dis–Mayo)\n• Ang Airbnb ay maganda para sa group stays\n• I-check kung kasama ang almusal!\n• Ang Booking.com ay karaniwang may pinakamababang presyo`
    : `🏨 Accommodation tips:\n\n• Guesthouses: ₱400–₱800/night\n• Hostels (solo): ₱200–₱500/bed\n• Book a week ahead in peak season (Dec–May)\n• Airbnb is great for group stays\n• Check if breakfast is included!\n• Booking.com usually has the best rates`;
}

function showTips(lang = 'en') {
  const TL = lang === 'tl';
  return TL
    ? `💡 Mga mabilis na tip sa pagbiyahe:\n\n• Laging magdala ng cash — maraming lugar na hindi tumatanggap ng card\n• Mag-palitan sa Palawan Pawnshop para sa mas magandang palitan\n• Mag-ipon ng ₱500 emergency fund sa hiwalay na bulsa\n• Ang pagtawad sa mga palengke ay inaasahan\n• Maglakbay nang magaan — ang bayad sa bagahe ay nakaka-ubos ng budget\n• I-download ang mga mapa offline bago umalis sa lungsod\n• I-save ang mga dapat gawin sa iyong itinerary nang maaga`
    : `💡 Quick travel tips:\n\n• Always carry cash — many spots don't take cards\n• Exchange at Palawan Pawnshop for better rates\n• Keep ₱500 emergency fund in a separate pocket\n• Haggling at markets is expected\n• Travel light — baggage fees drain the budget\n• Download maps offline before leaving the city\n• Save your must-do stops in your itinerary early`;
}


// ── Multi-turn continuation ───────────────────────────────────────────────────

async function continueFlow(t, raw, context, lang = 'en') {
  const TL = lang === 'tl';
  const { intent, partialData, step } = context;

  if (intent === 'LOG_EXPENSE' && step === 'category') {
    const category = extractCategory(t) ||
      (/^food$/i.test(t.trim())              ? 'Food'          :
       /^transport$/i.test(t.trim())         ? 'Transport'     :
       /^accommodat|^hotel$/i.test(t.trim()) ? 'Accommodation' :
       /^activit/i.test(t.trim())            ? 'Activities'    :
       /^other/i.test(t.trim())              ? 'Others'        : null);
    if (!category) {
      return {
        text: TL
          ? `Anong kategorya?\n\n• Food\n• Transport\n• Accommodation\n• Activities\n• Others`
          : `Which category?\n\n• Food\n• Transport\n• Accommodation\n• Activities\n• Others`,
        needsMore: { context, question: 'category' },
      };
    }
    return {
      text: TL
        ? `Sige! Ito ang ilo-log ko:\n\n💸 ${fmt(partialData.amount)} • ${category}\n\nIdadagdag ko ba ito sa iyong mga gastos?`
        : `Got it! Here's what I'll log:\n\n💸 ${fmt(partialData.amount)} • ${category}\n\nShall I add this to your expenses?`,
      action: { intent: 'LOG_EXPENSE', data: { amount: partialData.amount, category, note: '' } },
    };
  }

  if (intent === 'ADD_PACKING_ITEM' && step === 'selectTrip') {
    const trips = await getTrips();
    const trip = findTripByName(trips, raw);
    if (!trip) {
      const tripList = trips.map(tr => `• ${tr.name}`).join('\n');
      return {
        text: TL
          ? `Hindi ko matukoy iyon. Aling trip?\n\n${tripList}`
          : `I couldn't match that. Which trip?\n\n${tripList}`,
        needsMore: { context, question: 'selectTrip' },
      };
    }
    return {
      text: TL
        ? `Idadagdag ba ang "${partialData.item}" sa "${trip.name}"?\n\nKumpirmahin?`
        : `Add "${partialData.item}" to "${trip.name}"?\n\nConfirm?`,
      action: { intent: 'ADD_PACKING_ITEM', data: { item: partialData.item, tripId: trip.id, tripName: trip.name } },
    };
  }

  if (intent === 'CREATE_TRIP' && step === 'destination') {
    const destination = titleCase(raw.trim());
    return {
      text: TL
        ? `Trip sa ${destination}! 🎒\n\nIlang araw?`
        : `A trip to ${destination}! 🎒\n\nHow many days?`,
      needsMore: { context: { intent: 'CREATE_TRIP', partialData: { destination }, step: 'days' } },
    };
  }

  if (intent === 'CREATE_TRIP' && step === 'days') {
    const days = extractDays(t) || (parseInt(t) > 0 && parseInt(t) < 365 ? parseInt(t) : null);
    if (!days) {
      return {
        text: TL
          ? `Ilang araw? (hal. "3 araw" o "3" lang)`
          : `How many days? (e.g. "3 days" or just "3")`,
        needsMore: { context, question: 'days' },
      };
    }
    return {
      text: TL
        ? `Sige — ${days} araw! 📅\n\nKailan mo planong magsimula? (hal. "June 10", "susunod na Biyernes", "sa loob ng 2 linggo", o "hindi pa sigurado")`
        : `Got it — ${days} day${days > 1 ? 's' : ''}! 📅\n\nWhen do you plan to start? (e.g. "June 10", "next Friday", "in 2 weeks", or "not sure yet")`,
      needsMore: { context: { intent: 'CREATE_TRIP', partialData: { ...partialData, days }, step: 'startDate' } },
    };
  }

  if (intent === 'CREATE_TRIP' && step === 'startDate') {
    const { destination, days } = partialData;
    const notSure   = /not sure|unsure|don't know|no idea|tbd|later|someday|hindi pa|hindi ko alam/.test(t);
    const startDate = notSure ? null : parseDateInput(raw);
    const dates     = tripDates(startDate, days);
    const name      = destination + ' Trip';
    return {
      text: TL
        ? `Ito ang aking gagawin:\n\n✈️ ${name}\n📍 ${destination}\n📅 ${days} araw · ${dates}\n\nIdadagdag ko ba ito sa iyong mga trips?`
        : `Here's what I'll create:\n\n✈️ ${name}\n📍 ${destination}\n📅 ${days} day${days > 1 ? 's' : ''} · ${dates}\n\nShall I add this to your trips?`,
      action: { intent: 'CREATE_TRIP', data: { name, destination, days, dates, emoji: '✈️' } },
    };
  }

  return {
    text: TL
      ? `Hindi ko naintindihan. Subukan:\n• Isang numero tulad ng "3" para sa mga araw\n• Isang pangalan ng lugar tulad ng "Baguio"\n• "Hindi pa sigurado" kung hindi ka pa nagpasya\n\nO i-type ang "cancel" para magsimula ulit.`
      : `I didn't catch that. Try:\n• A number like "3" for days\n• A place name like "Baguio"\n• "Not sure yet" if you haven't decided\n\nOr type "cancel" to start over.`,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function parseMessage(input, userName = 'Lakbayero', context = null, lang = 'en') {
  const t  = input.toLowerCase().trim();
  const TL = lang === 'tl';

  if (context) return continueFlow(t, input, context, lang);

  // ── LOG_EXPENSE ────────────────────────────────────────────────────────────
  const isSpendWord = /spend|spent|paid|pay\s|bought|nagbayad|nagastos|gumastos/.test(t);
  const amount      = extractAmount(t);
  const category    = extractCategory(t);

  if (isSpendWord && amount) {
    if (category) {
      return {
        text: TL
          ? `Sige! Ito ang ilo-log ko:\n\n💸 ${fmt(amount)} • ${category}\n\nIdadagdag ko ba ito sa iyong mga gastos?`
          : `Got it! Here's what I'll log:\n\n💸 ${fmt(amount)} • ${category}\n\nShall I add this to your expenses?`,
        action: { intent: 'LOG_EXPENSE', data: { amount, category, note: '' } },
      };
    }
    return {
      text: TL
        ? `Ilo-log ko ang ${fmt(amount)}. Anong kategorya?\n\n• Food\n• Transport\n• Accommodation\n• Activities\n• Others`
        : `I'll log ${fmt(amount)}. What category?\n\n• Food\n• Transport\n• Accommodation\n• Activities\n• Others`,
      needsMore: { context: { intent: 'LOG_EXPENSE', partialData: { amount }, step: 'category' } },
    };
  }

  // ── ADD_TO_BUDGET ──────────────────────────────────────────────────────────
  if (/add\s+.*\bbudget\b|increase.*budget/.test(t) && amount) {
    return {
      text: TL
        ? `Idadagdag ko ang ${fmt(amount)} sa iyong budget.\n\nKumpirmahin?`
        : `I'll add ${fmt(amount)} to your budget.\n\nConfirm?`,
      action: { intent: 'ADD_TO_BUDGET', data: { amount } },
    };
  }

  // ── SET_BUDGET ─────────────────────────────────────────────────────────────
  if (/set.*budget|budget.*to\s+₱?\d|budget.*is\s+₱?\d/.test(t) && amount) {
    return {
      text: TL
        ? `Itatakda ko ang iyong budget sa ${fmt(amount)}.\n\nKumpirmahin?`
        : `I'll set your budget to ${fmt(amount)}.\n\nConfirm?`,
      action: { intent: 'SET_BUDGET', data: { amount } },
    };
  }

  // ── ADD_PACKING_ITEM ───────────────────────────────────────────────────────
  const packingItem = extractPackingItem(t);
  if (packingItem) {
    const trips = await getTrips();
    if (trips.length === 0) {
      return { text: TL
        ? `Wala ka pang trips. Gumawa muna ng isa, tapos maaari akong magdagdag ng gamit sa listahan ng dala.`
        : `You don't have any trips yet. Create one first, then I can add items to its packing list.` };
    }
    let targetTrip = null;
    for (const tr of trips) {
      if (t.includes(tr.name.toLowerCase()) || t.includes(tr.destination.toLowerCase())) {
        targetTrip = tr;
        break;
      }
    }
    if (!targetTrip && trips.length === 1) targetTrip = trips[0];
    if (targetTrip) {
      return {
        text: TL
          ? `Idadagdag ba ang "${packingItem}" sa listahan ng dala para sa "${targetTrip.name}"?\n\nKumpirmahin?`
          : `Add "${packingItem}" to the packing list for "${targetTrip.name}"?\n\nConfirm?`,
        action: { intent: 'ADD_PACKING_ITEM', data: { item: packingItem, tripId: targetTrip.id, tripName: targetTrip.name } },
      };
    }
    const tripList = trips.map(tr => `• ${tr.name}`).join('\n');
    return {
      text: TL
        ? `Sa aling trip ko idadagdag ang "${packingItem}"?\n\n${tripList}`
        : `Which trip should I add "${packingItem}" to?\n\n${tripList}`,
      needsMore: { context: { intent: 'ADD_PACKING_ITEM', partialData: { item: packingItem }, step: 'selectTrip' } },
    };
  }

  // ── CREATE_TRIP ────────────────────────────────────────────────────────────
  if (/create.*trip|plan.*trip|new.*trip|add.*trip|gawa.*trip|mag.*trip/.test(t)) {
    const raw  = extractDestination(t);
    const dest = raw ? titleCase(raw) : null;
    const days = extractDays(t);
    if (dest && days) {
      return {
        text: TL
          ? `${days} araw sa ${dest} — maganda! 📅\n\nKailan mo planong magsimula? (hal. "June 10", "susunod na Biyernes", "sa loob ng 2 linggo", o "hindi pa sigurado")`
          : `${days} days in ${dest} — nice! 📅\n\nWhen do you plan to start? (e.g. "June 10", "next Friday", "in 2 weeks", or "not sure yet")`,
        needsMore: { context: { intent: 'CREATE_TRIP', partialData: { destination: dest, days }, step: 'startDate' } },
      };
    }
    if (dest) {
      return {
        text: TL
          ? `Trip sa ${dest}! 🎒\n\nIlang araw?`
          : `A trip to ${dest}! 🎒\n\nHow many days?`,
        needsMore: { context: { intent: 'CREATE_TRIP', partialData: { destination: dest }, step: 'days' } },
      };
    }
    return {
      text: TL
        ? `Mag-plan tayo ng trip! 🎒\n\nSaan ka pupunta?`
        : `Let's plan a trip! 🎒\n\nWhere are you going?`,
      needsMore: { context: { intent: 'CREATE_TRIP', partialData: {}, step: 'destination' } },
    };
  }

  // ── TRIP COUNTDOWN / CONTEXT AWARENESS ────────────────────────────────────
  if (contains(t, ['how many days', 'days left', 'countdown', 'how long', 'when is my trip', 'when does my trip', 'ilang araw', 'kailan trip', 'am i on my trip', 'trip start', 'trip na ba'])) {
    const trips = await getTrips();
    return { text: await showTripCountdown(trips, lang) };
  }

  // ── BEST TIME / WEATHER ────────────────────────────────────────────────────
  if (contains(t, ['best time', 'when to go', 'when to visit', 'weather', 'rainy season', 'dry season', 'typhoon', 'season', 'climate', 'when is it nice', 'pinakamainam', 'kailan pumunta', 'tag-ulan', 'tag-araw'])) {
    const destKey = findDestKey(t);
    return { text: destKey ? showBestTime(destKey, lang) : showWeatherInfo(null, lang) };
  }

  // ── VISA / ENTRY REQUIREMENTS ─────────────────────────────────────────────
  if (contains(t, ['visa', 'entry', 'passport', 'immigration', 'extension', 'etravel', 'requirements', 'can i enter', 'how long can i stay', 'tourist', 'foreign'])) {
    return { text: showVisa(lang) };
  }

  // ── VIBE-BASED DESTINATION SUGGESTION ─────────────────────────────────────
  if (contains(t, ['where should i go', 'where to go', 'suggest a place', 'recommend a place', 'i want to go', 'saan ako pupunta', 'saan maganda', 'magandang lugar', 'destination suggestion', 'where in the philippines', 'i want somewhere', 'looking for a place', 'sanang pumunta', 'gusto ko ng', 'gusto ko pumunta'])) {
    const result = suggestDestination(t, lang);
    if (result) return { text: result };
  }

  // ── PACKING LIST QUERY ─────────────────────────────────────────────────────
  if (contains(t, ['packing list', 'what to pack', 'pack list', 'what do i need to bring', 'what should i bring', 'ano dala', 'ano dadalhin', 'what to bring', 'listahan ng dala'])) {
    const trips = await getTrips();
    if (trips.length === 0) return { text: TL
      ? `Wala ka pang trips. Gumawa muna ng isa!`
      : `You don't have any trips yet. Create one first!` };
    let mentionedTrip = null;
    for (const tr of trips) {
      if (t.includes(tr.name.toLowerCase()) || t.includes(tr.destination.toLowerCase())) {
        mentionedTrip = tr.name;
        break;
      }
    }
    return { text: await showPackingList(mentionedTrip, trips, lang) };
  }

  // ── MY TRIPS ───────────────────────────────────────────────────────────────
  if (contains(t, ['my trips', 'show trips', 'list trips', 'what trips', 'mga trip', 'my trip', 'aking trip', 'show my', 'ipakita', 'mga biyahe ko']))
    return { text: await showTrips(lang) };

  // ── BUDGET ─────────────────────────────────────────────────────────────────
  if (contains(t, ['budget', 'how much', 'spending', 'gastos', 'remaining', 'expense', 'pera ko', "how's my", 'how is my', 'magkano', 'kumusta ang']))
    return { text: await showBudget(lang) };

  // ── DESTINATION QUERY — "what to do in X", "tourist spots in X", etc. ──────
  const destKey = findDestKey(t);
  const isDestQuery = contains(t, [
    'what to do', 'things to do', 'places to visit', 'places in', 'tourist spots',
    'must visit', 'must-visit', 'must see', 'what can i do', 'saan pumunta',
    'saan punta', 'ano maganda', 'ano gagawin', 'activities in', 'itinerary',
    'where to go', 'suggest', 'recommend', 'top spots', 'best places',
    'go to', 'see in', 'visit in', 'what to see', 'mga gagawin', 'gagawin sa',
  ]);

  if (destKey && isDestQuery) {
    const mustVisit = contains(t, ['must', 'top', 'best', 'highlight', 'must-visit']);
    const result = showPlacesInDestination(destKey, { mustVisit }, lang);
    if (result) return { text: result };
  }

  // If a destination is mentioned but no activity keyword, still give suggestions
  if (destKey && !isDestQuery) {
    const isQuestion = t.includes('?') || contains(t, ['how', 'where', 'when', 'what', 'ano', 'saan', 'paano', 'kailan', 'maganda', 'punta', 'trip']);
    if (isQuestion) {
      const result = showPlacesInDestination(destKey, { mustVisit: false }, lang);
      if (result) return { text: result };
    }
  }

  // ── TRANSPORT ──────────────────────────────────────────────────────────────
  if (contains(t, ['transport', 'jeepney', 'tricycle', 'ferry', 'bus', 'van', 'habal', 'grab', 'taxi', 'ride', 'commute', 'travel by', 'how to get', 'paano pumunta', 'paano makarating', 'paano sumakay']))
    return { text: showTransport(t, lang) };

  // ── FOOD ───────────────────────────────────────────────────────────────────
  if (contains(t, ['food', 'eat', 'kain', 'restaurant', 'lunch', 'dinner', 'breakfast', 'where to eat', 'saan kumain', 'pagkain']))
    return { text: showFood(lang) };

  // ── ACCOMMODATION ──────────────────────────────────────────────────────────
  if (contains(t, ['hotel', 'hostel', 'stay', 'accommodation', 'sleep', 'overnight', 'lodging', 'airbnb', 'saan matulog']))
    return { text: showAccommodation(lang) };

  // ── TIPS ───────────────────────────────────────────────────────────────────
  if (contains(t, ['tip', 'tips', 'advice', 'travel hack', 'trick', 'remind me', 'checklist']))
    return { text: showTips(lang) };

  // ── VIBE CATCH-ALL (before smart fallback) ─────────────────────────────────
  const vibeResult = suggestDestination(t, lang);
  if (vibeResult) return { text: vibeResult };

  // ── SMART FALLBACK ─────────────────────────────────────────────────────────
  const trips = await getTrips();
  return { text: await smartFallback(t, userName, trips, lang) };
}
