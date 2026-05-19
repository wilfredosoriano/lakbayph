/**
 * Local rule-based tip engine — offline, no API.
 * Tips are kept short (≤60 chars) to fit 2 lines in the bubble.
 */

const RULES = [
  {
    priority: 1,
    condition: ({ spent }) => spent === 0,
    tips: [
      "Add your first expense to get personalized tips!",
      "Start tracking now — every peso counts!",
    ],
  },
  {
    priority: 2,
    condition: ({ pct }) => pct >= 100,
    tips: [
      "Over budget! Cut back on non-essentials now.",
      "Budget exceeded! Adjust your total or reduce spending.",
    ],
  },
  {
    priority: 3,
    condition: ({ pct }) => pct >= 90,
    tips: [
      "Almost at your limit! Stick to essentials only.",
      "Very little left — avoid impulse purchases!",
    ],
  },
  {
    priority: 4,
    condition: ({ breakdown }) => getCategoryPct(breakdown, 'Transport') > 45,
    tips: [
      "Transport is high! Try jeepneys for short routes.",
      "Book ferries online in advance — it's cheaper!",
    ],
  },
  {
    priority: 5,
    condition: ({ breakdown }) => getCategoryPct(breakdown, 'Food') > 35,
    tips: [
      "Food spending is high! Try local carinderias.",
      "Buy snacks at palengke — way cheaper than stores!",
    ],
  },
  {
    priority: 6,
    condition: ({ breakdown }) => getCategoryPct(breakdown, 'Accommodation') > 35,
    tips: [
      "Accommodation cost is high! Try guesthouses.",
      "Book a week ahead for better accommodation rates.",
    ],
  },
  {
    priority: 7,
    condition: ({ breakdown }) => getCategoryPct(breakdown, 'Activities') > 35,
    tips: [
      "Activities adding up! Many PH beaches are free.",
      "Join group tours — much cheaper than going solo!",
    ],
  },
  {
    priority: 8,
    condition: ({ pct }) => pct >= 20 && pct < 50,
    tips: [
      "Great pace! Keep tracking to stay on budget.",
      "Tip: Always carry cash — many spots don't take cards.",
      "Set aside 10% of budget as your emergency fund.",
    ],
  },
  {
    priority: 9,
    condition: ({ pct }) => pct >= 50 && pct < 70,
    tips: [
      "Halfway through! Review your biggest expense.",
      "Try a free beach or park to save on activities.",
      "Haggling at local markets is expected — go for it!",
    ],
  },
  {
    priority: 10,
    condition: ({ pct }) => pct >= 70 && pct < 90,
    tips: [
      "Budget tight! Prioritize must-do experiences.",
      "Stick to free activities for the rest of your trip.",
      "Refill water at stations — saves vs buying bottles.",
    ],
  },
  {
    priority: 11,
    condition: ({ remaining }) => remaining > 0 && remaining < 500,
    tips: [
      "Under ₱500 left — be very selective now!",
      "Almost out! Focus on meals and essentials only.",
    ],
  },
  {
    priority: 12,
    condition: ({ breakdown }) => breakdown.length >= 4,
    tips: [
      "Balanced spending — great planning, Lakbayero!",
      "Spending across all areas. Keep it balanced!",
    ],
  },
  {
    priority: 99,
    condition: () => true,
    tips: [
      "Always keep an emergency fund for surprises!",
      "Exchange money at Palawan Pawnshop for better rates.",
      "Travel light — baggage fees can quietly drain you.",
      "Lock in your must-do stops before each travel day.",
      "Eat where locals eat — cheaper and tastier!",
    ],
  },
];

function getCategoryPct(breakdown = [], category) {
  const found = breakdown.find(b => b.category === category);
  return found ? found.percentage : 0;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getLakbayTip(summary) {
  if (!summary) return "Start tracking to get personalized tips!";

  const pct     = summary.total > 0 ? Math.round((summary.spent / summary.total) * 100) : 0;
  const context = { ...summary, pct };

  const matched = RULES
    .sort((a, b) => a.priority - b.priority)
    .find(rule => rule.condition(context));

  return matched ? pickRandom(matched.tips) : "Keep tracking — every peso counts!";
}
