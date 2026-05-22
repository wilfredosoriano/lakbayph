/**
 * addDescriptions.js
 *
 * Adds descriptions to every place in places_filtered.json
 * and writes a clean places_gist.json ready to paste into GitHub Gist.
 *
 * Run: node scripts/addDescriptions.js
 */

const fs   = require('fs');
const path = require('path');

const INPUT  = path.join(__dirname, 'output/places_filtered.json');
const OUTPUT = path.join(__dirname, 'output/places_gist.json');

// ── Hand-crafted descriptions for well-known places ───────────────────────────
// Key format: "Destination|Place Name"  (exact match, case-sensitive)

const KNOWN = {

  // ── ANGELES ──────────────────────────────────────────────────────────────────
  'Angeles|Museum of Angeles City':
    'The city museum showcasing the history and culture of Angeles City, including its colonial past and transformation into a modern urban center.',
  'Angeles|Museum of Philippine Social History':
    'A museum dedicated to Philippine social history, with exhibits on labor movements, community development, and the everyday lives of Filipinos across different eras.',
  'Angeles|Bayanihan Park':
    'A community park in Angeles City named after the Filipino spirit of bayanihan — collective effort and cooperation — offering open green space for recreation and relaxation.',
  'Angeles|Artillery Memorial':
    'A military memorial in Angeles City honoring artillery units that served in the defense of the Philippines, positioned near the historic Clark military base area.',

  // ── ANTIPOLO ─────────────────────────────────────────────────────────────────
  'Antipolo|Pintô Art Museum':
    'One of the Philippines\' finest private art museums, set across beautifully landscaped gardens in Antipolo. Features rotating exhibitions of contemporary Filipino visual art across multiple gallery spaces.',
  'Antipolo|Hinulugang Taktak Protected Landscape':
    'A protected natural landscape built around a scenic waterfall that once drew visitors from across Rizal province. The surrounding park offers tree-lined paths and picnic areas.',
  'Antipolo|Ninoy Aquino Freedom Park':
    'A public park in Antipolo named after Benigno "Ninoy" Aquino Jr., offering open green space and recreational facilities for residents and visitors.',
  'Antipolo|Simbahan ng Lumang Bosoboso':
    'The ruins of a colonial-era church in old Bosoboso, Antipolo, that stand as a testament to the area\'s early Spanish missionary history.',

  // ── BAGUIO ───────────────────────────────────────────────────────────────────
  'Baguio|Burnham Park':
    'The iconic heart of Baguio City, designed by American architect Daniel Burnham. The park features a man-made lake with rowboat rentals, cycling paths, rose garden, and wide lawns — the go-to gathering place for locals and tourists alike.',
  'Baguio|Mines View Park':
    'Baguio\'s most-visited lookout point, offering sweeping views of the Cordillera mountain ranges and the abandoned gold and copper mines of Itogon below. Lined with souvenir stalls selling Cordillera handicrafts and a popular spot for photo-worthy traditional Igorot costume rentals.',
  'Baguio|Mine\'s View Park View Deck':
    'The main view deck at Mines View Park, perched on the rim of the mountains overlooking the old mining town of Itogon and the vast Cordillera landscape — best visited in the morning before clouds roll in.',
  'Baguio|Wright Park':
    'A classic Baguio attraction famous for its Pool of Pines — a long reflecting pool flanked by towering pine trees. The adjacent paddock offers horseback riding, making it a favorite for families and first-time Baguio visitors.',
  'Baguio|Lion\'s Head':
    'An iconic roadside landmark on Kennon Road — a massive concrete lion\'s head carved into the mountainside. A popular photo stop on the winding road up to Baguio.',
  'Baguio|Tam-Awan Village':
    'A living cultural village and artist colony recreating a traditional Cordillera Ifugao and Kalinga highland community. Features authentic huts, an art gallery, resident artists, and stunning views of the Benguet mountains — a peaceful escape from the city.',
  'Baguio|Museo Kordilyera':
    'The main ethnographic museum of the Cordillera region, housed within the University of the Philippines Baguio campus. Features fascinating exhibits on the indigenous peoples, traditions, weaving, and artifacts of the highland tribes.',
  'Baguio|Cathedral of Our Lady of Atonement':
    'Baguio\'s main cathedral, commonly called the Baguio Cathedral, perched on a hill above Session Road. The pink-and-white twin-spired church is one of the most photographed landmarks in the city.',
  'Baguio|Bell Amphitheater':
    'An open-air amphitheater inside Camp John Hay, once a US military rest and recreation facility, now used for concerts, cultural events, and outdoor performances amidst the pine forests.',
  'Baguio|Laperal White House':
    'A well-preserved colonial mansion known locally for ghost stories and its elegant American colonial architecture. One of the few surviving heritage houses in Baguio from the early 20th century.',
  'Baguio|Igorot Stone Kingdom':
    'A cultural theme park celebrating Igorot heritage through life-sized dioramas, stone structures, and indigenous exhibits. Offers an immersive look into Cordillera tribal traditions, architecture, and mythology.',
  'Baguio|SLU Museum of Igorot Cultures & Arts':
    'A small but curated museum at Saint Louis University dedicated to the arts, crafts, and material culture of the Igorot peoples of the Cordillera — featuring baskets, weapons, jewelry, and ceremonial items.',
  'Baguio|Baguio Museum':
    'The city\'s main public museum tracing Baguio\'s history from its pre-colonial indigenous roots through its transformation into the summer capital of the Philippines.',
  'Baguio|Camp John Hay Art Park':
    'An outdoor sculpture garden and arts space within the former US military base of Camp John Hay. Peaceful pine-shaded paths lead past contemporary works by Filipino artists.',
  'Baguio|Arko Ni Apo Art Gallery':
    'A contemporary art gallery in Baguio showcasing works by local and national Filipino artists, with rotating exhibitions and a mission to support the Baguio arts community.',
  'Baguio|Good Shepherd Sisters Convent':
    'Home of the Good Shepherd Sisters who produce Baguio\'s most beloved pasalubong: ube jam, strawberry jam, and peanut brittle. The convent grounds are serene, and the products are sold at the gate — always a long queue.',
  'Baguio|Good Shepherd Convent View Deck':
    'A quiet viewpoint on the grounds of the Good Shepherd Convent offering a peaceful panoramic view of the city and surrounding mountains.',
  'Baguio|Pink Sisters\' Convent and Chapel':
    'Home of the Discalced Carmelite Sisters, known as the "Pink Sisters" for their rose-colored habits. The chapel is open to visitors for prayer, and the sisters maintain a tradition of perpetual adoration.',
  'Baguio|Maryknoll Ecological Sanctuary':
    'A forested ecological sanctuary managed by the Maryknoll sisters, offering nature walks through pine forests and gardens maintained for environmental education and spiritual reflection.',
  'Baguio|General Emilio Aguinaldo Museum':
    'A museum dedicated to General Emilio Aguinaldo, the first President of the Philippines, featuring historical artifacts, photographs, and documents relating to the Philippine Revolution and early republic.',
  'Baguio|PMA':
    'The Philippine Military Academy\'s museum at Fort del Pilar preserves the history of the armed forces and the storied tradition of Baguio\'s premier military institution — also known as the "West Point of Asia."',
  'Baguio|Kennon Road View Deck':
    'A scenic pull-off along the winding Kennon Road, one of three mountain roads leading to Baguio, offering breathtaking views of deep gorges, pine-covered slopes, and distant valley towns.',
  'Baguio|SM City Baguio Balcony':
    'The open-air balcony of SM City Baguio offers a surprisingly beautiful panoramic view of the city below — a beloved local spot for sunset watching and city photography, and it\'s completely free.',
  'Baguio|SM City Baguio Sky Terrace':
    'An elevated open terrace at SM City Baguio with 360-degree views of the mountain city, popular for sunset photos and cool evening breezes.',
  'Baguio|Mansion House':
    'The official summer residence of Philippine presidents since the American colonial era, this stately mansion on Leonard Wood Road features manicured gardens and colonial architecture — open to visitors on select days.',
  'Baguio|Panagbenga Park':
    'A public park in Baguio City dedicated to the Panagbenga (Flower Festival), held every February. The park features flower-themed landscaping and serves as a staging area for the famous float parade.',
  'Baguio|Filipino Japanese Friendship Park':
    'A serene garden park symbolizing the post-war friendship between the Philippines and Japan, maintained with Japanese-inspired landscaping and a monument to bilateral ties.',
  'Baguio|Air Force Park':
    'A small park featuring decommissioned Philippine Air Force aircraft on display, offering a hands-on look at vintage military planes and serving as an open-air tribute to the country\'s air defense history.',
  'Baguio|Japanese War Memorial':
    'A World War II memorial inside Camp John Hay honoring those who perished during the Japanese occupation of Baguio. A sobering reminder of the city\'s role as a wartime headquarters.',
  'Baguio|Relics Point (WW 2)':
    'A collection of World War II relics and ruins within Camp John Hay, marking spots that saw significant activity during the Japanese occupation and liberation of Baguio in 1945.',
  'Baguio|Cathedral of the Resurrection':
    'The Episcopal cathedral in Baguio City, offering a more intimate and spiritually reflective alternative to the main Roman Catholic cathedral. The surrounding gardens are peaceful and well-kept.',
  'Baguio|Irisan Dog Head':
    'A naturally shaped rock formation in Irisan, Baguio that resembles a dog\'s head in profile — a quirky roadside landmark and an easy photo stop along the Marcos Highway.',

  // ── BATAC ────────────────────────────────────────────────────────────────────
  'Batac|Marcos Museum':
    'A museum dedicated to the life and legacy of former President Ferdinand Marcos, born in Batac. Features personal artifacts, official documents, gifts from foreign dignitaries, and exhibits on his administration.',
  'Batac|Marcos Mausoleum':
    'The refrigerated mausoleum where the preserved body of former President Ferdinand Marcos is displayed in a glass case. A deeply polarizing landmark that draws both supporters and curious visitors.',
  'Batac|Marcos Monument':
    'A large monument to Ferdinand Marcos in his hometown of Batac, Ilocos Norte — the center of Marcos country, where admiration for the former president remains strong among locals.',
  'Batac|Ricarte National Shrine':
    'A national shrine dedicated to General Artemio Ricarte, a hero of the Philippine Revolution. The grounds preserve the general\'s ancestral home and military memorabilia.',
  'Batac|General Ricarte Park':
    'A public park in Batac honoring General Artemio Ricarte, offering shaded paths and a peaceful place for reflection near the national shrine.',

  // ── BATANGAS ─────────────────────────────────────────────────────────────────
  'Batangas|Museo ng Batangas':
    'The provincial museum of Batangas, housed in a colonial-era building in Batangas City. Features exhibits on the province\'s pre-colonial gold-trading culture, Spanish-era history, and notable Batangueño figures.',
  'Batangas|Masilungan Ancestral House':
    'A well-preserved ancestral house in Batangas City dating from the Spanish colonial period, now protected as a cultural heritage site and a fine example of Filipino-Spanish domestic architecture.',

  // ── BUTUAN ───────────────────────────────────────────────────────────────────
  'Butuan|Museo de Balanghai':
    'A national museum in Butuan housing ancient balangay boats — the oldest recovered watercraft in Southeast Asia, dating back to 320 AD. An essential stop for understanding the seafaring origins of Philippine civilization.',
  'Butuan|Balangay Shrine Museum':
    'The site where multiple balangay (ancient wooden boats) were excavated, now preserved as a shrine and open-air museum. A landmark archaeological site that rewrote Philippine prehistory.',
  'Butuan|Shell Midden - Museo de Balanghai Field Museum':
    'A field museum at the balanghai archaeological site displaying shell middens and excavated artifacts that reveal how ancient Butuanon communities lived along the Agusan River.',
  'Butuan|National Museum of the Philippines - Butuan':
    'The regional branch of the National Museum in Butuan, featuring Mindanao archaeological finds, ethnographic collections, and exhibits on the Agusan River civilization.',
  'Butuan|Bood Promontory and Eco Park':
    'A scenic coastal eco-park on a promontory overlooking Butuan Bay and the Agusan River delta, offering nature trails, picnic areas, and panoramic views of the Mindanao coastline.',
  'Butuan|Bit-os Rock':
    'A distinctive rock formation in Butuan known for its unique shape and spiritual significance to local communities, also offering views of the surrounding coastal landscape.',

  // ── CABANATUAN ───────────────────────────────────────────────────────────────
  'Cabanatuan|Camp Pangatian Memorial Shrine':
    'A solemn memorial marking the site of the Cabanatuan POW Camp, where thousands of American and Filipino prisoners were held by Japanese forces during WWII. The Cabanatuan Raid — one of the most daring rescue missions in military history — took place here in 1945.',

  // ── CAGAYAN DE ORO ────────────────────────────────────────────────────────────
  'Cagayan De Oro|Museum of Three Cultures':
    'A cultural museum in Cagayan de Oro celebrating the three major cultural influences of Mindanao: the indigenous Lumad peoples, the Muslim communities, and the Christian settlers — showcasing how they coexist in Northern Mindanao.',
  'Cagayan De Oro|City Museum of Cagayan de Oro':
    'The city museum documenting the history and development of Cagayan de Oro, from its indigenous roots to becoming the regional center of Northern Mindanao, with exhibits on local heritage and civic achievements.',
  'Cagayan De Oro|Amaya View':
    'A popular scenic viewpoint on the hills above Cagayan de Oro offering panoramic views of the city, Macajalar Bay, and the surrounding mountain landscape — best visited at sunrise or sunset.',
  'Cagayan De Oro|Kibanog':
    'A highland viewpoint offering sweeping views of the Cagayan de Oro valley and coastline, accessible via a short hike through farmland and forested terrain.',
  'Cagayan De Oro|Gaston Park':
    'The central plaza and park of Cagayan de Oro, a lively gathering space in the heart of the city surrounded by heritage buildings, the city hall, and local commerce.',

  // ── CALAMBA ──────────────────────────────────────────────────────────────────
  'Calamba|Rizal Shrine':
    'The preserved ancestral home of Dr. Jose Rizal, Philippine national hero, in his hometown of Calamba, Laguna. The house, reconstructed on the original site, displays personal belongings, furniture, and early writings from the Rizal family.',
  'Calamba|Birthplace of Jose Rizal':
    'The exact site where Jose Rizal was born on June 19, 1861, now marked as a national shrine. The surrounding Rizal Shrine complex includes the family home, gardens, and a heritage museum.',

  // ── CARCAR ───────────────────────────────────────────────────────────────────
  'Carcar|Saint Catherine of Alexandria Parish':
    'A centuries-old Baroque church in Carcar, Cebu, declared a National Cultural Treasure. Its massive coral stone facade and intact Spanish colonial interiors make it one of the best-preserved historical churches in the Visayas.',
  'Carcar|Balay na Tisa (Sarmiento–Osmeña House)':
    'A century-old ancestral house in Carcar built of tisa (fired clay bricks), now a heritage landmark and museum. One of the finest surviving examples of 19th-century Filipino domestic architecture in Cebu.',
  'Carcar|Silva National Heritage House':
    'A declared National Cultural Treasure, this ancestral house in Carcar dates to the 19th century and features original furnishings, vintage family photographs, and well-preserved colonial-era architecture.',

  // ── CEBU ─────────────────────────────────────────────────────────────────────
  'Cebu|Fort San Pedro':
    'The oldest and smallest fort in the Philippines, built in 1565 by Miguel López de Legazpi as a triangular defensive structure against raids. Now a beautifully maintained heritage site with a well-kept garden and a small museum.',
  'Cebu|Church and Convent of Santo Niño':
    'The oldest Roman Catholic church in the Philippines, built in 1565 on the site where Magellan planted the Cross and gave the Santo Niño image to Queen Juana. Home to the miraculous icon of the Santo Niño de Cebu — the center of the Sinulog Festival.',
  'Cebu|Basilica Minore del Santo Niño de Cebu Museum':
    'The museum within the Basilica del Santo Niño complex displaying a collection of gifts and offerings to the miraculous Santo Niño image, along with exhibits on the 500-year history of Christianity in the Philippines.',
  'Cebu|The Cross of Magellan':
    'A hollow wooden cross enshrining the original cross planted by Ferdinand Magellan in 1521 when he baptized Cebu\'s Raja Humabon and Queen Juana. One of the most significant historical and religious sites in the Philippines.',
  'Cebu|National Museum of the Philippines - Cebu':
    'The Cebu regional branch of the National Museum, featuring collections on Cebuano and Visayan history, pre-colonial trade, maritime heritage, and important archaeological discoveries from the region.',
  'Cebu|Plaza Independencia':
    'A historic public park in the heart of Cebu City, built on the grounds of Fort San Pedro. Contains monuments, manicured gardens, and walking paths — a popular weekend destination with sweeping views of the harbor.',
  'Cebu|Fort of San Pedro':
    'The centuries-old triangular Spanish fort defending Cebu\'s shoreline, now beautifully restored with heritage gardens and a small museum inside the fortified walls.',
  'Cebu|Rajah Humabon Monument':
    'A monument honoring Rajah Humabon, the Cebuano king who welcomed Ferdinand Magellan in 1521 and was among the first Filipinos to be baptized into Christianity.',

  // ── DAVAO ────────────────────────────────────────────────────────────────────
  'Davao|Philippine Eagle Center':
    'A world-class breeding and conservation center for the Philippine Eagle, the country\'s national bird and one of the largest and most powerful eagles on earth. Home to over 30 eagles in spacious forested enclosures — a must-visit for wildlife lovers.',
  'Davao|People\'s Park':
    'A sprawling 5-hectare urban park in the center of Davao City featuring indigenous Lumad-inspired sculptures, fountains, manicured gardens, and a children\'s playground — the city\'s most popular family gathering space.',
  'Davao|Davao Crocodile Park & Zoo':
    'A wildlife park home to the largest population of saltwater crocodiles in the Philippines, plus exotic birds, snakes, and other wildlife. Offers a close-up crocodile encounter experience unique to Davao.',
  'Davao|Davao Butterfly House':
    'A tropical butterfly sanctuary housing hundreds of colorful butterfly species native to Mindanao. Walk through lush gardens where butterflies land freely on flowers and visitors.',
  'Davao|Museo Dabawenyo':
    'The city museum of Davao documenting the city\'s multicultural heritage — from its indigenous B\'laan and Mandaya communities to the Japanese settlers and Christian migrants who shaped modern Davao.',
  'Davao|National Museum of the Philippines - Davao':
    'The Davao regional branch of the National Museum, with exhibits on Mindanao archaeology, ethnography, and the natural sciences — highlighting Davao\'s role in the biodiversity and cultural richness of Mindanao.',
  'Davao|Philippine-Japan Historical Museum':
    'A small but poignant museum in Davao exploring the complex history of Japanese influence in Davao — from early Japanese agricultural settlers before WWII to the wartime occupation and postwar reconciliation.',
  'Davao|Catigan View Deck':
    'A scenic view deck above the Catigan hills offering panoramic views of Davao City, Mount Apo, and the Davao Gulf — one of the most photogenic highland vantage points near the city.',
  'Davao|Roxas Night Market':
    'A beloved open-air night market along Roxas Avenue in Davao City, famous for grilled pork barbecue skewers sold by weight, fresh seafood, and street food — the definitive Davao night-out experience.',
  'Davao|Magsaysay Park':
    'A waterfront park along Davao City\'s bayside with views of the Davao Gulf. Features open lawn areas, food kiosks, and a peaceful setting for sunset watching and leisurely strolls.',
  'Davao|National Bird Breeding Sanctuary':
    'A government-run sanctuary dedicated to breeding and rehabilitating Philippine Eagles and other endangered endemic birds of Mindanao, supporting conservation efforts for the country\'s most iconic wildlife.',
  'Davao|Datu Bago Gallery':
    'A cultural gallery honoring Datu Bago, the legendary chieftain who resisted Spanish colonization in Davao. Features artworks and exhibits on the indigenous heritage and warrior traditions of Davao.',
  'Davao|Mindanao Folk Arts Museum':
    'A small museum dedicated to the folk arts and crafts of Mindanao\'s diverse indigenous communities, featuring traditional textiles, carvings, jewelry, and musical instruments.',

  // ── ILOILO ───────────────────────────────────────────────────────────────────
  'Iloilo|Museo Iloilo':
    'The main provincial museum of Iloilo housed in an elegant Art Deco building, featuring an impressive collection of pre-colonial gold artifacts, Spanish-era religious art, and exhibits on the heritage and culture of the Visayas.',
  'Iloilo|National Museum of the Philippines - Iloilo':
    'The Iloilo regional branch of the National Museum, displaying Visayan archaeological finds, indigenous artifacts, and exhibits connecting Iloilo\'s heritage to wider Philippine history.',
  'Iloilo|Iloilo Maritime Museum':
    'A specialized museum exploring Iloilo\'s seafaring heritage, featuring historical vessels, navigation tools, and exhibits on the city\'s role as one of the Philippines\' most important trading ports.',
  'Iloilo|Museum of Philippine Maritime History':
    'A museum dedicated to the rich maritime heritage of the Philippines, with Iloilo as its base — exploring ancient boat-building traditions, trade routes, and the role of the sea in Philippine civilization.',
  'Iloilo|Museum of Philippine Economic History':
    'A museum tracing the economic development of the Philippines through artifacts, photographs, and documents related to trade, agriculture, and industry — with Iloilo\'s sugar industry prominently featured.',
  'Iloilo|Jaro Belfry':
    'The freestanding belltower of Jaro Cathedral, a distinctive landmark in the Jaro district of Iloilo. Built in the 17th century and a symbol of Iloilo\'s colonial religious heritage.',
  'Iloilo|Lizares Mansion':
    'An opulent colonial-era mansion built by the wealthy Lizares family, one of Iloilo\'s powerful sugar barons. The European-influenced architecture reflects the prosperity of the sugar trade era.',
  'Iloilo|Lopez Heritage House':
    'The ancestral house of the prominent Lopez family, one of Iloilo\'s most influential dynasties. The heritage house preserves Spanish-era domestic architecture and antique furnishings.',
  'Iloilo|Science XPdition Iloilo':
    'An interactive science museum in Iloilo City featuring hands-on exhibits designed to make science accessible and fun for all ages — a great family-friendly destination.',
  'Iloilo|Iloilo Customs House':
    'A heritage building that served as the main customs house when Iloilo was one of Southeast Asia\'s most active trading ports in the 19th century. A fine example of neoclassical colonial architecture.',
  'Iloilo|San Jose Church':
    'A historic Augustinian parish church in Iloilo City, one of the oldest religious structures in the region, known for its thick coral stone walls and Spanish Baroque facade.',
  'Iloilo|Plaza Libertad':
    'The historic central plaza of Iloilo City, surrounded by heritage buildings and serving as a hub of civic life since the Spanish colonial era. Named to commemorate Philippine independence.',
  'Iloilo|Rosendo Mejica Museum and Historical Landmark':
    'A heritage museum in Iloilo dedicated to Rosendo Mejica, a leader of the Iloilo labor movement. The site preserves the history of workers\' rights advocacy in the Visayas.',
  'Iloilo|Arevalo Sinamay House':
    'A gallery and workshop in the Arevalo district of Iloilo where the traditional craft of sinamay weaving from abaca fiber is preserved and demonstrated — a living example of Ilonggo textile heritage.',

  // ── LAKE SEBU ────────────────────────────────────────────────────────────────
  'Lake Sebu|Lang Dulay Weaving Center':
    'The workshop of the late National Living Treasure Lang Dulay, master weaver of the T\'boli people, known for creating t\'nalak — a sacred dreamwoven cloth made from abaca without any drawn pattern. Her granddaughters continue the tradition here.',
  'Lake Sebu|House of Gongs':
    'A cultural center in Lake Sebu dedicated to the gong music traditions of the T\'boli and other indigenous peoples of South Cotabato. Features a collection of traditional instruments and live cultural demonstrations.',

  // ── LAOAG ────────────────────────────────────────────────────────────────────
  'Laoag|Museo Ilocos Norte':
    'The provincial museum of Ilocos Norte housed in the historic Tabacalera warehouse, featuring exhibits on the pre-colonial, colonial, and modern history of the Ilocos region — including tobacco industry artifacts.',

  // ── LOS BAÑOS ────────────────────────────────────────────────────────────────
  'Los Baños|Makiling Botanic Gardens':
    'One of the largest botanical gardens in Asia, located at the foot of Mount Makiling and managed by the University of the Philippines. Features diverse native Philippine plant species, rare orchids, and peaceful forest trails.',
  'Los Baños|UPLB Museum of Natural History':
    'The natural history museum of UP Los Baños, housing a comprehensive collection of Philippine flora and fauna specimens, fossils, and ecological research exhibits that highlight the country\'s extraordinary biodiversity.',
  'Los Baños|Riceworld':
    'A museum at the International Rice Research Institute (IRRI) dedicated entirely to rice — its history, cultivation, cultural significance, and the science of developing rice varieties that feed the world.',
  'Los Baños|National Arts Center':
    'A performing arts center on the slopes of Mount Makiling managed by the Cultural Center of the Philippines, serving as a venue for national arts education programs and cultural events amid a forested setting.',
  'Los Baños|Japanese Garden':
    'A serene Japanese-style garden on the UP Los Baños campus, featuring koi ponds, stone lanterns, and manicured greenery — a tranquil space for relaxation and contemplation.',
  'Los Baños|UPLB CFNR Alumni Forest and Nature Park':
    'A research forest and nature park managed by the College of Forestry and Natural Resources at UP Los Baños, open to visitors for nature walks through secondary growth forest.',
  'Los Baños|Site of the Internment Camp at Los Baños':
    'A historical marker on the site of the Los Baños Internment Camp, where over 2,000 Allied civilian prisoners were held during WWII. The Los Baños Raid in 1945 freed all internees in one of the most successful rescue operations in military history.',

  // ── LUCBAN ───────────────────────────────────────────────────────────────────
  'Lucban|Hermano Pule Shrine':
    'A shrine and park honoring Apolinario de la Cruz, known as "Hermano Pule," a lay religious leader who led one of the earliest Filipino uprisings against Spanish colonial rule in the 1840s. A symbol of early Philippine resistance.',
  'Lucban|La Casa De Doña Ana':
    'A beautifully preserved ancestral mansion in Lucban, Quezon, reflecting the town\'s prosperous past during the Spanish colonial era. The house\'s architecture blends Filipino-Spanish elements with fine wooden details.',

  // ── LUCENA ───────────────────────────────────────────────────────────────────
  'Lucena|Perez Park':
    'The main public park in Lucena City, a pleasant green space in the heart of the capital of Quezon province, used for community events, leisurely walks, and weekend gatherings.',

  // ── MAGDIWANG ────────────────────────────────────────────────────────────────
  'Magdiwang|Lambingan Falls':
    'A picturesque waterfall in the mountains of Magdiwang, Sibuyan Island, accessible via a jungle trek. The crystal-clear cascades pool into a natural swimming hole — a reward for the hike.',
  'Magdiwang|Natural Pool (Pawala River)':
    'A natural swimming pool formed by the Pawala River in Magdiwang, with cold, clear mountain water flowing through smooth boulders — a refreshing natural dip popular with locals and adventurous visitors.',
  'Magdiwang|Magdiwang Boat Ride':
    'A scenic boat tour around the waters of Magdiwang on Sibuyan Island, one of the Philippines\' most isolated and ecologically pristine islands, known for its extraordinary biodiversity.',
  'Magdiwang|Ikaduha Fish Sanctuary (2nd Shoal)':
    'A protected marine sanctuary off the coast of Magdiwang on Sibuyan Island, known for healthy coral reefs and abundant marine life — a superb snorkeling destination for those who make the journey to this remote island.',
  'Magdiwang|roadside view of Mt.Guiting-Guiting':
    'A roadside viewpoint offering an unobstructed look at Mount Guiting-Guiting, the rugged and technically challenging volcano that dominates Sibuyan Island — considered one of the hardest climbs in the Philippines.',

  // ── MAKATI ───────────────────────────────────────────────────────────────────
  'Makati|Ayala Museum':
    'One of Manila\'s premier museums, located in the heart of the Ayala Center. Features dioramas of Philippine history, a collection of pre-colonial gold artifacts, and rotating exhibitions on Filipino art and culture.',
  'Makati|Yuchengco Museum':
    'A private museum in the RCBC Plaza featuring a world-class collection of East Asian and Southeast Asian artworks, including paintings, ceramics, and decorative arts from the Yuchengco collection.',
  'Makati|Nielson Tower':
    'A landmark Art Deco building in Ayala Triangle that served as Manila\'s first commercial airport control tower in the 1930s. Now a heritage site and event venue at the center of Makati\'s financial district.',
  'Makati|Ayala Triangle Gardens':
    'A beautifully landscaped park at the center of the Ayala Center complex, used for events, markets, and the famous Christmas lights festival that transforms the trees into a dazzling annual spectacle.',
  'Makati|Legazpi Active Park':
    'A lively weekend market and park in Legazpi Village, Makati, hosting the popular Legazpi Sunday Market where organic produce, artisan food, and crafts are sold amid a lively urban park atmosphere.',
  'Makati|Salcedo Park':
    'A popular urban park in the upscale Salcedo Village neighborhood, hosting the well-known Salcedo Saturday Market — one of the best weekend farmers\' markets in Metro Manila.',
  'Makati|Museo ng Makati':
    'The city museum of Makati documenting the transformation of what was once a swampy Manila suburb into the financial capital of the Philippines, with exhibits on the Ayala family\'s role in developing the area.',
  'Makati|Saints Peter and Paul Parish Church':
    'The historic parish church of Makati Poblacion, one of the oldest religious sites in the city, built during the Spanish era and still an active place of worship in the heart of old Makati.',

  // ── MALOLOS ──────────────────────────────────────────────────────────────────
  'Malolos|Museum of the Republic of 1899':
    'A national museum housed in the historic Barasoain Church compound, marking the site where the First Philippine Republic was inaugurated in 1899. Exhibits cover the Malolos Congress and the birth of Asia\'s first democratic republic.',
  'Malolos|Museum of Philippine Political History':
    'A museum in Malolos documenting the political history of the Philippines from the revolution against Spain through the American colonial period, with Bulacan\'s central role in the independence movement highlighted.',
  'Malolos|Cathedral of the Immaculate Conception':
    'The main cathedral of Malolos, Bulacan, and the seat of the Diocese of Malolos. The church dates to the 17th century and is closely linked to the historic Barasoain Church nearby.',
  'Malolos|Museum of the Republic of 1899':
    'A national museum marking where the revolutionary Malolos Congress convened and the First Philippine Republic was inaugurated — one of the most historically significant sites in the country.',
  'Malolos|Museo ng mga Kababaihan Ng Malolos sa Tahanan ni Alberta Uitangcoy-Santos':
    'A heritage museum honoring the "Women of Malolos," a group of young Bulaqueñas who petitioned to establish an evening school to learn Spanish in 1888 — a landmark act of defiance praised by Jose Rizal.',

  // ── MANILA ───────────────────────────────────────────────────────────────────
  'Manila|Fort Santiago':
    'The historic citadel at the heart of Intramuros, Fort Santiago served as the seat of Spanish military power in the Philippines for over 300 years. Jose Rizal was imprisoned here before his execution in 1896. The fort\'s dungeons, moat, and garden are open to visitors.',
  'Manila|San Agustin Church':
    'The oldest stone church in the Philippines, built in 1607 and declared a UNESCO World Heritage Site as part of the Baroque Churches of the Philippines. Its twin belltowers, intricate interior, and attached museum make it one of Manila\'s finest architectural treasures.',
  'Manila|National Museum of Fine Arts':
    'The premier fine arts museum of the Philippines, housed in the grand former Legislative Building on Padre Burgos Avenue. Home to Juan Luna\'s Spoliarium and hundreds of masterworks by Filipino artists across three centuries.',
  'Manila|National Museum of Anthropology':
    'A world-class anthropology museum in the former Finance Building, featuring the Manunggul Jar, pre-colonial gold artifacts, indigenous costumes, and exhibits tracing the diverse peoples of the Philippine archipelago.',
  'Manila|National Museum of Natural History':
    'A stunning natural history museum in the former Agriculture and Commerce Building, featuring the famous Tree of Life installation, skeletal specimens of the Blue Whale, and exhibits on Philippine biodiversity and geology.',
  'Manila|Rizal Shrine':
    'The restored cell where Dr. Jose Rizal spent his final nights before being executed by the Spanish colonial government on December 30, 1896. The adjoining museum houses his personal effects, manuscripts, and the jacket he wore on the day of his execution.',
  'Manila|Quiapo Church':
    'The home of the Black Nazarene — a centuries-old dark-complexioned image of Christ venerated by millions. The annual Traslacion procession on January 9 draws millions of barefoot devotees in one of the world\'s largest Catholic processions.',
  'Manila|Paco Park':
    'A circular former cemetery built by the Spanish in the 18th century, now a lovely green park famous for its Friday evening serenades. Jose Rizal\'s body was secretly buried here before being moved to Luneta.',
  'Manila|Manila Ocean Park':
    'An oceanarium and marine theme park built against the seawall of Manila Bay, featuring a walk-through aquarium tunnel, a jellyfish sanctuary, penguin exhibit, and various marine life shows.',
  'Manila|Museo Pambata':
    'The Children\'s Museum of Manila, housed in the historic Elks Club Building on Roxas Boulevard. An interactive museum designed for Filipino children with hands-on exhibits on science, culture, and history.',
  'Manila|Casa Consulado Museum & Library':
    'A colonial-era building in Binondo that now serves as a museum and library preserving Manila\'s Chinese-Filipino heritage — one of the oldest structures in the world\'s oldest Chinatown.',
  'Manila|Bahay Nakpil-Bautista':
    'The ancestral home of revolutionary-era printer Julio Nakpil and his wife Gregoria de Jesus (widow of Andres Bonifacio) — now a museum preserving artifacts and stories of the Philippine Revolution of 1896.',
  'Manila|The Aquatic Reef':
    'An aquarium and marine life attraction in Manila featuring a variety of local reef fish, corals, and sea creatures in carefully maintained tank exhibits.',
  'Manila|Apolinario Mabini Shrine':
    'The relocated ancestral home of Apolinario Mabini, the "Brains of the Revolution," now a museum containing his personal belongings, writings, and exhibits on his crucial role in shaping the First Philippine Republic.',
  'Manila|Manila Zoological & Botanical Garden':
    'The oldest zoo in the Philippines, located in Malate. While modest by international standards, it houses a collection of Philippine wildlife and botanical specimens and serves as an urban green space for city residents.',
  'Manila|Metropolitan Museum of Manila':
    'A major cultural institution on Roxas Boulevard featuring a permanent collection of pre-colonial gold artifacts alongside contemporary Filipino and Asian art — one of Manila\'s most accessible art museums.',
  'Manila|Museo de Intramuros':
    'A museum within the walled city of Intramuros showcasing the history and heritage of Manila\'s colonial fortified district, featuring period furniture, religious art, and artifacts from the Spanish era.',
  'Manila|National Planetarium':
    'The national planetarium in Rizal Park offering star shows and astronomical exhibits. One of the few planetariums in Southeast Asia and a landmark of Manila\'s cultural infrastructure.',
  'Manila|Manila Metropolitan Theater':
    'An Art Deco masterpiece built in 1931 and recently restored, the Manila Metropolitan Theater was once Southeast Asia\'s grandest performance venue. Its lush tropical motifs and tiered facade are iconic to Manila\'s cultural identity.',
  'Manila|Quirino Grandstand':
    'The iconic outdoor grandstand facing Manila Bay in Rizal Park, used for presidential inaugurations and national ceremonies. Named after President Elpidio Quirino, it offers sweeping views of Manila Bay.',
  'Manila|Plaza de Roma':
    'The main plaza of Intramuros, flanked by Manila Cathedral and the ruins of colonial-era government buildings. One of the oldest public spaces in the Philippines, serving as the civic heart of the walled city.',
  'Manila|San Sebastian Church':
    'The only all-steel church in Asia, designed in Gothic Revival style and prefabricated in Belgium before being assembled in Manila in 1891. A structural and aesthetic marvel among Manila\'s historic churches.',
  'Manila|Sinilangang Pook ni Heneral Antonio Luna;Antonio Luna birthplace':
    'The birthplace of General Antonio Luna, the brilliant military strategist of the Philippine-American War, marked in the Tondo district where he was born on October 29, 1866.',
  'Manila|iMake History Fortress Learning Center':
    'An experiential heritage learning center in Intramuros where visitors — especially school groups — participate in immersive reenactments of key events in Philippine history.',
  'Manila|Arroceros Forest Park':
    'A green oasis along the banks of the Pasig River in Manila — a surprising 2-hectare urban forest at the edge of the city\'s most congested areas, offering a peaceful nature escape within the capital.',
  'Manila|Museum of a History of Ideas':
    'A unique museum in Manila dedicated to the history of human thought, exploring the development of philosophy, science, religion, and political theory through interactive exhibits.',

  // ── MARAGONDON ───────────────────────────────────────────────────────────────
  'Maragondon|Bonifacio Trial House':
    'The restored building in Maragondon, Cavite where Andres Bonifacio — founder of the Katipunan and "Father of the Philippine Revolution" — was court-martialed and sentenced to death by fellow revolutionaries in 1897, one of the most tragic events in Philippine history.',
  'Maragondon|Bonifacio Shrine and Eco-Tourism Park':
    'A national park and eco-tourism site near Maragondon dedicated to Andres Bonifacio, featuring forested trails, mountain views, and memorial structures marking the site connected to his final days.',
  'Maragondon|Patungan Cove Viewpoint':
    'A clifftop viewpoint overlooking the secluded Patungan Cove and the South China Sea — a beautiful and relatively undiscovered coastal panorama in southern Cavite.',
  'Maragondon|Carabao Island Viewpoint':
    'A hilltop viewpoint offering views of Carabao Island, the narrow straits of the Verde Island Passage, and the rugged coastal landscape of southern Cavite and Batangas.',

  // ── NAGA ─────────────────────────────────────────────────────────────────────
  'Naga|Jesse M. Robredo Museum':
    'A museum honoring Jesse Robredo — the beloved Naga City mayor turned national DILG secretary whose model of transparent, participatory governance transformed local government in the Philippines. Features his advocacy materials and personal memorabilia.',
  'Naga|Bicol Science and Technology Centrum':
    'A science museum and technology center in Naga City dedicated to showcasing Bicol\'s scientific achievements, indigenous knowledge, and innovations in agriculture, engineering, and the natural sciences.',

  // ── PALIMBANG ────────────────────────────────────────────────────────────────
  'Palimbang|Akol Beach':
    'A pristine white sand beach on the coast of Palimbang, Sultan Kudarat — one of Mindanao\'s hidden coastal gems, offering calm azure waters and a tranquil setting far from the tourist crowds.',
  'Palimbang|Balasan Sandbar':
    'A shifting sandbar off the coast of Palimbang that appears and disappears with the tides, offering a surreal walk-on-water experience surrounded by shallow turquoise sea.',
  'Palimbang|Medol Island':
    'A small offshore island near Palimbang featuring white sand beaches, clear shallow waters, and basic island camping possibilities — accessible by a short boat ride from shore.',
  'Palimbang|Maganao Twin Islet':
    'Two small adjacent islets off the Palimbang coast offering an idyllic tropical island experience with clear waters suitable for snorkeling and island hopping.',
  'Palimbang|Tibuhol Overview':
    'A scenic hilltop viewpoint near Palimbang offering panoramic views of the coastline, offshore islands, and the mountainous interior of Sultan Kudarat province.',
  'Palimbang|Tower Viewpoint':
    'A viewpoint tower near Palimbang offering elevated views of the town, surrounding farmland, and the coastline of Sultan Kudarat — a good orientation point before exploring the area\'s natural attractions.',
  'Palimbang|Palimbang Baywalk':
    'A baywalk promenade in Palimbang town proper along the coast of Sultan Kudarat, offering views of the sea and a pleasant place for an evening stroll.',

  // ── PUERTO PRINCESA ──────────────────────────────────────────────────────────
  'Puerto Princesa|Palawan World War 2 Memorial Museum':
    'A somber museum in Puerto Princesa commemorating the Palawan Massacre of 1944, when 150 American POWs were burned alive by Japanese soldiers. One of the most important WWII memorial sites in the Philippines.',
  'Puerto Princesa|Plaza Cuartel':
    'The site of the former Cuartel barracks where the tragic Palawan Massacre occurred. Now a peaceful park and historical memorial with exhibits on the wartime tragedy.',
  'Puerto Princesa|Iwahig Penal Colony':
    'An open prison farm established in 1904 covering 37,000 hectares of Palawan wilderness. Inmates farm freely without walls or bars — an extraordinary experiment in rehabilitation. Tourists can visit and even buy goods made by prisoners.',
  'Puerto Princesa|Palawan Wildlife Rescue and Conservation Center':
    'A rehabilitation center for orphaned and injured wildlife native to Palawan, including the pangolin, Palawan bearcat, and various reptiles. Open to visitors as an educational wildlife encounter.',
  'Puerto Princesa|Mendoza Park':
    'The central park of Puerto Princesa City, a pleasant urban green space near the waterfront offering shade, a children\'s playground, and a relaxed atmosphere for city exploration.',
  'Puerto Princesa|Mangrove Hut 2 (view deck)':
    'A raised view deck within Puerto Princesa\'s mangrove forest ecosystem, offering views of the mangrove canopy and the waterways that support the city\'s rich coastal biodiversity.',

  // ── QUEZON CITY ──────────────────────────────────────────────────────────────
  'Quezon City|Quezon Memorial Circle':
    'A national monument and park dedicated to Commonwealth President Manuel L. Quezon, featuring the iconic obelisk-like Quezon Memorial Shrine, museums, and broad park grounds — the symbolic center of Quezon City.',
  'Quezon City|People Power Monument':
    'A monument along EDSA at Camp Crame commemorating the 1986 People Power Revolution that peacefully ousted the Marcos dictatorship — one of the most significant events in modern Philippine and world history.',
  'Quezon City|EDSA Shrine':
    'A Catholic shrine built at the site of the 1986 People Power Revolution on EDSA, featuring the iconic bronze image of the Blessed Virgin Mary encircled by the crowd that toppled the Marcos regime.',
  'Quezon City|EDSA People Power':
    'A historical marker at EDSA commemorating the peaceful People Power Revolution of February 1986, where millions of Filipinos massed on the highway and brought about the restoration of democracy.',
  'Quezon City|Quezon Heritage House':
    'The restored ancestral home of President Manuel L. Quezon in the heart of Quezon City, open as a museum with period furnishings, personal memorabilia, and exhibits on the Commonwealth era.',
  'Quezon City|Ninoy Aquino Parks & Wildlife Center':
    'A government-managed parks and wildlife facility in Quezon City housing rescued wildlife, including Philippine deer and exotic birds, within a forested urban sanctuary.',

  // ── SAGADA ───────────────────────────────────────────────────────────────────
  'Sagada|Hanging Coffins':
    'One of the most striking sights in the Philippines — ancient coffins of the Igorot dead are attached to the sheer limestone cliffs above Echo Valley in Sagada. The Kankana-ey people believe the higher the coffin, the closer to ancestral spirits.',
  'Sagada|Sumaguing Cave Entrance':
    'The entrance to Sumaguing Cave, Sagada\'s most impressive limestone cavern. Also called "Big Cave," it features extraordinary stalagmite and stalactite formations and requires spelunking through underground pools — one of the best cave experiences in the Philippines.',
  'Sagada|Lumiang Burial Cave':
    'A cave mouth filled with over 100 stacked pine coffins of Kankana-ey ancestors, some estimated to be over 500 years old. The cave can be connected to Sumaguing in a longer spelunking adventure.',
  'Sagada|Kiltepan Peak':
    'Sagada\'s most famous sunrise viewpoint, where on clear mornings a sea of clouds fills the valley below while mountain peaks rise above — a breathtaking spectacle that has made this one of the most shared images of the Philippines.',
  'Sagada|Sunset Viewpoint':
    'A hilltop clearing above Sagada offering panoramic sunset views over the pine-covered Cordillera mountains — a peaceful spot to end the day with a cup of Sagada coffee.',
  'Sagada|Sugong Hanging Coffins Viewpoint':
    'A viewpoint overlooking the Sugong cliffside where the Sugong Hanging Coffins are secured — a quieter alternative to the main Echo Valley hanging coffins, offering a similar but less crowded experience.',
  'Sagada|Ganduyan Museum':
    'A private family-run museum in Sagada preserving Kankana-ey Igorot heirlooms, including handwoven blankets, beads, baskets, and artifacts that reflect the indigenous mountain culture of the Cordillera.',
  'Sagada|Sagada Pottery':
    'A workshop and showroom featuring handmade pottery crafted by Sagada\'s weavers and artisans, using local clay and traditional techniques. A great place to find unique handcrafted souvenirs.',
  'Sagada|Pongas Falls':
    'A waterfall accessible from Sagada via a forested hike through terraced farmland and pine woodland. The falls are a refreshing reward at the end of a trail through the scenic Cordillera landscape.',
  'Sagada|Masferré Photographs':
    'A gallery preserving the extraordinary photographs of Eduardo Masferré, who documented Cordillera highland life in the early 20th century with extraordinary intimacy. His black-and-white images are considered masterpieces of documentary photography.',

  // ── SAN FERNANDO ─────────────────────────────────────────────────────────────
  'San Fernando|The Baywalk in Poro Point':
    'A waterfront promenade at Poro Point in San Fernando, La Union, offering views of the South China Sea, seaside dining options, and a pleasant sunset-watching spot popular with both locals and surfers from nearby beaches.',

  // ── SAN PABLO ────────────────────────────────────────────────────────────────
  'San Pablo|Museo de San Pablo':
    'The city museum of San Pablo, Laguna — the "City of Seven Lakes" — featuring historical artifacts, photographs, and exhibits on the volcanic lakes, colonial history, and cultural heritage of this unique Laguna city.',
  'San Pablo|Sulyap Museum':
    'A private heritage museum in San Pablo, Laguna, housed in a restored colonial-era building and featuring antique Filipino furniture, religious art, and personal collections that offer a window into provincial life from the 18th to 20th centuries.',

  // ── SANTA CRUZ ───────────────────────────────────────────────────────────────
  'Santa Cruz|Heneral Paciano Rizal Park':
    'A public park in Santa Cruz, Laguna dedicated to Paciano Rizal, elder brother of national hero Jose Rizal and a general in the Philippine Revolution. Features monuments and a peaceful green space in the town proper.',

  // ── TAAL ─────────────────────────────────────────────────────────────────────
  'Taal|Marcela Agoncillo Historical Landmark':
    'A heritage museum honoring Marcela Agoncillo, the Filipina patriot who sewed the first Philippine flag in Hong Kong in 1898. The site in Taal, Batangas marks one of the most important acts in the birth of the Philippine nation.',
  'Taal|Don Gregorio Agoncillo Mansion':
    'One of the finest examples of a late-19th-century Filipino ancestral mansion in Taal, Batangas — a beautifully preserved house that reflects the prosperity and sophistication of the Tagalog ilustrado class.',
  'Taal|Ylagan–de la Rosa Ancestral House':
    'A heritage ancestral house in the historic town of Taal, Batangas, featuring well-preserved colonial-era architecture and period furnishings that reflect the affluence of old Taal families.',

  // ── TAGAYTAY ─────────────────────────────────────────────────────────────────
  'Tagaytay|People\'s Park in the Sky':
    'The ruins of Ferdinand Marcos\'s unfinished mountaintop mansion at the highest point in Tagaytay, now a park with stunning 360-degree panoramic views of Taal Volcano, Taal Lake, and the surrounding Cavite and Batangas landscape.',
  'Tagaytay|Sky Ranch':
    'A family amusement park perched along the Tagaytay ridge offering carnival rides including the iconic Sky Eye Ferris wheel with unparalleled views of Taal Volcano — one of the most-visited attractions in the Tagaytay–Cavite area.',
  'Tagaytay|The Cliffhouse':
    'A popular viewpoint along the Tagaytay ridge with a restaurant and open-air terrace offering one of the most dramatic direct views of Taal Volcano island and Taal Lake — a favorite for sunset dining.',
  'Tagaytay|41st Division PA-USAFFE Shrine':
    'A memorial shrine in Tagaytay honoring the soldiers of the 41st Division of the Philippine Army who fought as part of the USAFFE (United States Armed Forces in the Far East) during World War II.',

  // ── TAYABAS ──────────────────────────────────────────────────────────────────
  'Tayabas|Hermano Puli Memorial Shrine':
    'A national shrine in Tayabas, Quezon dedicated to Apolinario de la Cruz — "Hermano Pule" — who led the Cofradia de San Jose, one of the earliest Filipino revolts against Spanish authority.',
  'Tayabas|Casa Comunidad de Tayabas':
    'A heritage building in the historic town of Tayabas that served as the community hall during the Spanish colonial era — now used for cultural events and tourism activities.',
  'Tayabas|Green Tom\'s Organic Farm':
    'An organic farm and agri-tourism destination in Tayabas, Quezon offering farm tours, fresh produce, and a peaceful rural experience away from the urban grind.',

  // ── VIGAN ────────────────────────────────────────────────────────────────────
  'Vigan|Crisologo Museum':
    'A museum inside the ancestral home of the powerful Crisologo family of Vigan, featuring memorabilia, antique furniture, and personal artifacts of one of Ilocos Sur\'s most influential political dynasties.',
  'Vigan|Burgos Museum':
    'A heritage museum in Vigan dedicated to Father Jose Burgos, one of the three martyr priests (GOMBURZA) executed by the Spanish in 1872 — an event that galvanized the Philippine independence movement. Features artifacts and exhibits on his life.',
  'Vigan|Baluarte':
    'A private zoo and ecotourism park in Vigan established by former Governor Chavit Singson, featuring a wide collection of exotic animals, birds, and reptiles within manicured grounds — one of the most popular free attractions in Vigan.',
  'Vigan|Ruby Jar Factory (Burnay/Pottery)':
    'A traditional burnay pottery factory where Vigan\'s distinctive dark clay jars have been made for centuries using an ancient firing technique. Visitors can watch potters at work on the old-fashioned foot-powered kick wheel.',
  'Vigan|Plaza Salcedo':
    'The main town plaza of Vigan, framed by the historic Vigan Cathedral and colonial-era buildings. The plaza hosts the famous dancing fountain and evening sound-and-light shows — the social heart of the UNESCO World Heritage City.',
  'Vigan|Archbishop\'s Residence':
    'The historic residence of the Archbishop of Nueva Segovia in Vigan, an elegant colonial building adjacent to the cathedral that has served as a center of Catholic authority in the Ilocos region for centuries.',
  'Vigan|Gregoria M. Rivera Memorial Library & Museum':
    'A small museum and heritage library in Vigan preserving the literary and cultural legacy of Gregoria Rivera and local Ilocano scholars, with a collection of historical texts and regional artifacts.',
  'Vigan|Plaza Trese Martires':
    'A park in Vigan commemorating the thirteen martyrs of Vigan — Ilocano patriots executed for their role in the Philippine Revolution — a place of historical remembrance in the heritage city.',

  // ── ZAMBOANGA ────────────────────────────────────────────────────────────────
  'Zamboanga|Fort Pilar':
    'A 17th-century Spanish colonial fort and the most recognized landmark of Zamboanga City. Named after Our Lady of the Pillar, it houses a shrine, a small museum, and a marine life exhibit — the spiritual and historical heart of the city.',
  'Zamboanga|Bolong Beach':
    'A scenic beach in Zamboanga with the characteristic pinkish sand tinge from crushed red organ pipe coral — the same phenomenon seen on the famous Pink Beach of Sta. Cruz Island nearby.',
  'Zamboanga|City Museum':
    'The city museum of Zamboanga documenting the history and multicultural heritage of this unique city — where Chavacano (a Spanish-based creole language) is spoken and where Muslim, Christian, and indigenous cultures intersect.',
  'Zamboanga|Parque de Cencia de Zamboanga':
    'A science park in Zamboanga City offering interactive exhibits on natural science, environmental awareness, and the biodiversity of the western Mindanao ecosystem.',
};

// ── Smart fallback descriptions by name pattern and osmTag ────────────────────

function generateFallback(name, destination, category, osmTag) {
  const n = name.toLowerCase();

  // ── Name-pattern based (most specific first) ──────────────────────────────
  if (/falls?|waterfall/i.test(name))
    return `A picturesque waterfall in ${destination} accessible via a short forest trek, offering a refreshing natural pool and scenic jungle surroundings.`;

  if (/hanging coffin/i.test(name))
    return `Ancient coffins of Igorot ancestors, placed on cliffsides according to indigenous burial tradition — a striking cultural and spiritual landmark of the Cordillera highlands.`;

  if (/cave/i.test(name) && osmTag !== 'attraction')
    return `A natural limestone cave in ${destination} featuring impressive rock formations and a cool underground interior, accessible with a local guide.`;

  if (/heritage house|ancestral house|mansion|bahay na bato/i.test(name))
    return `A well-preserved ancestral house in ${destination} dating from the Spanish colonial period, featuring period furniture, family heirlooms, and traditional Filipino-Spanish architecture.`;

  if (/balay na tisa|heritage house/i.test(name))
    return `A heritage house in ${destination} built during the colonial era, recognized for its architectural significance and historical connection to the town\'s prominent families.`;

  if (/national museum.*philippines|museum.*national/i.test(name))
    return `The regional branch of the National Museum of the Philippines in ${destination}, featuring archaeological finds, ethnographic collections, and natural history exhibits from across the region.`;

  if (/museum of (philippine|ph)/i.test(name))
    return `A specialized national museum in ${destination} dedicated to a distinct aspect of Philippine history, culture, or natural heritage, featuring curated exhibits and preserved artifacts.`;

  if (/museum/i.test(name) && osmTag === 'museum')
    return `A museum in ${destination} housing cultural artifacts, historical exhibits, and collections that illuminate the heritage and story of the local community and surrounding region.`;

  if (/shrine|national shrine/i.test(name) && /rizal/i.test(name))
    return `A national shrine in ${destination} honoring Dr. Jose Rizal, national hero of the Philippines, marking a site connected to his life, work, or the independence movement he inspired.`;

  if (/rizal/i.test(name) && osmTag === 'monument')
    return `A monument to Dr. Jose Rizal, national hero of the Philippines, standing at a public square in ${destination} as a symbol of national pride and the enduring legacy of the independence struggle.`;

  if (/rizal park|rizal plaza|plaza rizal/i.test(name))
    return `A public park in ${destination} named in honor of national hero Jose Rizal, offering a green space for community gatherings and featuring a monument to the country's most celebrated patriot.`;

  if (/bonifacio/i.test(name) && (osmTag === 'memorial' || osmTag === 'monument'))
    return `A memorial to Andres Bonifacio, founder of the Katipunan and hero of the Philippine Revolution, commemorating his enduring legacy in the fight for independence.`;

  if (/mabini/i.test(name))
    return `A memorial or shrine honoring Apolinario Mabini, "the Brains of the Revolution," whose brilliant legal and strategic mind shaped the First Philippine Republic.`;

  if (/aguinaldo/i.test(name))
    return `A monument honoring General Emilio Aguinaldo, the first President of the Philippines who declared independence from Spain on June 12, 1898.`;

  if (/marcos/i.test(name) && osmTag === 'memorial')
    return `A monument or memorial associated with the Marcos family in Ilocos Norte, reflecting the complex legacy of the former president in his home province.`;

  if (/fort|kuta/i.test(name) && category === 'landmark')
    return `A historic fortification in ${destination} from the Spanish colonial era, built to defend against pirate raids and foreign attacks. Now a heritage site preserving centuries of Philippine military history.`;

  if (/church|cathedral|basilica|simbahan|chapel|convent/i.test(name))
    return `A historic church in ${destination} serving as both an active house of worship and an important heritage site, featuring colonial-era architecture and centuries of religious history.`;

  if (/grotto/i.test(name))
    return `A religious grotto in ${destination} serving as a site for prayer and pilgrimage. Devotees climb to the shrine to light candles and seek intercession from the Virgin Mary.`;

  if (/plaza/i.test(name) && (category === 'nature' || osmTag === 'park'))
    return `The historic central plaza of ${destination}, a public green space surrounded by heritage buildings and serving as a gathering place for the local community since the Spanish colonial era.`;

  if (/park.*sky|sky.*park|balcony|terrace|view deck|viewpoint|overlook/i.test(name))
    return `A scenic viewpoint in ${destination} offering panoramic views of the surrounding landscape — best visited in the morning for clear skies or in the late afternoon for golden-hour light.`;

  if (osmTag === 'viewpoint')
    return `A viewpoint in ${destination} offering a broad panoramic view of the surrounding countryside, coast, or mountain landscape — a rewarding stop for photography and quiet reflection.`;

  if (osmTag === 'beach')
    return `A beach in ${destination} offering calm waters, sandy shores, and a relaxed coastal atmosphere — perfect for swimming, beachcombing, and enjoying the natural beauty of the coastline.`;

  if (/zoo|wildlife|crocodile|butterfly|eagle center/i.test(name))
    return `A wildlife park in ${destination} housing a diverse collection of animals, with a focus on native Philippine species. An educational experience for families and nature enthusiasts.`;

  if (osmTag === 'zoo')
    return `A zoological facility in ${destination} providing a home for native and exotic wildlife, supporting conservation and environmental education programs.`;

  if (osmTag === 'aquarium')
    return `An aquarium in ${destination} featuring tanks of Philippine marine life, reef fish, and underwater exhibits that showcase the country\'s extraordinary ocean biodiversity.`;

  if (osmTag === 'theme_park')
    return `An amusement and recreation park in ${destination} offering rides, attractions, and entertainment for families and visitors of all ages.`;

  if (/night market|market|mercado/i.test(name))
    return `A lively market in ${destination} offering local street food, fresh produce, handicrafts, and a vibrant atmosphere — a great way to experience the local flavors and culture.`;

  if (/baywalk|esplanade|promenade/i.test(name))
    return `A waterfront promenade in ${destination} offering views of the bay or sea, with a pleasant path for evening walks and a front-row seat to spectacular sunsets.`;

  if (/lagoon|lake|spring|river pool|natural pool/i.test(name))
    return `A natural body of water in ${destination} offering clear, calm conditions for swimming and relaxation, surrounded by tropical greenery and a peaceful natural setting.`;

  if (/sandbox|sandbar/i.test(name))
    return `A natural sandbar accessible by boat in the waters near ${destination}, appearing as a thin strip of white sand surrounded by shallow turquoise sea — a surreal tropical photo opportunity.`;

  if (/island/i.test(name) && category !== 'landmark')
    return `A small island near ${destination} with clear surrounding waters, white sand, and tropical vegetation — accessible by a short boat ride and ideal for snorkeling and island relaxation.`;

  if (/ecological sanctuary|eco park|nature park|botanical/i.test(name))
    return `An ecological sanctuary in ${destination} protecting native plant and animal species, with walking trails and interpretive areas for environmental education and nature appreciation.`;

  if (/memorial.*wall|wall.*memorial/i.test(name))
    return `A memorial wall in ${destination} commemorating lives lost in a significant historical event — a place of remembrance and collective healing.`;

  if (/war memorial|peace memorial|freedom.*memorial/i.test(name))
    return `A war memorial in ${destination} honoring those who fought and fell in defense of the Philippines. A solemn site for remembrance and reflection.`;

  if (/people power|edsa/i.test(name))
    return `A landmark commemorating the 1986 People Power Revolution — the peaceful mass uprising along EDSA that ended the Marcos dictatorship and restored democracy to the Philippines.`;

  if (/weaving|pottery|burnay/i.test(name))
    return `A traditional craft workshop in ${destination} where indigenous artisans continue centuries-old techniques of handweaving or pottery — visitors can watch the craft in practice and purchase authentic handmade pieces.`;

  if (osmTag === 'memorial')
    return `A historical marker or monument in ${destination} commemorating a significant figure or event in Philippine history — a quiet place of remembrance within the local landscape.`;

  if (osmTag === 'artwork')
    return `A public artwork or sculpture in ${destination}, part of the city\'s cultural landscape and contributing to the visual identity of the urban environment.`;

  if (osmTag === 'gallery')
    return `An art gallery in ${destination} featuring works by local and regional Filipino artists, supporting the creative community and offering visitors a curated cultural experience.`;

  if (osmTag === 'building' || osmTag === 'yes')
    return `A heritage building in ${destination} dating from the Spanish or American colonial era, recognized for its architectural significance and historical connections to the local community.`;

  if (osmTag === 'heritage')
    return `A designated heritage site in ${destination}, recognized for its outstanding cultural, historical, or architectural significance to the Philippine national identity.`;

  if (osmTag === 'ruins')
    return `The ruins of a historic structure in ${destination}, offering a glimpse into the city\'s colonial past and the events that shaped its history.`;

  if (osmTag === 'fort')
    return `A colonial-era fortification in ${destination} built to defend against piracy and foreign invasion, now preserved as a heritage site and open to the public.`;

  if (osmTag === 'church')
    return `A historic church in ${destination}, one of the many Spanish-era religious structures that define the architectural and spiritual heritage of the Philippine provinces.`;

  if (osmTag === 'monument')
    return `A public monument in ${destination} honoring a person or event of historical significance, serving as a landmark of civic memory and national identity.`;

  if (osmTag === 'cave_entrance')
    return `The entrance to a natural cave system in ${destination}, accessible with a certified local guide. The interior features dramatic limestone formations and underground waterways.`;

  if (osmTag === 'nature_reserve')
    return `A protected natural reserve in ${destination} safeguarding a critical habitat for endemic Philippine wildlife, with limited access to preserve its ecological integrity.`;

  if (osmTag === 'attraction' && n.includes('view'))
    return `A scenic viewpoint in ${destination} offering broad views of the surrounding landscape. A favorite spot for sunrise and sunset photography.`;

  if (osmTag === 'park' || category === 'nature')
    return `A public park in ${destination} offering green open space, shaded paths, and a relaxed environment for recreation and leisure — a local gathering place for families and visitors alike.`;

  // Final catch-all
  return `A noteworthy point of interest in ${destination} worth including on your itinerary when exploring the area.`;
}

// ── Main processing ────────────────────────────────────────────────────────────

const raw  = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
const output = { version: 2, updated_at: new Date().toISOString().slice(0, 10), destinations: {} };

let described = 0;
let fallback  = 0;
let total     = 0;

for (const [dest, places] of Object.entries(raw.destinations)) {
  output.destinations[dest] = places.map(p => {
    total++;

    // Strip internal OSM debug fields
    const { _osmId, _osmType, _osmTag, ...clean } = p;
    const osmTag = _osmTag || '';

    // Look up known description
    const key1 = `${dest}|${p.name}`;
    if (KNOWN[key1]) {
      described++;
      return { ...clean, description: KNOWN[key1] };
    }
    if (KNOWN[p.name]) {
      described++;
      return { ...clean, description: KNOWN[p.name] };
    }

    // Generate fallback
    fallback++;
    return { ...clean, description: generateFallback(p.name, dest, p.category, osmTag) };
  });
}

fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf8');

console.log(`\n✅ Done!`);
console.log(`   Total places  : ${total}`);
console.log(`   Hand-crafted  : ${described}`);
console.log(`   Auto-generated: ${fallback}`);
console.log(`\n   Output → scripts/output/places_gist.json`);
console.log(`   Version bumped to 2 — upload this to your Gist to push descriptions to the app.\n`);
