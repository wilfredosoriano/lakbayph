// Must-visit places database — Philippines
// Travel times are from each destination's main transport hub

export const PLACE_CATEGORIES = [
  { key: 'all',      label: 'All',      emoji: '🗺️' },
  { key: 'beach',    label: 'Beach',    emoji: '🏖️' },
  { key: 'nature',   label: 'Nature',   emoji: '🌿' },
  { key: 'food',     label: 'Food',     emoji: '🍜' },
  { key: 'landmark', label: 'Landmark', emoji: '🏛️' },
  { key: 'activity', label: 'Activity', emoji: '🎯' },
  { key: 'shopping', label: 'Shopping', emoji: '🛍️' },
];

export const TRAVEL_MODE_META = {
  walk:       { emoji: '🚶', label: 'Walk' },
  motorcycle: { emoji: '🛵', label: 'Motorcycle' },
  jeepney:    { emoji: '🚌', label: 'Jeepney' },
  van:        { emoji: '🚐', label: 'Van' },
  ferry:      { emoji: '⛵', label: 'Ferry' },
};

export const CATEGORY_TO_ACTIVITY = {
  beach:    'activity',
  nature:   'activity',
  food:     'food',
  landmark: 'activity',
  activity: 'activity',
  shopping: 'shop',
  hotel:    'accommodation',
};

export const PLACES_BY_DESTINATION = {

  // ── BANAUE ──────────────────────────────────────────────────────────────────
  Banaue: [
    {
      id: 'banaue-1',
      name: 'Batad Rice Terraces',
      category: 'nature',
      description: 'A UNESCO World Heritage amphitheater-shaped cluster of 2,000-year-old Ifugao rice terraces, more dramatic and immersive than the main Banaue viewpoint. Trekking down into the bowl-shaped valley and continuing to Tappiya Falls is one of the most rewarding day hikes in the Philippines.',
      mustVisit: true,
      entranceFee: 50,
      visitLength: '3 to 5 hrs',
      bestTimeToVisit: 'March to May or September to November for the greenest terraces',
      howToGetThere: 'From Manila, take an overnight bus to Banaue (9 to 10 hrs). From Banaue town, hire a tricycle to Saddle Point (PHP 800 to 1,000), then hike 15 to 30 min down into Batad village.',
      itineraryTip: 'Stay overnight in Batad village to watch sunrise over the terraces without day-tripper crowds — budget guesthouses cost PHP 300 to 500 per night.',
      coordinates: [121.0525, 16.9063],
      travel: { walk: null, motorcycle: null, jeepney: null, van: '9 to 10 hrs from Manila', ferry: null },
    },
  ],

  // ── SAGADA ──────────────────────────────────────────────────────────────────
  Sagada: [
    {
      id: 'sagada-1',
      name: 'Sumaguing Cave & Hanging Coffins',
      category: 'nature',
      description: 'Sagada\'s massive limestone cave system features dramatic stalactite chambers requiring bare-feet rappelling through underground pools. The nearby Echo Valley hanging coffins — a 2,000-year-old Igorot burial practice on cliff faces — are one of the most culturally distinct sights in the Philippines.',
      mustVisit: true,
      entranceFee: 110,
      visitLength: '2 to 4 hrs for cave, 1 hr for hanging coffins',
      bestTimeToVisit: 'November to May',
      howToGetThere: 'From Manila, take a bus to Baguio (6 hrs), then a GL Trans van to Sagada (4 to 5 hrs, PHP 200). A guide is mandatory — hire at the Sagada Tourism Office near the bus stop.',
      itineraryTip: 'Book the Sumaguing–Lumiang Cave Connection tour (PHP 800 to 1,000 per group) for the most adventurous version — do the hanging coffins walk the next morning at sunrise before tour groups arrive.',
      coordinates: [120.8975, 17.0844],
      travel: { walk: null, motorcycle: null, jeepney: null, van: '4 to 5 hrs from Baguio', ferry: null },
    },
  ],

  // ── CAGAYAN ─────────────────────────────────────────────────────────────────
  Cagayan: [
    {
      id: 'cagayan-1',
      name: 'Palaui Island',
      category: 'beach',
      description: 'A protected island off Luzon\'s northeastern tip with virgin white-sand coves, jungle trails to the Spanish-era Cape Engano Lighthouse, and crystal Pacific waters virtually untouched by mass tourism. Consistently ranked among the most beautiful islands in Southeast Asia.',
      mustVisit: true,
      entranceFee: 50,
      visitLength: '1 full day to 2 days',
      bestTimeToVisit: 'March to June for calmest seas',
      howToGetThere: 'Fly to Tuguegarao (1 hr from Manila), then take a bus or van to Santa Ana (3 hrs). From Santa Ana, tricycle to San Vicente Port (15 min), then hire a boat to the island (PHP 500 to 3,000 depending on route).',
      itineraryTip: 'Hire a combination tour boat covering Anguib Beach and Cape Engano Lighthouse (PHP 3,000 per boat, up to 6 pax) — bring all food and water as the island has no stores.',
      coordinates: [122.137, 18.5483],
      travel: { walk: null, motorcycle: null, jeepney: null, van: '3 hrs from Tuguegarao', ferry: '20 min from San Vicente Port' },
    },
  ],

  // ── RIZAL ───────────────────────────────────────────────────────────────────
  Rizal: [
    {
      id: 'rizal-1',
      name: 'Masungi Georeserve',
      category: 'nature',
      description: 'An award-winning conservation area in the Sierra Madre foothills featuring spider-web rope nets, hammock viewpoints, and suspension bridges over dramatic limestone karst formations. One of the most iconic and ecologically significant experiences near Metro Manila.',
      mustVisit: true,
      entranceFee: 1500,
      visitLength: '3 to 4 hrs',
      bestTimeToVisit: 'Year-round; weekdays to avoid crowds',
      howToGetThere: 'Located at KM 47 Marilaque Highway, Baras, Rizal — about 1.5 to 2 hrs from Metro Manila by private vehicle. By public transport: jeepney from Cubao to Cogeo Gate 2, then jeepney toward Tanay.',
      itineraryTip: 'Online reservations are mandatory with a minimum group of 7 — book weeks in advance on weekends as slots sell out fast.',
      coordinates: [121.274, 14.5366],
      travel: { walk: null, motorcycle: null, jeepney: '2 hrs from Cubao', van: '1.5 hrs from Manila', ferry: null },
    },
    {
      id: 'rizal-2',
      name: 'Mt. Daraitan & Tinipak River',
      category: 'activity',
      description: 'A rewarding day hike up a 739-meter limestone peak in the Sierra Madre with panoramic jungle views, followed by a wade through the striking white marble rock formations of Tinipak River. One of the best adventure day trips from Manila.',
      mustVisit: true,
      entranceFee: 100,
      visitLength: '5 to 8 hrs',
      bestTimeToVisit: 'November to May',
      howToGetThere: 'From Cubao, ride a van to Tanay Public Market (2 hrs, PHP 70), then a tricycle to Barangay Daraitan (PHP 300 one-way). Register at the Barangay Hall before the hike.',
      itineraryTip: 'Summit Mt. Daraitan in the morning, then descend and cool off in Tinipak River in the afternoon — guides lead both and it is typically included in the same package.',
      coordinates: [121.4388, 14.6135],
      travel: { walk: null, motorcycle: null, jeepney: '2 hrs from Cubao', van: '2 hrs from Manila', ferry: null },
    },
  ],

  // ── ABRA ────────────────────────────────────────────────────────────────────
  Abra: [
    {
      id: 'abra-1',
      name: 'Kaparkan Falls',
      category: 'nature',
      description: 'A jaw-dropping series of terraced travertine waterfalls hidden deep in the Cordillera mountains of Abra — often called the Philippines\' Plitvice. The turquoise tiered pools surrounded by lush forest are accessible only by 4x4 and trekking, keeping it beautifully undiscovered.',
      mustVisit: true,
      entranceFee: 300,
      visitLength: '4 to 6 hrs including travel from Bangued',
      bestTimeToVisit: 'July to October when falls are fullest',
      howToGetThere: 'From Manila, take a bus to Bangued, Abra (8 hrs). From Bangued, the only access is via hired 4x4 monster truck to Sitio Kaparkan (3 hrs), then a 15 to 20 min trek. Book through the Abra Tourism Office.',
      itineraryTip: 'Book the full package through the Abra Tourism Office (approx. PHP 1,500 to 2,000 per person all-in for a group) — they handle 4x4, guide, and permits.',
      coordinates: [117.8, 17.6],
      travel: { walk: null, motorcycle: null, jeepney: null, van: '3 hrs from Bangued via 4x4', ferry: null },
    },
  ],

  // ── ILOCOS NORTE ────────────────────────────────────────────────────────────
  'Ilocos Norte': [
    {
      id: 'ilocos-norte-1',
      name: 'Kabigan Falls',
      category: 'nature',
      description: 'A 90-foot emerald-green waterfall tucked inside a forest reserve in Pagudpud, reached by a gentle 30 to 40 minute flat trail through rice paddies and streams. One of northern Luzon\'s most refreshing and crowd-free waterfall experiences.',
      mustVisit: true,
      entranceFee: 20,
      visitLength: '2 to 3 hrs',
      bestTimeToVisit: 'December to June',
      howToGetThere: 'Pagudpud is 3 hrs north of Laoag City by bus or van. From Laoag, take a bus to Pagudpud and alight at Barangay Balaoi. Local guides are available at the barangay outpost — a guide is required (PHP 100).',
      itineraryTip: 'Pair with Patapat Viaduct and Bangui Wind Farm on the same Ilocos Norte northern loop — all three are along the same coastal highway.',
      coordinates: [120.5644, 18.5472],
      travel: { walk: null, motorcycle: '30 min from Pagudpud town', jeepney: null, van: '3 hrs from Laoag', ferry: null },
    },
  ],

  // ── ZAMBALES ────────────────────────────────────────────────────────────────
  Zambales: [
    {
      id: 'zambales-1',
      name: 'Nagsasa Cove',
      category: 'beach',
      description: 'A quiet volcanic-ash sand cove backed by the remains of Mt. Pinatubo\'s 1991 lahar flows, offering dramatic scenery and some of the cleanest waters in Central Luzon. Far less visited than nearby Anawangin, making it perfect for overnight camping.',
      mustVisit: true,
      entranceFee: 100,
      visitLength: '1 full day or overnight',
      bestTimeToVisit: 'March to June',
      howToGetThere: 'From Manila, take a Victory Liner bus to San Antonio, Zambales (4 to 5 hrs). Tricycle to Pundaquit (PHP 40), then hire a boat (PHP 1,800 per small boat up to 4 pax) for the 30 to 40 min crossing.',
      itineraryTip: 'Bring all food, fresh water, and a tent — there are zero facilities on the cove. Overnight camping under stars with zero light pollution is the highlight.',
      coordinates: [120.0669, 15.0108],
      travel: { walk: null, motorcycle: null, jeepney: null, van: '4 to 5 hrs from Manila', ferry: '30 min from Pundaquit' },
    },
  ],

  // ── QUEZON ──────────────────────────────────────────────────────────────────
  Quezon: [
    {
      id: 'quezon-1',
      name: 'Cagbalete Island',
      category: 'beach',
      description: 'A quiet island off the Pacific coast of Quezon province with one of the longest tidal flats in the Philippines — at low tide you can walk nearly a kilometer into the sea on a sandbar that stretches to the horizon. Virtually no tourist development makes it feel genuinely off-grid.',
      mustVisit: false,
      entranceFee: 50,
      visitLength: '1 full day or overnight',
      bestTimeToVisit: 'March to May; visit during low tide for the tidal flats',
      howToGetThere: 'From Manila, take a JAC Liner or Genesis bus to Mauban, Quezon (3.5 to 4 hrs). From Mauban Port, boats depart for the island at 10AM and 4PM (PHP 120 per person, 40 min).',
      itineraryTip: 'Check tide tables before going — the iconic kilometer-long tidal flats only appear at low tide, so plan your beach time around low tide windows.',
      coordinates: [122.22, 14.19],
      travel: { walk: null, motorcycle: null, jeepney: null, van: '3.5 to 4 hrs from Manila', ferry: '40 min from Mauban Port' },
    },
  ],

  // ── LEYTE ───────────────────────────────────────────────────────────────────
  Leyte: [
    {
      id: 'leyte-1',
      name: 'Kalanggaman Island',
      category: 'beach',
      description: 'A perfect sliver of white sand stretching 750 meters in both directions from a palm-fringed center point, surrounded by turquoise water and vivid coral reefs — frequently called the most photogenic sandbar in the Philippines. No resort development keeps it pristine.',
      mustVisit: true,
      entranceFee: 150,
      visitLength: '1 full day',
      bestTimeToVisit: 'March to June',
      howToGetThere: 'From Cebu City North Pier, take a ferry to Palompon, Leyte (5 to 6 hrs). Coordinate with the Palompon Eco-Tourism Office for a 1-hr pump boat to the island. Alternatively, join a day tour from Maya Port, North Cebu (PHP 1,500 to 2,500 all-in).',
      itineraryTip: 'Arrive by 8AM before other bangkas crowd the sandbar — snorkeling gear is worth bringing as the reef drop-off right off the sandbar tip has excellent visibility.',
      coordinates: [124.3297, 11.3858],
      travel: { walk: null, motorcycle: null, jeepney: null, van: null, ferry: '1 hr from Palompon, or day tour from Maya Port North Cebu' },
    },
  ],

  // ── SIQUIJOR ────────────────────────────────────────────────────────────────
  Siquijor: [
    {
      id: 'siquijor-1',
      name: 'Cambugahay Falls',
      category: 'nature',
      description: 'Three tiers of electric-turquoise cascading freshwater pools fringed by jungle in the mystical healing island of Siquijor. Rope swings and bamboo rafts above the pools make it one of the most fun natural swimming spots in the Visayas.',
      mustVisit: true,
      entranceFee: 20,
      visitLength: '1.5 to 3 hrs',
      bestTimeToVisit: 'November to May; mornings to avoid crowds',
      howToGetThere: 'Siquijor is reached by fast ferry from Dumaguete (30 min, PHP 180) or from Cebu (3.5 hrs). From Siquijor port, rent a scooter (PHP 250 to 500 per day) and drive 30 min to Lazi town.',
      itineraryTip: 'Rent a motorbike for the whole day and combine with Salagdoong Beach cliff jumping and Paliton Beach sunset in a single Siquijor island loop.',
      coordinates: [123.6369, 9.1703],
      travel: { walk: null, motorcycle: '30 min from Siquijor port', jeepney: null, van: null, ferry: '30 min from Dumaguete' },
    },
    {
      id: 'siquijor-2',
      name: 'Salagdoong Beach',
      category: 'beach',
      description: 'A government-managed emerald-water beach in Siquijor with two cliff-jumping platforms at 5 meters and 10 meters — one of the most thrilling affordable beach experiences in the Visayas. The beach also has excellent snorkeling and a small forested park.',
      mustVisit: true,
      entranceFee: 50,
      visitLength: '2 to 4 hrs',
      bestTimeToVisit: 'March to May; mornings for calm water',
      howToGetThere: 'From Siquijor port, rent a scooter (PHP 300 per day) and drive approximately 40 minutes northeast to the town of Maria, then 3 km north to the beach.',
      itineraryTip: 'Combine with Cambugahay Falls in the morning and Paliton Beach at sunset in a single scooter day loop around the island.',
      coordinates: [123.6811, 9.2125],
      travel: { walk: null, motorcycle: '40 min from Siquijor port', jeepney: null, van: null, ferry: '30 min from Dumaguete' },
    },
  ],

  // ── NEGROS ORIENTAL ─────────────────────────────────────────────────────────
  'Negros Oriental': [
    {
      id: 'negros-1',
      name: 'Apo Island Marine Sanctuary',
      category: 'activity',
      description: 'A small volcanic island 30 km south of Dumaguete with one of Asia\'s most celebrated community-managed marine sanctuaries — snorkelers and divers routinely encounter 5 to 6 sea turtles within the first 15 minutes in the water. The coral is remarkably intact and teeming with fish.',
      mustVisit: true,
      entranceFee: 100,
      visitLength: '1 full day',
      bestTimeToVisit: 'March to June for calmest seas and best visibility',
      howToGetThere: 'From Dumaguete, take a jeepney or bus south to Malatapay Port near Dauin (40 min, PHP 20). Boats to Apo Island depart daily around 8 to 9AM (30 min). Organized day tours from Dumaguete cost PHP 1,500 to 2,500 all-in.',
      itineraryTip: 'Book a snorkeling guide at Turtle Point (PHP 300) for guaranteed close encounters — guides know the turtles\' feeding routes and significantly improve your experience.',
      coordinates: [123.2683, 9.0786],
      travel: { walk: null, motorcycle: null, jeepney: '40 min from Dumaguete', van: null, ferry: '30 min from Malatapay Port' },
    },
  ],

  // ── ILOILO ──────────────────────────────────────────────────────────────────
  Iloilo: [
    {
      id: 'iloilo-1',
      name: 'Islas de Gigantes',
      category: 'beach',
      description: 'A cluster of rugged limestone islands in the Visayan Sea known for powder-white beaches, a freshwater lagoon, bat caves, and the freshest scallops eaten straight off the boat. One of the most underrated island groups in the entire Visayas.',
      mustVisit: true,
      entranceFee: 75,
      visitLength: '1 to 2 full days',
      bestTimeToVisit: 'March to June',
      howToGetThere: 'From Iloilo City, take a Ceres Liner bus or van to Carles town (3 to 4 hrs, PHP 190). Tricycle to Bancal Port (15 min), then public pump boat to Gigantes Norte (45 min to 1 hr, PHP 100).',
      itineraryTip: 'Hire a private island-hopping boat at the port (PHP 3,500 to 6,000 per boat) for a customized loop of Cabugao Gamay Island, Antonia Beach, and Bantigue Sandbar in one day.',
      coordinates: [122.6714, 11.4836],
      travel: { walk: null, motorcycle: null, jeepney: null, van: '3 to 4 hrs from Iloilo City', ferry: '45 min from Bancal Port' },
    },
  ],

  // ── GUIMARAS ────────────────────────────────────────────────────────────────
  Guimaras: [
    {
      id: 'guimaras-1',
      name: 'Guimaras Island',
      category: 'nature',
      description: 'Home to what is internationally certified as the sweetest mango in the world, this quiet island near Iloilo also features the only Trappist monastery in the Philippines and a scenic wind farm. A perfect slow-travel day trip from Iloilo City.',
      mustVisit: false,
      entranceFee: 0,
      visitLength: '1 full day',
      bestTimeToVisit: 'March to May for peak mango season',
      howToGetThere: 'From Iloilo City, take a jeepney or tricycle to Parola Wharf and board a pump boat to Jordan Wharf, Guimaras (15 to 20 min, PHP 35). From Jordan, rent a tricycle or motorbike for the day (PHP 500 to 800).',
      itineraryTip: 'Visit in April to May for the Manggahan Festival and buy a whole kilo of Guimaras mangoes at the port to bring home.',
      coordinates: [122.5968, 10.5928],
      travel: { walk: null, motorcycle: null, jeepney: null, van: null, ferry: '15 to 20 min from Iloilo City' },
    },
  ],

  // ── SURIGAO DEL NORTE ───────────────────────────────────────────────────────
  'Surigao del Norte': [
    {
      id: 'surigao-norte-1',
      name: 'Sohoton Cove & Jellyfish Sanctuary',
      category: 'nature',
      description: 'A hidden emerald lagoon accessible only through a dramatic limestone arch at high tide, featuring a stingless jellyfish sanctuary where you can swim among thousands of golden jellyfish. The cathedral-like cave interior and lagoon color are unlike anything else in the Philippines.',
      mustVisit: true,
      entranceFee: 800,
      visitLength: '1 full day',
      bestTimeToVisit: 'March to May; entry requires high tide',
      howToGetThere: 'Most visitors come as a day trip from Siargao Island. From General Luna, drive to Dapa Port then boat to Socorro (1.5 to 2 hrs). Joiner tours from Siargao cost PHP 2,300 to 3,100 per person.',
      itineraryTip: 'Confirm the high tide window the night before — cove access closes when the tide drops. Tours depart Siargao by 6AM to ensure enough time inside.',
      coordinates: [125.9317, 9.9036],
      travel: { walk: null, motorcycle: null, jeepney: null, van: null, ferry: '1.5 to 2 hrs from Dapa Port, Siargao' },
    },
  ],

  // ── WESTERN SAMAR ───────────────────────────────────────────────────────────
  'Western Samar': [
    {
      id: 'w-samar-1',
      name: 'Langun-Gobingob Cave System',
      category: 'activity',
      description: 'The largest cave system in the Philippines and one of the largest in Southeast Asia, spanning nearly 3,000 hectares of dramatic underground chambers and ancient river passages. A genuine spelunking expedition — not a casual tourist cave.',
      mustVisit: false,
      entranceFee: 3500,
      visitLength: '1 full day',
      bestTimeToVisit: 'March to May; caves can flood in heavy rain',
      howToGetThere: 'From Catbalogan, Western Samar, take a bus to Calbiga town (1.5 hrs). From Calbiga, ride motorbikes to the jump-off in Brgy. Panayuran, then hike 1 hr to the entrance. All tours must be booked through Trexplore Adventures in Catbalogan.',
      itineraryTip: 'Book at least 2 weeks ahead with Trexplore Adventures — they supply all gear, food, guides, and permits, and limit group sizes to preserve the cave.',
      coordinates: [125.0256, 11.5747],
      travel: { walk: null, motorcycle: '1.5 hrs from Calbiga', jeepney: null, van: '1.5 hrs from Catbalogan', ferry: null },
    },
  ],

  // ── CAMIGUIN ────────────────────────────────────────────────────────────────
  Camiguin: [
    {
      id: 'camiguin-1',
      name: 'White Island',
      category: 'beach',
      description: 'An uninhabited crescent-shaped sandbar 1.4 km off Camiguin\'s northern coast with postcard views of the active Mt. Hibok-Hibok volcano rising directly behind it. The surrounding tidal flats change shape with the tide, making every visit slightly different.',
      mustVisit: true,
      entranceFee: 50,
      visitLength: '2 to 3 hrs',
      bestTimeToVisit: 'March to June; visit during low tide when the sandbar is fully exposed',
      howToGetThere: 'Camiguin is reached from Cagayan de Oro via bus to Balingoan Port (1 hr), then ferry to Benoni Port (1 hr, PHP 200). From Mambajao, tricycle to the White Island Ferry Terminal in Yumbing (10 min), then a 10-min pump boat (PHP 550 per boat round-trip).',
      itineraryTip: 'Check low tide tables before going — pair the morning sandbar visit with an afternoon snorkel at the Sunken Cemetery nearby.',
      coordinates: [124.6533, 9.255],
      travel: { walk: null, motorcycle: '10 min from Mambajao', jeepney: null, van: '1 hr from Cagayan de Oro to Balingoan', ferry: '10 min from Yumbing terminal' },
    },
    {
      id: 'camiguin-2',
      name: 'Sunken Cemetery',
      category: 'landmark',
      description: 'An entire 19th-century cemetery submerged beneath the sea after the 1871 Camiguin volcanic eruption, marked above water by a dramatic giant white cross on hardened lava. Snorkeling over the submerged graves and old church ruins is a hauntingly beautiful and uniquely Filipino experience.',
      mustVisit: true,
      entranceFee: 150,
      visitLength: '1 to 2 hrs',
      bestTimeToVisit: 'March to June for dry calm seas and best underwater visibility',
      howToGetThere: 'From Mambajao, take a 20 to 25 min tricycle or shared van to Catarman along the circumferential road. Boats and snorkeling gear are available at the shoreline viewpoint.',
      itineraryTip: 'Visit late afternoon when the giant cross is silhouetted against the sunset — combine with Ardent Hot Springs on the same south-circumferential loop.',
      coordinates: [124.6167, 9.1747],
      travel: { walk: null, motorcycle: '20 min from Mambajao', jeepney: null, van: '20 min from Mambajao', ferry: '10 min by bangka from shore' },
    },
  ],

  // ── SURIGAO DEL SUR ─────────────────────────────────────────────────────────
  'Surigao del Sur': [
    {
      id: 'surigao-sur-1',
      name: 'Hinatuan Enchanted River',
      category: 'nature',
      description: 'A mysteriously deep spring river flowing directly into the Pacific with water so intensely blue-green it appears artificially colored. Its seemingly bottomless depth and unexplained salinity despite being inland have earned it genuine mythical status among Filipinos.',
      mustVisit: true,
      entranceFee: 100,
      visitLength: '2 to 3 hrs',
      bestTimeToVisit: 'March to May; arrive by 9AM before the daily noon fish-feeding frenzy',
      howToGetThere: 'Fly to Butuan City (1.5 hrs from Manila), then take a van to Hinatuan town (4 to 5 hrs). From Hinatuan town, ride a habal-habal to the river (8 km, PHP 300 to 600 round-trip).',
      itineraryTip: 'The daily fish feeding at noon is spectacular — swimming in the river before noon gives you calmer and clearer water.',
      coordinates: [126.35478, 8.45882],
      travel: { walk: null, motorcycle: '15 min from Hinatuan town', jeepney: null, van: '4 to 5 hrs from Butuan City', ferry: null },
    },
  ],

  // ── ILIGAN ──────────────────────────────────────────────────────────────────
  Iligan: [
    {
      id: 'iligan-1',
      name: 'Tinago Falls',
      category: 'nature',
      description: 'A 240-foot emerald waterfall hidden 500 steps down inside a deep forested gorge — "Tinago" literally means hidden in Visayan. The pool at the base is large enough for swimming, and the steep jungle descent gives the entire experience an adventurous, earned quality.',
      mustVisit: true,
      entranceFee: 65,
      visitLength: '2 to 3 hrs',
      bestTimeToVisit: 'Year-round; November to May for more stable weather',
      howToGetThere: 'Fly to Laguindingan Airport near Cagayan de Oro, then van or bus to Iligan City (1.5 to 2 hrs). From Iligan, ride a multicab to Buru-un (PHP 12), then habal-habal to the falls trailhead (PHP 50 to 80). Over 500 steps lead down to the base.',
      itineraryTip: 'Combine with Maria Cristina Falls in the same morning since both are in Iligan — together they make up the city\'s famous City of Majestic Waterfalls identity.',
      coordinates: [124.185992, 8.15929],
      travel: { walk: null, motorcycle: '20 min from Iligan City', jeepney: '20 min from Iligan City', van: '1.5 hrs from Cagayan de Oro', ferry: null },
    },
  ],

  // ── NORTH COTABATO ──────────────────────────────────────────────────────────
  'North Cotabato': [
    {
      id: 'cotabato-1',
      name: 'Asik-Asik Falls',
      category: 'nature',
      description: 'A uniquely wide curtain waterfall 70 meters across where water appears to seep directly from a lush vegetation-covered cliff face, creating a wall of mist and green. Unlike any other waterfall in the Philippines — the water has no apparent source stream, emerging entirely from the cliff.',
      mustVisit: true,
      entranceFee: 30,
      visitLength: '2 to 3 hrs',
      bestTimeToVisit: 'November to May; confirm the site is open before visiting',
      howToGetThere: 'Fly to Cotabato City (1 hr from Manila), then van to Midsayap (1.5 hrs, PHP 60). From Midsayap, van or jeepney to Alamada town, then habal-habal to the falls (1.5 hrs).',
      itineraryTip: 'Check current status with the North Cotabato tourism office before visiting — the falls was closed for renovation in late 2023 and access restrictions may still apply.',
      coordinates: [124.6161, 7.3808],
      travel: { walk: null, motorcycle: '1.5 hrs from Alamada town', jeepney: '1.5 hrs from Midsayap', van: '3 hrs from Cotabato City', ferry: null },
    },
  ],

  // ── DAVAO ORIENTAL ──────────────────────────────────────────────────────────
  'Davao Oriental': [
    {
      id: 'davao-oriental-1',
      name: 'Aliwagwag Falls Eco Park',
      category: 'nature',
      description: 'A protected eco-park containing over 84 individual tiered cascades dropping down a 1.1 km stretch of the Cateel River — with a combined height of 340 meters it holds the world record for the greatest number of falls in a single river system. Almost entirely unknown to international tourists.',
      mustVisit: false,
      entranceFee: 100,
      visitLength: '2 to 4 hrs',
      bestTimeToVisit: 'November to May',
      howToGetThere: 'Fly to Davao City, then take a bus or van from Ecoland Terminal to Cateel via Compostela Valley (3 hrs, PHP 350). From Cateel town, tricycle to the Eco Park (13 km, PHP 150 to 200).',
      itineraryTip: 'Rent a bamboo raft (PHP 150 to 200) to drift alongside the lower cascades — the zipline (PHP 200) gives a bird\'s-eye view of the whole system.',
      coordinates: [126.4628, 7.7036],
      travel: { walk: null, motorcycle: null, jeepney: null, van: '3 hrs from Davao City', ferry: null },
    },
  ],

  // ── SIARGAO ─────────────────────────────────────────────────────────────────
  Siargao: [
    {
      id: 'siargao-1',
      name: 'Sugba Lagoon',
      category: 'nature',
      description: 'A massive mangrove-fringed emerald lagoon near Siargao Island, offering kayaking, cliff jumping from a wooden platform, and some of the most painterly water colors in the Philippines. Far more accessible than a typical island-hopping trip yet feels genuinely remote.',
      mustVisit: true,
      entranceFee: 100,
      visitLength: '3 to 5 hrs',
      bestTimeToVisit: 'March to May; the lagoon closes January 10 to February 10 for environmental rehabilitation',
      howToGetThere: 'From General Luna, Siargao, rent a scooter (PHP 350 per day) and drive 45 min to Del Carmen Tourism Center. Hire a boat from the pier to the lagoon. Joiner tours from General Luna (PHP 600 to 900) include boat and transport.',
      itineraryTip: 'Book a transparent kayak (PHP 500) for the most spectacular view of the lagoon floor — arrive before 9AM when the water is glassiest and the light is best.',
      coordinates: [126.0325, 9.7895],
      travel: { walk: null, motorcycle: '45 min from General Luna', jeepney: null, van: null, ferry: null },
    },
  ],

  // ── PUERTO PRINCESA ─────────────────────────────────────────────────────────
  'Puerto Princesa': [
    {
      id: 'puerto-1',
      name: 'Puerto Princesa Underground River',
      category: 'nature',
      description: 'A UNESCO World Heritage Site and one of the New Seven Wonders of Nature — a navigable underground river 8.2 km long flowing through a spectacular cavern system directly into the sea. The most significant natural landmark in the Philippines.',
      mustVisit: true,
      entranceFee: 735,
      visitLength: '3 to 5 hrs including travel from Puerto Princesa',
      bestTimeToVisit: 'November to May',
      howToGetThere: 'Fly to Puerto Princesa Airport, then van from San Jose Terminal to Sabang village (1.5 to 2 hrs, PHP 120 to 160). From Sabang pier, a pump boat takes you to the cave entrance (10 min).',
      itineraryTip: 'Book permits online at least a week in advance — walk-in slots are extremely limited. Day tours from Puerto Princesa (PHP 800 to 1,200 all-in) handle all logistics.',
      coordinates: [117.8831, 10.1775],
      travel: { walk: null, motorcycle: null, jeepney: null, van: '1.5 to 2 hrs from Puerto Princesa City', ferry: '10 min from Sabang pier' },
    },
    {
      id: 'puerto-2',
      name: 'Nagtabon Beach',
      category: 'beach',
      description: 'A wild, undeveloped 2 km arc of white sand on Palawan\'s west coast backed by jungle-covered hills and fronted by calm clear waters — arguably the most beautiful free beach near Puerto Princesa City with no resort development in sight.',
      mustVisit: true,
      entranceFee: 0,
      visitLength: '3 to 5 hrs',
      bestTimeToVisit: 'November to May',
      howToGetThere: 'From Puerto Princesa City, take a bus bound for El Nido or Roxas and alight at Bacungan (30 to 40 min, PHP 30). From Bacungan, hire a tricycle to the beach road (PHP 60). By private vehicle: 45 min drive via the coastal road.',
      itineraryTip: 'Pair with a mangrove kayak rental from a local operator at the beach (PHP 200 to 300 per hr) — the mangrove channels behind the beach are pristine and virtually tourist-free.',
      coordinates: [118.645, 9.9342],
      travel: { walk: null, motorcycle: null, jeepney: null, van: '45 min from Puerto Princesa City', ferry: null },
    },
  ],

};

export function getDestinationImage(destKey) {
  const places = PLACES_BY_DESTINATION[destKey] || [];
  const best = places.find(p => p.mustVisit) || places[0];
  if (!best) return null;
  return { id: best.id, uri: null };
}

export function matchDestination(destination) {
  if (!destination) return null;
  const d = destination.toLowerCase();
  if (d.includes('banaue') || d.includes('batad') || d.includes('ifugao'))                                     return 'Banaue';
  if (d.includes('sagada') || d.includes('sumaguing') || d.includes('mountain province'))                      return 'Sagada';
  if (d.includes('cagayan') || d.includes('palaui') || d.includes('santa ana') || d.includes('tuguegarao'))    return 'Cagayan';
  if (d.includes('rizal') || d.includes('masungi') || d.includes('daraitan') || d.includes('tinipak') || d.includes('tanay')) return 'Rizal';
  if (d.includes('abra') || d.includes('kaparkan') || d.includes('bangued') || d.includes('tineg'))            return 'Abra';
  if (d.includes('ilocos norte') || d.includes('kabigan') || d.includes('pagudpud') || d.includes('laoag'))    return 'Ilocos Norte';
  if (d.includes('zambales') || d.includes('nagsasa') || d.includes('san antonio') || d.includes('pundaquit')) return 'Zambales';
  if (d.includes('quezon') || d.includes('cagbalete') || d.includes('mauban'))                                 return 'Quezon';
  if (d.includes('leyte') || d.includes('kalanggaman') || d.includes('palompon'))                              return 'Leyte';
  if (d.includes('siquijor') || d.includes('cambugahay') || d.includes('salagdoong') || d.includes('lazi'))   return 'Siquijor';
  if (d.includes('negros') || d.includes('apo island') || d.includes('dumaguete') || d.includes('dauin'))     return 'Negros Oriental';
  if (d.includes('iloilo') || d.includes('gigantes') || d.includes('carles'))                                  return 'Iloilo';
  if (d.includes('guimaras'))                                                                                   return 'Guimaras';
  if (d.includes('surigao del norte') || d.includes('sohoton') || d.includes('socorro') || d.includes('bucas')) return 'Surigao del Norte';
  if (d.includes('western samar') || d.includes('langun') || d.includes('gobingob') || d.includes('calbiga')) return 'Western Samar';
  if (d.includes('camiguin') || d.includes('mambajao') || d.includes('white island') || d.includes('sunken cemetery')) return 'Camiguin';
  if (d.includes('surigao del sur') || d.includes('hinatuan') || d.includes('enchanted river'))                return 'Surigao del Sur';
  if (d.includes('iligan') || d.includes('tinago') || d.includes('lanao'))                                     return 'Iligan';
  if (d.includes('cotabato') || d.includes('asik') || d.includes('alamada'))                                   return 'North Cotabato';
  if (d.includes('davao oriental') || d.includes('aliwagwag') || d.includes('cateel'))                         return 'Davao Oriental';
  if (d.includes('siargao') || d.includes('sugba') || d.includes('general luna') || d.includes('del carmen'))  return 'Siargao';
  if (d.includes('puerto princesa') || d.includes('palawan') || d.includes('underground river') || d.includes('nagtabon') || d.includes('sabang')) return 'Puerto Princesa';
  return null;
}
