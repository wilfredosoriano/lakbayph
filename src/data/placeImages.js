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
  'baguio-2':  require('../../assets/images/places/baguio-night-market.webp'),
  'baguio-3':  require('../../assets/images/places/mines-view-park.webp'),
  'baguio-8':  require('../../assets/images/places/the-mansion.webp'),
  'baguio-20': require('../../assets/images/places/valley-of-colors.webp'),
  'baguio-4':  require('../../assets/images/places/wright-park.webp'),
  'baguio-9':  require('../../assets/images/places/camp-john-hay.webp'),
  'baguio-10': require('../../assets/images/places/botanical-garden.webp'),
  'baguio-x':  require('../../assets/images/places/bell-church.webp'),
  'baguio-13': require('../../assets/images/places/sm-terrace.webp'),
  'baguio-15': require('../../assets/images/places/igorot-kingdom.webp'),
  'baguio-16': require('../../assets/images/places/baguio-public-market.webp'),
  'baguio-21': require('../../assets/images/places/session-road.webp'),
  'baguio-g1': require('../../assets/images/places/lion-head.webp'),

  // ── Vigan ──────────────────────────────────────────────────────────────────
  'vigan-1': require('../../assets/images/places/calle-crisologo.webp'),
  'vigan-3': require('../../assets/images/places/bantay-watch-tower.webp'),

  // ── Pangasinan ─────────────────────────────────────────────────────────────
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
