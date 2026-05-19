/**
 * Offline intent parser for LakbayPH assistant.
 *
 * Always returns: { text, action?, needsMore? }
 *   text      — bot's reply string
 *   action    — { intent, data } → screen shows confirm/cancel card
 *   needsMore — { context } → screen sets pendingContext, waits for next message
 */

import { getBudgetSummary, getTrips } from '../database/db';

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

const MONTH_NAMES = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const MONTH_SHORT  = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

function parseDateInput(text) {
  const t = text.toLowerCase().trim();

  // "tomorrow"
  if (/tomorrow|bukas/.test(t)) {
    const d = new Date(); d.setDate(d.getDate() + 1); return d;
  }
  // "next [weekday]"
  const weekdays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const nextDay = weekdays.findIndex(w => t.includes(w));
  if (t.includes('next') && nextDay !== -1) {
    const d = new Date();
    const diff = (nextDay + 7 - d.getDay()) % 7 || 7;
    d.setDate(d.getDate() + diff); return d;
  }
  // "in X weeks"
  const inWeeks = t.match(/in\s+(\d+)\s+week/);
  if (inWeeks) { const d = new Date(); d.setDate(d.getDate() + parseInt(inWeeks[1]) * 7); return d; }
  // "in X months"
  const inMonths = t.match(/in\s+(\d+)\s+month/);
  if (inMonths) { const d = new Date(); d.setMonth(d.getMonth() + parseInt(inMonths[1])); return d; }
  // "in X days"
  const inDays = t.match(/in\s+(\d+)\s+day/);
  if (inDays) { const d = new Date(); d.setDate(d.getDate() + parseInt(inDays[1])); return d; }

  // "Month Day, Year" or "Month Day Year" — e.g. "June 10, 2026" or "June 10 2026"
  const monthDayYear = t.match(/([a-z]+)\s+(\d{1,2})[,\s]+(\d{4})/);
  if (monthDayYear) {
    const mIdx = MONTH_NAMES.indexOf(monthDayYear[1]) !== -1
      ? MONTH_NAMES.indexOf(monthDayYear[1])
      : MONTH_SHORT.indexOf(monthDayYear[1].slice(0, 3));
    if (mIdx !== -1) {
      return new Date(parseInt(monthDayYear[3]), mIdx, parseInt(monthDayYear[2]));
    }
  }

  // "Month Day" without year — assume next occurrence of that date
  const monthDay = t.match(/([a-z]+)\s+(\d{1,2})$/);
  if (monthDay) {
    const mIdx = MONTH_NAMES.indexOf(monthDay[1]) !== -1
      ? MONTH_NAMES.indexOf(monthDay[1])
      : MONTH_SHORT.indexOf(monthDay[1].slice(0, 3));
    if (mIdx !== -1) {
      const now = new Date();
      const candidate = new Date(now.getFullYear(), mIdx, parseInt(monthDay[2]));
      // If the date has already passed this year, use next year
      if (candidate < now) candidate.setFullYear(now.getFullYear() + 1);
      return candidate;
    }
  }

  // ISO format "2026-06-10"
  const iso = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]));

  // Try native Date parse as last resort
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
  // Always show year on the end date so the user knows which year
  return `${start.toLocaleDateString('en-PH', o)} – ${end.toLocaleDateString('en-PH', oYear)}`;
}

// ── Entity extractors ─────────────────────────────────────────────────────────

function extractAmount(text) {
  const c = text.replace(/,/g, '');
  let m;
  m = c.match(/₱\s*(\d+(?:\.\d{1,2})?)/i);           if (m) return parseFloat(m[1]);
  m = c.match(/(\d+(?:\.\d{1,2})?)\s*(?:piso|peso|php)/i); if (m) return parseFloat(m[1]);
  m = c.match(/(?:spend|spent|paid|pay|add|log)\s+(\d+(?:\.\d{1,2})?)/i); if (m) return parseFloat(m[1]);
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
  let m = text.match(/(\d+)\s*(?:day|araw)/i);  if (m) return parseInt(m[1]);
  m = text.match(/(\d+)\s*night/i);             if (m) return parseInt(m[1]);
  m = text.match(/^\s*(\d{1,2})\s*$/);          if (m) return parseInt(m[1]);
  return null;
}

// ── Read-only handlers ────────────────────────────────────────────────────────

async function showBudget() {
  const s = await getBudgetSummary('1');
  const pct = s.total > 0 ? Math.round((s.spent / s.total) * 100) : 0;
  const lines = [
    `Here's your current budget:\n`,
    `💰 Total:     ${fmt(s.total)}`,
    `💸 Spent:     ${fmt(s.spent)} (${pct}%)`,
    `✅ Remaining: ${fmt(s.remaining)}`,
  ];
  if (s.breakdown.length > 0) {
    lines.push('\nTop categories:');
    s.breakdown.sort((a, b) => b.amount - a.amount).slice(0, 3)
      .forEach(b => lines.push(`• ${b.category}: ${fmt(b.amount)} (${b.percentage}%)`));
  }
  if (pct >= 90)      lines.push('\n⚠️ Almost at the limit! Stick to essentials.');
  else if (pct >= 70) lines.push('\n📌 Budget is getting tight. Prioritize must-dos.');
  else if (pct < 30)  lines.push('\n😊 Great pacing! Keep logging every expense.');
  return lines.join('\n');
}

async function showTrips() {
  const trips = await getTrips();
  if (!trips || trips.length === 0) {
    return `You have no trips yet!\n\nTry: "Plan a trip to Baguio for 3 days"`;
  }
  const list = trips.map(t => `${t.emoji || '✈️'} ${t.name}\n   📍 ${t.destination} · ${t.days} days`).join('\n\n');
  return `Your trips:\n\n${list}`;
}

function showTransport(t) {
  if (/jeepney/.test(t))    return `🚌 Jeepney — The king of the road\n\nFare: ₱13–₱15 minimum\n\nHow to ride:\n1. Flag it down — raise your hand\n2. Tell the driver your stop\n3. Pass fare forward to the driver\n4. Say "Para!" to stop\n\nTip: Keep small bills ready.`;
  if (/tricycle/.test(t))   return `🛺 Tricycle — Your neighborhood ride\n\nFare: ₱10–₱50 per person\n\nHow to ride:\n1. Flag one down anywhere\n2. Agree on fare before getting in\n3. Charter rate = 3–4x for the whole sidecar\n\nTip: Always negotiate the fare first.`;
  if (/ferry|boat/.test(t)) return `⛵ Ferry/Boat — For island hopping\n\nFare: ₱150–₱2,000+\n\nHow to ride:\n1. Buy ticket at the port terminal\n2. Arrive 30–45 min early\n3. Bring valid ID for boarding\n\nTip: Book in advance during peak season.`;
  if (/\bbus\b/.test(t))    return `🚍 Bus — Inter-provincial travel\n\nFare: ₱50–₱800\n\nMajor operators: Victory Liner, Partas, Ceres\n\nTip: Night buses save time and hotel cost.`;
  if (/van|fx|shuttle/.test(t)) return `🚐 Van/FX — Faster than buses\n\nFare: ₱80–₱500 per seat\nDeparts when full — no fixed schedule.\n\nTip: Go before 8 AM for most reliable trips.`;
  if (/habal/.test(t))      return `🏍️ Habal-Habal — Mountain roads motorcycle\n\nFare: ₱20–₱200\n\nEssential in remote areas and mountain barangays.\n\nTip: Always agree on fare before riding.`;
  return `Available transport in the Philippines:\n\n🚌 Jeepney — ₱13–₱15 (city routes)\n🛺 Tricycle — ₱10–₱50 (barangay)\n⛵ Ferry — ₱150–₱2,000+ (islands)\n🚍 Bus — ₱50–₱800 (inter-city)\n🚐 Van/FX — ₱80–₱500 (provincial)\n🏍️ Habal-Habal — ₱20–₱200 (mountain)\n\nAsk me about a specific one!`;
}

function showFood() {
  return `🍽️ Food tips:\n\n• Eat at local carinderias — cheap and authentic\n• Budget ₱100–₱250 per meal at local spots\n• Try lechon, sinigang, adobo for local flavors\n• Visit the palengke (wet market) for snacks\n• Mang Inasal and Jollibee are affordable go-tos`;
}

function showAccommodation() {
  return `🏨 Accommodation tips:\n\n• Guesthouses: ₱400–₱800/night\n• Hostels (solo): ₱200–₱500/bed\n• Book a week ahead in peak season (Dec–May)\n• Airbnb is great for group stays\n• Check if breakfast is included!`;
}

function showTips() {
  return `💡 Quick travel tips:\n\n• Always carry cash — many spots don't take cards\n• Exchange at Palawan Pawnshop for better rates\n• Keep ₱500 emergency fund\n• Haggling at markets is expected\n• Travel light — baggage fees drain the budget\n• Save your must-do stops in your itinerary early`;
}

function showDestination(t) {
  if (/baguio|benguet/.test(t))            return `🌲 Baguio\n\n• Burnham Park, Mines View, Session Road\n• Best ukay-ukay thrift shopping in PH\n• Budget: ₱600–₱1,000/day\n• Cool weather all year — pack a light jacket\n• Strawberry picking in La Trinidad nearby`;
  if (/siargao/.test(t))                   return `🏄 Siargao\n\n• Cloud 9 surf hub — lessons from ₱500\n• Sugba Lagoon kayaking: ₱500–₱800\n• Budget: ₱800–₱1,500/day\n• Habal-habal is the main transport`;
  if (/bohol|panglao|chocolate/.test(t))   return `🌿 Bohol\n\n• Chocolate Hills, Tarsier Sanctuary, Loboc River\n• Day tour packages: ₱600–₱1,200\n• Panglao beaches are mostly free\n• Budget: ₱1,000–₱1,800/day`;
  if (/coron|palawan|el nido/.test(t))     return `🏝️ Palawan\n\n• Kayangan Lake, Underground River, El Nido lagoons\n• Island hopping: ₱800–₱1,500/person\n• Signal can be weak on some islands — finalize plans before tours\n• Budget: ₱1,500–₱2,500/day`;
  if (/cebu/.test(t))                      return `🌊 Cebu\n\n• Kawasan Falls, Oslob whale sharks, Moalboal\n• Downtown: Magellan's Cross, Basilica\n• Budget: ₱800–₱1,500/day`;
  if (/davao/.test(t))                     return `🦅 Davao\n\n• Philippine Eagle Center, Eden Nature Park, Samal Island\n• Try durian — freshest here!\n• Budget: ₱700–₱1,200/day`;
  if (/boracay/.test(t))                   return `🏖️ Boracay\n\n• White Beach, Puka Beach, Station 1-3\n• Budget: ₱1,200–₱2,500/day\n• Avoid rainy season (Jun–Oct)\n• Environmental fee: ₱300 + terminal fee: ₱200`;
  return null;
}

function fallback(name) {
  return `I'm your offline travel buddy, ${name}! Here's what I can do:\n\n✏️ Log expenses — "Spent ₱200 on food"\n💰 Update budget — "Add ₱1,000 to my budget"\n✈️ Create trips — "Plan a trip to Baguio for 3 days"\n📊 Check budget — "How's my budget?"\n🧳 My trips — "Show my trips"\n🚌 Transport — "How do I ride a jeepney?"\n🌍 Destinations — "Tell me about Siargao"\n\nJust ask!`;
}

// ── Multi-turn continuation ───────────────────────────────────────────────────

async function continueFlow(t, raw, context) {
  const { intent, partialData, step } = context;

  // LOG_EXPENSE — waiting for category
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

  // CREATE_TRIP — waiting for destination
  if (intent === 'CREATE_TRIP' && step === 'destination') {
    const destination = titleCase(raw.trim());
    return {
      text: `A trip to ${destination}! 🎒\n\nHow many days is your trip?`,
      needsMore: { context: { intent: 'CREATE_TRIP', partialData: { destination }, step: 'days' } },
    };
  }

  // CREATE_TRIP — waiting for days
  if (intent === 'CREATE_TRIP' && step === 'days') {
    const days = extractDays(t) || (parseInt(t) > 0 && parseInt(t) < 365 ? parseInt(t) : null);
    if (!days) {
      return {
        text: `How many days is your trip? (e.g. "3 days" or just "3")`,
        needsMore: { context, question: 'days' },
      };
    }
    return {
      text: `Got it — ${days} day${days > 1 ? 's' : ''}! 📅\n\nWhen do you plan to start? (e.g. "June 10", "next Friday", "in 2 weeks", or "not sure yet")`,
      needsMore: {
        context: { intent: 'CREATE_TRIP', partialData: { ...partialData, days }, step: 'startDate' },
      },
    };
  }

  // CREATE_TRIP — waiting for start date
  if (intent === 'CREATE_TRIP' && step === 'startDate') {
    const { destination, days } = partialData;
    const notSure = /not sure|unsure|don't know|no idea|tbd|later|someday/.test(t);
    const startDate = notSure ? null : parseDateInput(raw);
    const dates = tripDates(startDate, days);
    const name = destination + ' Trip';
    return {
      text: `Here's what I'll create:\n\n✈️ ${name}\n📍 ${destination}\n📅 ${days} day${days > 1 ? 's' : ''} · ${dates}\n\nShall I add this to your trips?`,
      action: {
        intent: 'CREATE_TRIP',
        data: { name, destination, days, dates, emoji: '✈️' },
      },
    };
  }

  return { text: fallback('there') };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function parseMessage(input, userName = 'Lakbayero', context = null) {
  const t = input.toLowerCase().trim();

  // Multi-turn continuation
  if (context) return continueFlow(t, input, context);

  // ── Action: LOG_EXPENSE ────────────────────────────────────────────────────
  const isSpendWord = /spend|spent|paid|pay\s|bought|nagbayad|nagastos|gumastos/.test(t);
  const amount   = extractAmount(t);
  const category = extractCategory(t);

  if (isSpendWord && amount) {
    if (category) {
      return {
        text: `Got it! Here's what I'll log:\n\n💸 ${fmt(amount)} • ${category}\n\nShall I add this to your expenses?`,
        action: { intent: 'LOG_EXPENSE', data: { amount, category, note: '' } },
      };
    }
    return {
      text: `I'll log ${fmt(amount)}. What category is this for?\n\n• Food\n• Transport\n• Accommodation\n• Activities\n• Others`,
      needsMore: {
        context: { intent: 'LOG_EXPENSE', partialData: { amount }, step: 'category' },
      },
    };
  }

  // ── Action: ADD_TO_BUDGET ──────────────────────────────────────────────────
  if (/add\s+.*\bbudget\b|increase.*budget/.test(t) && amount) {
    return {
      text: `I'll add ${fmt(amount)} to your budget.\n\nConfirm?`,
      action: { intent: 'ADD_TO_BUDGET', data: { amount } },
    };
  }

  // ── Action: SET_BUDGET ─────────────────────────────────────────────────────
  if (/set.*budget|budget.*to\s+₱?\d|budget.*is\s+₱?\d/.test(t) && amount) {
    return {
      text: `I'll set your budget to ${fmt(amount)}.\n\nConfirm?`,
      action: { intent: 'SET_BUDGET', data: { amount } },
    };
  }

  // ── Action: CREATE_TRIP ────────────────────────────────────────────────────
  if (/create.*trip|plan.*trip|new.*trip|add.*trip/.test(t)) {
    const raw  = extractDestination(t);
    const dest = raw ? titleCase(raw) : null;
    const days = extractDays(t);

    if (dest && days) {
      return {
        text: `Got it — ${days} day${days > 1 ? 's' : ''} in ${dest}! 📅\n\nWhen do you plan to start? (e.g. "June 10", "next Friday", "in 2 weeks", or "not sure yet")`,
        needsMore: { context: { intent: 'CREATE_TRIP', partialData: { destination: dest, days }, step: 'startDate' } },
      };
    }
    if (dest) {
      return {
        text: `A trip to ${dest}! 🎒\n\nHow many days is your trip?`,
        needsMore: { context: { intent: 'CREATE_TRIP', partialData: { destination: dest }, step: 'days' } },
      };
    }
    return {
      text: `Let's plan a trip! 🎒\n\nWhere are you going?`,
      needsMore: { context: { intent: 'CREATE_TRIP', partialData: {}, step: 'destination' } },
    };
  }

  // ── Read-only handlers ─────────────────────────────────────────────────────

  if (contains(t, ['my trips', 'show trips', 'list trips', 'what trips', 'mga trip']))
    return { text: await showTrips() };

  if (contains(t, ['budget', 'how much', 'spending', 'gastos', 'remaining', 'expense', 'pera ko']))
    return { text: await showBudget() };

  if (contains(t, ['transport', 'jeepney', 'tricycle', 'ferry', 'bus', 'van', 'habal', 'ride', 'commute', 'travel by']))
    return { text: showTransport(t) };

  if (contains(t, ['food', 'eat', 'kain', 'restaurant', 'lunch', 'dinner', 'breakfast', 'where to eat']))
    return { text: showFood() };

  if (contains(t, ['hotel', 'hostel', 'stay', 'accommodation', 'sleep', 'overnight']))
    return { text: showAccommodation() };

  if (contains(t, ['tip', 'tips', 'advice', 'suggest', 'recommend', 'hack']))
    return { text: showTips() };

  const destInfo = showDestination(t);
  if (destInfo) return { text: destInfo };

  return { text: fallback(userName) };
}
