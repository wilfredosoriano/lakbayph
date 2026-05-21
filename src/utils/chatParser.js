/**
 * Offline intent parser for LakbayPH assistant.
 *
 * Always returns: { text, action?, needsMore? }
 *   text      — bot reply string
 *   action    — { intent, data } → screen shows confirm/cancel card
 *   needsMore — { context } → screen sets pendingContext, waits for next message
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

async function showBudget() {
  const s = await getBudgetSummary('1');
  const pct = s.total > 0 ? Math.round((s.spent / s.total) * 100) : 0;
  const lines = [
    `Here's your budget summary:\n`,
    `💰 Total:     ${fmt(s.total)}`,
    `💸 Spent:     ${fmt(s.spent)} (${pct}%)`,
    `✅ Remaining: ${fmt(s.remaining)}`,
  ];
  if (s.breakdown.length > 0) {
    lines.push('\nBy category:');
    s.breakdown.sort((a, b) => b.amount - a.amount).slice(0, 3)
      .forEach(b => lines.push(`• ${b.category}: ${fmt(b.amount)} (${b.percentage}%)`));
  }
  if (pct >= 90)      lines.push('\n⚠️ Almost at the limit! Stick to essentials.');
  else if (pct >= 70) lines.push('\n📌 Getting tight. Prioritize your must-dos.');
  else if (pct < 30)  lines.push('\n😊 Great pacing! Log every expense to stay accurate.');
  return lines.join('\n');
}

async function showTrips() {
  const trips = await getTrips();
  if (!trips || trips.length === 0) {
    return `You don't have any trips yet!\n\nTry: "Plan a trip to Baguio for 3 days"`;
  }
  const list = trips.map(t =>
    `${t.emoji || '✈️'} ${t.name}\n   📍 ${t.destination} · ${t.days} day${t.days !== 1 ? 's' : ''}`
  ).join('\n\n');
  return `Your trips (${trips.length}):\n\n${list}\n\nAsk me about any of them — budget, packing list, or what to do there.`;
}

async function showPackingList(tripName, trips) {
  const trip = tripName ? findTripByName(trips, tripName) : trips[0];
  if (!trip) return `I couldn't find that trip. Try "Show my trips" to see what you have.`;
  const items = await getPackingItems(trip.id);
  if (!items || items.length === 0) {
    return `No packing items yet for "${trip.name}".\n\nTry: "Add sunscreen to packing list for ${trip.name}"`;
  }
  const packed   = items.filter(i => i.checked);
  const unpacked = items.filter(i => !i.checked);
  const lines = [`🎒 Packing list for "${trip.name}":\n`];
  if (unpacked.length) {
    lines.push('Still needed:');
    unpacked.forEach(i => lines.push(`  ☐ ${i.item}`));
  }
  if (packed.length) {
    lines.push(`\nPacked (${packed.length}/${items.length}):`);
    packed.forEach(i => lines.push(`  ✓ ${i.item}`));
  }
  return lines.join('\n');
}

function showPlacesInDestination(destKey, opts = {}) {
  // ── Try app-curated places first ──────────────────────────────────────────
  const places = PLACES_BY_DESTINATION[destKey];
  if (places && places.length > 0) {
    const filtered = opts.mustVisit ? places.filter(p => p.mustVisit) : places;
    const shown    = filtered.slice(0, 7);
    const header   = opts.mustVisit
      ? `⭐ Must-visit in ${destKey}:\n`
      : `📍 Places to visit in ${destKey} (${filtered.length} total):\n`;
    const lines = [header];
    shown.forEach(p => {
      const fee  = p.entranceFee > 0 ? ` · ₱${p.entranceFee}` : ' · Free entry';
      const star = p.mustVisit ? ' ⭐' : '';
      lines.push(`${CATEGORY_EMOJI[p.category] || '📍'} ${p.name}${fee}${star}`);
      if (p.itineraryTip) lines.push(`   💡 ${p.itineraryTip.slice(0, 90)}${p.itineraryTip.length > 90 ? '…' : ''}`);
    });
    if (filtered.length > 7) lines.push(`\n...and ${filtered.length - 7} more in the Discover tab`);
    lines.push('\nOpen the Discover tab for photos, directions, and itinerary tips.');
    return lines.join('\n');
  }

  // ── Fall back to general knowledge base ───────────────────────────────────
  const info = GENERAL_DEST_INFO[destKey];
  if (!info) return null;

  const shown = opts.mustVisit ? info.highlights.slice(0, 5) : info.highlights;
  const lines = [
    `${info.emoji} What to do in ${destKey}`,
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

function showTransport(t) {
  if (/jeepney/.test(t))        return `🚌 Jeepney — The king of the road\n\nFare: ₱13–₱15 minimum\n\nHow to ride:\n1. Flag it down — raise your hand\n2. Tell the driver your stop\n3. Pass fare forward to the driver\n4. Say "Para!" to stop\n\nTip: Keep small bills ready.`;
  if (/tricycle/.test(t))       return `🛺 Tricycle — Your neighborhood ride\n\nFare: ₱10–₱50 per person\n\nHow to ride:\n1. Flag one down anywhere\n2. Agree on fare before getting in\n3. Charter rate = 3–4x for the whole sidecar\n\nTip: Always negotiate the fare first.`;
  if (/ferry|boat/.test(t))     return `⛵ Ferry/Boat — For island hopping\n\nFare: ₱150–₱2,000+\n\nHow to ride:\n1. Buy ticket at the port terminal\n2. Arrive 30–45 min early\n3. Bring valid ID for boarding\n\nTip: Book in advance during peak season.`;
  if (/\bbus\b/.test(t))        return `🚍 Bus — Inter-provincial travel\n\nFare: ₱50–₱800\n\nMajor operators: Victory Liner, Partas, Ceres\n\nTip: Night buses save time and hotel cost.`;
  if (/van|fx|shuttle/.test(t)) return `🚐 Van/FX — Faster than buses\n\nFare: ₱80–₱500 per seat\nDeparts when full — no fixed schedule.\n\nTip: Go before 8 AM for most reliable trips.`;
  if (/habal/.test(t))          return `🏍️ Habal-Habal — Mountain road motorcycle\n\nFare: ₱20–₱200\n\nEssential in remote areas and mountain barangays.\n\nTip: Always agree on fare before riding.`;
  if (/grab|taxi/.test(t))      return `🚗 Grab / Taxi — Door-to-door rides\n\nGrab is available in most cities.\n\nTip: Enable ride sharing (GrabShare) to save 20–30%.`;
  return `How do you want to get around?\n\n🚌 Jeepney — ₱13–₱15 (city routes)\n🛺 Tricycle — ₱10–₱50 (barangay)\n⛵ Ferry — ₱150–₱2,000+ (islands)\n🚍 Bus — ₱50–₱800 (inter-city)\n🚐 Van/FX — ₱80–₱500 (provincial)\n🏍️ Habal-Habal — ₱20–₱200 (mountain)\n🚗 Grab — metered + app surge\n\nAsk me about a specific one!`;
}

function showFood() {
  return `🍽️ Food tips:\n\n• Eat at local carinderias — cheap and authentic\n• Budget ₱100–₱250 per meal at local spots\n• Try lechon, sinigang, adobo for local flavors\n• Visit the palengke (wet market) for snacks\n• Mang Inasal and Jollibee are affordable go-tos\n• Halo-halo is a must on hot afternoons`;
}

function showAccommodation() {
  return `🏨 Accommodation tips:\n\n• Guesthouses: ₱400–₱800/night\n• Hostels (solo): ₱200–₱500/bed\n• Book a week ahead in peak season (Dec–May)\n• Airbnb is great for group stays\n• Check if breakfast is included!\n• Booking.com usually has the best rates`;
}

function showTips() {
  return `💡 Quick travel tips:\n\n• Always carry cash — many spots don't take cards\n• Exchange at Palawan Pawnshop for better rates\n• Keep ₱500 emergency fund in a separate pocket\n• Haggling at markets is expected\n• Travel light — baggage fees drain the budget\n• Download maps offline before leaving the city\n• Save your must-do stops in your itinerary early`;
}

function fallback(name) {
  return `Here's what I can help you with, ${name}:\n\n✏️  Log expenses — "Spent ₱200 on food"\n💰  Budget — "Add ₱1,000 to my budget"\n✈️  Plan a trip — "Plan a trip to Vigan for 3 days"\n🎒  Packing — "Add sunscreen to packing list"\n📋  My trips — "Show my trips"\n📍  Places — "What to do in Baguio?"\n🚌  Transport — "How do I ride a jeepney?"\n\nJust type naturally — I understand Filipino too!`;
}

// ── Multi-turn continuation ───────────────────────────────────────────────────

async function continueFlow(t, raw, context) {
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
        text: `Which category?\n\n• Food\n• Transport\n• Accommodation\n• Activities\n• Others`,
        needsMore: { context, question: 'category' },
      };
    }
    return {
      text: `Got it! Here's what I'll log:\n\n💸 ${fmt(partialData.amount)} • ${category}\n\nShall I add this to your expenses?`,
      action: { intent: 'LOG_EXPENSE', data: { amount: partialData.amount, category, note: '' } },
    };
  }

  if (intent === 'ADD_PACKING_ITEM' && step === 'selectTrip') {
    const trips = await getTrips();
    const trip = findTripByName(trips, raw);
    if (!trip) {
      const tripList = trips.map(tr => `• ${tr.name}`).join('\n');
      return {
        text: `I couldn't match that. Which trip?\n\n${tripList}`,
        needsMore: { context, question: 'selectTrip' },
      };
    }
    return {
      text: `Add "${partialData.item}" to "${trip.name}"?\n\nConfirm?`,
      action: { intent: 'ADD_PACKING_ITEM', data: { item: partialData.item, tripId: trip.id, tripName: trip.name } },
    };
  }

  if (intent === 'CREATE_TRIP' && step === 'destination') {
    const destination = titleCase(raw.trim());
    return {
      text: `A trip to ${destination}! 🎒\n\nHow many days?`,
      needsMore: { context: { intent: 'CREATE_TRIP', partialData: { destination }, step: 'days' } },
    };
  }

  if (intent === 'CREATE_TRIP' && step === 'days') {
    const days = extractDays(t) || (parseInt(t) > 0 && parseInt(t) < 365 ? parseInt(t) : null);
    if (!days) {
      return {
        text: `How many days? (e.g. "3 days" or just "3")`,
        needsMore: { context, question: 'days' },
      };
    }
    return {
      text: `Got it — ${days} day${days > 1 ? 's' : ''}! 📅\n\nWhen do you plan to start? (e.g. "June 10", "next Friday", "in 2 weeks", or "not sure yet")`,
      needsMore: { context: { intent: 'CREATE_TRIP', partialData: { ...partialData, days }, step: 'startDate' } },
    };
  }

  if (intent === 'CREATE_TRIP' && step === 'startDate') {
    const { destination, days } = partialData;
    const notSure   = /not sure|unsure|don't know|no idea|tbd|later|someday/.test(t);
    const startDate = notSure ? null : parseDateInput(raw);
    const dates     = tripDates(startDate, days);
    const name      = destination + ' Trip';
    return {
      text: `Here's what I'll create:\n\n✈️ ${name}\n📍 ${destination}\n📅 ${days} day${days > 1 ? 's' : ''} · ${dates}\n\nShall I add this to your trips?`,
      action: { intent: 'CREATE_TRIP', data: { name, destination, days, dates, emoji: '✈️' } },
    };
  }

  return { text: fallback('there') };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function parseMessage(input, userName = 'Lakbayero', context = null) {
  const t = input.toLowerCase().trim();

  if (context) return continueFlow(t, input, context);

  // ── LOG_EXPENSE ────────────────────────────────────────────────────────────
  const isSpendWord = /spend|spent|paid|pay\s|bought|nagbayad|nagastos|gumastos/.test(t);
  const amount      = extractAmount(t);
  const category    = extractCategory(t);

  if (isSpendWord && amount) {
    if (category) {
      return {
        text: `Got it! Here's what I'll log:\n\n💸 ${fmt(amount)} • ${category}\n\nShall I add this to your expenses?`,
        action: { intent: 'LOG_EXPENSE', data: { amount, category, note: '' } },
      };
    }
    return {
      text: `I'll log ${fmt(amount)}. What category?\n\n• Food\n• Transport\n• Accommodation\n• Activities\n• Others`,
      needsMore: { context: { intent: 'LOG_EXPENSE', partialData: { amount }, step: 'category' } },
    };
  }

  // ── ADD_TO_BUDGET ──────────────────────────────────────────────────────────
  if (/add\s+.*\bbudget\b|increase.*budget/.test(t) && amount) {
    return {
      text: `I'll add ${fmt(amount)} to your budget.\n\nConfirm?`,
      action: { intent: 'ADD_TO_BUDGET', data: { amount } },
    };
  }

  // ── SET_BUDGET ─────────────────────────────────────────────────────────────
  if (/set.*budget|budget.*to\s+₱?\d|budget.*is\s+₱?\d/.test(t) && amount) {
    return {
      text: `I'll set your budget to ${fmt(amount)}.\n\nConfirm?`,
      action: { intent: 'SET_BUDGET', data: { amount } },
    };
  }

  // ── ADD_PACKING_ITEM ───────────────────────────────────────────────────────
  const packingItem = extractPackingItem(t);
  if (packingItem) {
    const trips = await getTrips();
    if (trips.length === 0) {
      return { text: `You don't have any trips yet. Create one first, then I can add items to its packing list.` };
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
        text: `Add "${packingItem}" to the packing list for "${targetTrip.name}"?\n\nConfirm?`,
        action: { intent: 'ADD_PACKING_ITEM', data: { item: packingItem, tripId: targetTrip.id, tripName: targetTrip.name } },
      };
    }
    const tripList = trips.map(tr => `• ${tr.name}`).join('\n');
    return {
      text: `Which trip should I add "${packingItem}" to?\n\n${tripList}`,
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
        text: `${days} days in ${dest} — nice! 📅\n\nWhen do you plan to start? (e.g. "June 10", "next Friday", "in 2 weeks", or "not sure yet")`,
        needsMore: { context: { intent: 'CREATE_TRIP', partialData: { destination: dest, days }, step: 'startDate' } },
      };
    }
    if (dest) {
      return {
        text: `A trip to ${dest}! 🎒\n\nHow many days?`,
        needsMore: { context: { intent: 'CREATE_TRIP', partialData: { destination: dest }, step: 'days' } },
      };
    }
    return {
      text: `Let's plan a trip! 🎒\n\nWhere are you going?`,
      needsMore: { context: { intent: 'CREATE_TRIP', partialData: {}, step: 'destination' } },
    };
  }

  // ── PACKING LIST QUERY ─────────────────────────────────────────────────────
  if (contains(t, ['packing list', 'what to pack', 'pack list', 'what do i need to bring', 'what should i bring', 'ano dala', 'ano dadalhin', 'what to bring'])) {
    const trips = await getTrips();
    if (trips.length === 0) return { text: `You don't have any trips yet. Create one first!` };
    // Find which trip the user is asking about by matching trip name or destination
    let mentionedTrip = null;
    for (const tr of trips) {
      if (t.includes(tr.name.toLowerCase()) || t.includes(tr.destination.toLowerCase())) {
        mentionedTrip = tr.name;
        break;
      }
    }
    return { text: await showPackingList(mentionedTrip, trips) };
  }

  // ── MY TRIPS ───────────────────────────────────────────────────────────────
  if (contains(t, ['my trips', 'show trips', 'list trips', 'what trips', 'mga trip', 'my trip', 'aking trip', 'show my']))
    return { text: await showTrips() };

  // ── BUDGET ─────────────────────────────────────────────────────────────────
  if (contains(t, ['budget', 'how much', 'spending', 'gastos', 'remaining', 'expense', 'pera ko', "how's my", 'how is my', 'magkano']))
    return { text: await showBudget() };

  // ── DESTINATION QUERY — "what to do in X", "tourist spots in X", etc. ──────
  const destKey = findDestKey(t);
  const isDestQuery = contains(t, [
    'what to do', 'things to do', 'places to visit', 'places in', 'tourist spots',
    'must visit', 'must-visit', 'must see', 'what can i do', 'saan pumunta',
    'saan punta', 'ano maganda', 'ano gagawin', 'activities in', 'itinerary',
    'where to go', 'suggest', 'recommend', 'top spots', 'best places',
    'go to', 'see in', 'visit in', 'what to see',
  ]);

  if (destKey && isDestQuery) {
    const mustVisit = contains(t, ['must', 'top', 'best', 'highlight', 'must-visit']);
    const result = showPlacesInDestination(destKey, { mustVisit });
    if (result) return { text: result };
  }

  // If a destination is mentioned but no activity keyword, still give suggestions
  if (destKey && !isDestQuery) {
    // Check if it's a question or general query about the place
    const isQuestion = t.includes('?') || contains(t, ['how', 'where', 'when', 'what', 'ano', 'saan', 'paano', 'kailan', 'maganda', 'punta', 'trip']);
    if (isQuestion) {
      const result = showPlacesInDestination(destKey, { mustVisit: false });
      if (result) return { text: result };
    }
  }

  // ── TRANSPORT ──────────────────────────────────────────────────────────────
  if (contains(t, ['transport', 'jeepney', 'tricycle', 'ferry', 'bus', 'van', 'habal', 'grab', 'taxi', 'ride', 'commute', 'travel by', 'how to get', 'paano pumunta', 'paano makarating']))
    return { text: showTransport(t) };

  // ── FOOD ───────────────────────────────────────────────────────────────────
  if (contains(t, ['food', 'eat', 'kain', 'restaurant', 'lunch', 'dinner', 'breakfast', 'where to eat', 'saan kumain', 'pagkain']))
    return { text: showFood() };

  // ── ACCOMMODATION ──────────────────────────────────────────────────────────
  if (contains(t, ['hotel', 'hostel', 'stay', 'accommodation', 'sleep', 'overnight', 'lodging', 'airbnb', 'saan matulog']))
    return { text: showAccommodation() };

  // ── TIPS ───────────────────────────────────────────────────────────────────
  if (contains(t, ['tip', 'tips', 'advice', 'travel hack', 'trick', 'remind me', 'checklist']))
    return { text: showTips() };

  return { text: fallback(userName) };
}
