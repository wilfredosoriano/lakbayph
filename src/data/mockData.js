export const currentUser = {
  name: 'Lakbayero',
  level: 3,
  xp: 450,
  maxXp: 900,
};

export const upcomingTrip = {
  id: '1',
  title: 'Coron Island Escape',
  dates: 'May 20 – May 24, 2025',
  duration: '5 Days',
  location: 'Palawan',
  image: null,
  budget: {
    total: 20000,
    spent: 12450,
  },
  daysLeft: 3,
};

export const itinerary = [
  {
    day: 1,
    date: 'May 20',
    activities: [
      { time: '8:00 AM', title: 'Bus to Busuanga Port', subtitle: 'From Coron Town Proper', cost: 150, icon: 'bus' },
      { time: '10:30 AM', title: 'Ferry to Coron Island', subtitle: 'OceanJet Ferry', cost: 175, icon: 'boat' },
      { time: '1:00 PM', title: 'Island Hopping Tour', subtitle: 'Barracuda Lake, Kayangan Lake', cost: 1200, icon: 'island' },
      { time: '5:00 PM', title: 'Back to Coron Town', subtitle: 'Van Transfer', cost: 200, icon: 'car' },
    ],
    notes: ['Bring enough cash for environmental fees.', 'Signal is weak in island areas.', 'Respect local communities and nature.'],
  },
  {
    day: 2,
    date: 'May 21',
    activities: [
      { time: '7:00 AM', title: 'Breakfast at Local Carinderia', subtitle: 'Coron Town', cost: 120, icon: 'restaurant' },
      { time: '9:00 AM', title: 'Siete Pecados Marine Park', subtitle: 'Snorkeling', cost: 800, icon: 'island' },
      { time: '2:00 PM', title: 'Twin Lagoon', subtitle: 'Kayaking & Swimming', cost: 600, icon: 'island' },
      { time: '6:00 PM', title: 'Dinner at Coron Bay', subtitle: 'Seafood Restaurant', cost: 350, icon: 'restaurant' },
    ],
    notes: ['Bring reef-safe sunscreen.', 'Water shoes recommended.'],
  },
  {
    day: 3,
    date: 'May 22',
    activities: [
      { time: '8:00 AM', title: 'Mt. Tapyas Hike', subtitle: '724 steps to the top', cost: 0, icon: 'mountain' },
      { time: '11:00 AM', title: 'Coron Palawan Museum', subtitle: 'Local history & culture', cost: 50, icon: 'museum' },
      { time: '2:00 PM', title: 'Maquinit Hot Springs', subtitle: 'Natural saltwater hot spring', cost: 200, icon: 'spa' },
      { time: '5:30 PM', title: 'Sunset at Lualhati Park', subtitle: 'Free entry', cost: 0, icon: 'sunset' },
    ],
    notes: ['Wear comfortable shoes for hiking.', 'Bring water and snacks.'],
  },
  {
    day: 4,
    date: 'May 23',
    activities: [
      { time: '6:00 AM', title: 'Kayangan Lake', subtitle: 'Cleanest lake in Asia', cost: 400, icon: 'island' },
      { time: '10:00 AM', title: 'CYC Beach', subtitle: 'White sand beach', cost: 200, icon: 'beach' },
      { time: '1:00 PM', title: 'Banol Beach', subtitle: 'Picnic lunch', cost: 150, icon: 'beach' },
      { time: '4:00 PM', title: 'Return to Coron Town', subtitle: 'Boat transfer', cost: 200, icon: 'boat' },
    ],
    notes: ['Start early to avoid crowds.', 'Pack lunch for the beach.'],
  },
  {
    day: 5,
    date: 'May 24',
    activities: [
      { time: '8:00 AM', title: 'Check-out & Breakfast', subtitle: 'Hotel & local cafe', cost: 200, icon: 'hotel' },
      { time: '10:00 AM', title: 'Last-minute souvenir shopping', subtitle: 'Coron Public Market', cost: 500, icon: 'shop' },
      { time: '12:00 PM', title: 'Lunch at Don Gaspar Ave', subtitle: 'Local restaurant', cost: 250, icon: 'restaurant' },
      { time: '3:00 PM', title: 'Airport Transfer', subtitle: 'Van to Francisco B. Reyes Airport', cost: 300, icon: 'car' },
    ],
    notes: ['Keep receipts for budget tracking.', 'Arrive at airport 1.5 hrs early.'],
  },
];

export const recentDestinations = [
  { id: '1', name: 'Siargao', province: 'Surigao del Norte', imageKey: 'siargao' },
  { id: '2', name: 'Banaue', province: 'Ifugao', imageKey: 'banaue' },
  { id: '3', name: 'El Nido', province: 'Palawan', imageKey: 'elnido' },
  { id: '4', name: 'Baguio', province: 'Benguet', imageKey: 'baguio' },
  { id: '5', name: 'Bohol', province: 'Bohol', imageKey: 'bohol' },
  { id: '6', name: 'Sagada', province: 'Mountain Province', imageKey: 'sagada' },
  { id: '7', name: 'Vigan', province: 'Ilocos Sur', imageKey: 'vigan' },
];

export const supportedRegions = [
  { id: '1', regionKey: 'palawan', name: 'Palawan', subtitle: 'Coron, El Nido, Puerto Princesa', imageKey: 'coron' },
  { id: '2', regionKey: 'cebu', name: 'Cebu', subtitle: 'Cebu City, Moalboal, Bantayan', imageKey: 'bohol' },
  { id: '3', regionKey: 'siargao', name: 'Siargao Island', subtitle: 'General Luna, Dapa, Alegria', imageKey: 'siargao' },
  { id: '4', regionKey: 'batangas', name: 'Batangas', subtitle: 'Batangas City, Anilao, Nasugbu, Mabini', imageKey: 'baguio' },
  { id: '5', regionKey: 'bohol', name: 'Bohol', subtitle: 'Tagbilaran, Panglao, Loboc', imageKey: 'bohol' },
];

export const savedLocations = [
  { id: '1', name: 'Coron Town Proper', region: 'Palawan', starred: true },
  { id: '2', name: 'Kayangan Lake Viewpoint', region: 'Coron, Palawan', starred: true },
  { id: '3', name: 'Maasin River Spot', region: 'Siargao Island', starred: true },
  { id: '4', name: 'Cloud 9 Surfing Beach', region: 'Siargao Island', starred: false },
];

export const budgetData = {
  total: 20000,
  spent: 12450,
  remaining: 7550,
  breakdown: [
    { category: 'Transport', amount: 6200, percentage: 40, color: '#D62828', icon: 'bus' },
    { category: 'Food', amount: 3450, percentage: 22, color: '#F4A261', icon: 'restaurant' },
    { category: 'Activities', amount: 4000, percentage: 25, color: '#3B82F6', icon: 'compass' },
    { category: 'Accommodation', amount: 2800, percentage: 13, color: '#10B981', icon: 'bed' },
  ],
};

export const transportTypes = [
  {
    id: '1',
    name: 'Jeepney',
    description: 'The most iconic way to travel like a local.',
    avgCost: '₱9 – ₱15',
    action: 'View Routes',
    icon: 'jeepney',
  },
  {
    id: '2',
    name: 'Ferry',
    description: 'Island adventures made easy.',
    avgCost: '₱150 – ₱800',
    action: 'View Schedules',
    icon: 'ferry',
  },
  {
    id: '3',
    name: 'Bus',
    description: 'Travel across cities and provinces.',
    avgCost: '₱50 – ₱500',
    action: 'View Schedules',
    icon: 'bus',
  },
  {
    id: '4',
    name: 'Van / Shuttle',
    description: 'Convenient door-to-door shared transport.',
    avgCost: '₱80 – ₱300',
    action: 'View Options',
    icon: 'shuttle',
  },
];

export const chatMessages = [
  {
    id: '1',
    sender: 'bot',
    text: 'Kumusta, Lakbayero! 😊\nWhere do you want to go today? 😊',
    time: '09:41 AM',
  },
  {
    id: '2',
    sender: 'user',
    text: 'Best island hopping spots in Palawan?',
    time: '09:42 AM',
  },
  {
    id: '3',
    sender: 'bot',
    text: "Here are my top picks for you! ✨\n\n🏝️ Coron Island Hopping\n🌿 El Nido Tour A\n🌊 Honda Bay\n🐠 Balabac Islands\n\nAll beautiful, all worth it! 😊",
    time: '09:43 AM',
  },
];

export const quickTips = ['Budget tips', 'Itinerary help', 'Local food'];

export const premiumFeatures = [
  { icon: 'calendar', title: 'Advanced Trip Planner', subtitle: 'Plan complex itineraries with ease.' },
  { icon: 'restaurant', title: 'Curated Food Picks', subtitle: 'Find must-try meals and local favorites faster.' },
  { icon: 'analytics', title: 'Smart Budget Insights', subtitle: 'Detailed spending insights & tips.' },
  { icon: 'chatbubbles', title: 'Priority Travel Buddy', subtitle: 'Get faster & more detailed travel help.' },
  { icon: 'cloud-upload', title: 'Cloud Backup', subtitle: 'Keep your trips safe and synced.' },
];
