/**
 * Static image registry for bundled place photos.
 * Add an entry here whenever you drop a new image into assets/images/places/.
 *
 * Metro resolves require() at bundle time so paths must be string literals —
 * no dynamic require(variable) allowed.
 *
 * CachedImage checks this map first; if found it renders instantly with no
 * network or file-system lookup needed.
 */

export const PLACE_IMAGES = {
  // ── Baguio ─────────────────────────────────────────────────────────────────
  'baguio-1':  require('../../assets/images/places/burnham-park.jpg'),
  'baguio-2':  require('../../assets/images/places/baguio-night-market.webp'),
  'baguio-3':  require('../../assets/images/places/mines-view-park.webp'),
  'baguio-4':  require('../../assets/images/places/wright-park.webp'),
  'baguio-5':  require('../../assets/images/places/good-taste-restaurant.jpg'),
  'baguio-6':  require('../../assets/images/places/strawberry-farm.jpg'),
  'baguio-7':  require('../../assets/images/places/baguio-cathedral.jpg'),
  'baguio-8':  require('../../assets/images/places/the-mansion.webp'),
  'baguio-9':  require('../../assets/images/places/camp-john-hay.webp'),
  'baguio-10': require('../../assets/images/places/botanical-garden.webp'),
  'baguio-11': require('../../assets/images/places/tam-awan-village.jpg'),
  'baguio-12': require('../../assets/images/places/bencab-museum.jpg'),
  'baguio-13': require('../../assets/images/places/sm-terrace.webp'),
  'baguio-x':  require('../../assets/images/places/bell-church.webp'),
  'baguio-15': require('../../assets/images/places/igorot-kingdom.webp'),
  'baguio-16': require('../../assets/images/places/baguio-public-market.webp'),
  'baguio-17': require('../../assets/images/places/cafe-by-the-ruins.jpg'),
  'baguio-18': require('../../assets/images/places/philippine-military-academy.jpg'),
  'baguio-19': require('../../assets/images/places/dragon-treasure-castle.jpg'),
  'baguio-20': require('../../assets/images/places/valley-of-colors.webp'),
  'baguio-21': require('../../assets/images/places/session-road.webp'),
  'baguio-g1': require('../../assets/images/places/lion-head.webp'),
  'baguio-g2': require('../../assets/images/places/old-diplomat-hotel.jpg'),
  'baguio-g3': require('../../assets/images/places/mirador-heritage-park.jpg'),
  'baguio-g4': require('../../assets/images/places/mines-view-observation.jpg'),

  // ── Vigan ──────────────────────────────────────────────────────────────────
  'vigan-1':  require('../../assets/images/places/calle-crisologo.webp'),
  'vigan-2':  require('../../assets/images/places/plaza-salcedo.jpg'),
  'vigan-3':  require('../../assets/images/places/bantay-watch-tower.webp'),
  'vigan-4':  require('../../assets/images/places/vigan-longganisa.jpg'),
  'vigan-5':  require('../../assets/images/places/baluarte-zoo.jpg'),
  'vigan-6':  require('../../assets/images/places/vigan-cathedral.jpg'),
  'vigan-7':  require('../../assets/images/places/syquia-mansion.jpg'),
  'vigan-8':  require('../../assets/images/places/burnay-pottery.jpg'),
  'vigan-9':  require('../../assets/images/places/kalesa-vigan.jpg'),
  'vigan-10': require('../../assets/images/places/crisologo-museum.jpg'),
  'vigan-11': require('../../assets/images/places/plaza-burgos-night.jpg'),
  'vigan-12': require('../../assets/images/places/hidden-garden-vigan.jpg'),
  'vigan-g1': require('../../assets/images/places/bantay-church.jpg'),
  'vigan-g2': require('../../assets/images/places/national-museum-ilocos.jpg'),
  'vigan-g3': require('../../assets/images/places/plaza-burgos.jpg'),
  'vigan-g4': require('../../assets/images/places/rg-jar-factory.jpg'),
  'vigan-g5': require('../../assets/images/places/bicentennial-park-vigan.jpg'),

  // ── Pangasinan ─────────────────────────────────────────────────────────────
  'pangasinan-1':  require('../../assets/images/places/hundred-islands.jpg'),
  'pangasinan-2':  require('../../assets/images/places/quezon-island.jpg'),
  'pangasinan-3':  require('../../assets/images/places/bolinao-falls.jpg'),
  'pangasinan-4':  require('../../assets/images/places/cape-bolinao-lighthouse.jpg'),
  'pangasinan-5':  require('../../assets/images/places/patar-beach.jpg'),
  'pangasinan-6':  require('../../assets/images/places/manaoag-church.jpg'),
  'pangasinan-7':  require('../../assets/images/places/enchanted-cave.jpg'),
  'pangasinan-8':  require('../../assets/images/places/lingayen-beach.jpg'),
  'pangasinan-9':  require('../../assets/images/places/bangus-food.jpg'),
  'pangasinan-10': require('../../assets/images/places/bolinao-marine-lab.jpg'),
  'pangasinan-11': require('../../assets/images/places/governors-beach.jpg'),
  'pangasinan-12': require('../../assets/images/places/dagupan-bangus-market.jpg'),
  'pangasinan-g1': require('../../assets/images/places/patar-white-sand.jpg'),
  'pangasinan-g2': require('../../assets/images/places/blue-lagoon-bolinao.jpg'),
  'pangasinan-g3': require('../../assets/images/places/tondol-beach.jpg'),
  'pangasinan-g4': require('../../assets/images/places/masamirey-beach.jpg'),
  'pangasinan-g5': require('../../assets/images/places/lucap-wharf.jpg'),
  'pangasinan-g6': require('../../assets/images/places/bued-mangrove.jpg'),
  'pangasinan-g7': require('../../assets/images/places/camp-puor.jpg'),
  'pangasinan-g8': require('../../assets/images/places/estanza-beach.jpg'),
  'pangasinan-malico': require('../../assets/images/places/malico.webp'),

  // ── Dingalan, Aurora ───────────────────────────────────────────────────────
  'dingalan-1': require('../../assets/images/places/dingalan.webp'),

  // ── Gabaldon, Nueva Ecija ──────────────────────────────────────────────────
  'gabaldon-1': require('../../assets/images/places/gabaldon.webp'),

  // ── Atok, Benguet ──────────────────────────────────────────────────────────
  'atok-1': require('../../assets/images/places/atok-benguet.webp'),

  // ── Tagaytay ───────────────────────────────────────────────────────────────
  'tagaytay-1': require('../../assets/images/places/peoples-park-in-the-sky.webp'),
};
