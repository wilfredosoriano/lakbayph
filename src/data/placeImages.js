/**
 * Static image registry for bundled place photos.
 * Add an entry here when you drop a new image into assets/images/places/.
 *
 * Metro resolves require() at bundle time so paths must be string literals —
 * no dynamic require(variable) allowed.
 *
 * CachedImage checks this map first; if found it renders instantly with no
 * network or file-system lookup needed.
 *
 * When you add a new image:
 *   1. Drop the file into assets/images/places/
 *   2. Add a PLACE_IMAGES entry below
 *   3. Rebuild the app
 */

export const PLACE_IMAGES = {
  // Luzon
  'banaue-1':         require('../../assets/images/places/batad-rice-terraces.jpg'),
  'sagada-1':         require('../../assets/images/places/sumaguing-cave-sagada.jpg'),
  'cagayan-1':        require('../../assets/images/places/palaui-island-cagayan.jpg'),
  'rizal-1':          require('../../assets/images/places/masungi-georeserve.jpg'),
  'rizal-2':          require('../../assets/images/places/tinipak-river-daraitan.jpg'),
  'ilocos-norte-1':   require('../../assets/images/places/kabigan-falls-pagudpud.jpg'),
  'zambales-1':       require('../../assets/images/places/nagsasa-cove-zambales.jpg'),
  'quezon-1':         require('../../assets/images/places/cagbalete-island.jpg'),
  // Visayas
  'leyte-1':          require('../../assets/images/places/kalanggaman-island-leyte.jpg'),
  'siquijor-1':       require('../../assets/images/places/cambugahay-falls-siquijor.jpg'),
  'siquijor-2':       require('../../assets/images/places/salagdoong-beach-siquijor.jpg'),
  'negros-1':         require('../../assets/images/places/apo-island-sanctuary.jpg'),
  'iloilo-1':         require('../../assets/images/places/islas-de-gigantes.jpg'),
  'guimaras-1':       require('../../assets/images/places/guimaras-island.jpg'),
  'w-samar-1':        require('../../assets/images/places/langun-gobingob-cave.jpg'),
  'camiguin-1':       require('../../assets/images/places/white-island-camiguin.jpg'),
  'camiguin-2':       require('../../assets/images/places/sunken-cemetery-camiguin.jpg'),
  // Mindanao
  'surigao-sur-1':    require('../../assets/images/places/hinatuan-enchanted-river.jpg'),
  'siargao-1':        require('../../assets/images/places/sugba-lagoon-siargao.jpg'),
  'iligan-1':         require('../../assets/images/places/tinago-falls-iligan.jpg'),
  'davao-oriental-1': require('../../assets/images/places/aliwagwag-falls-davao.jpg'),
  'cotabato-1':       require('../../assets/images/places/asik-asik-falls.jpg'),
  // Palawan
  'puerto-1':         require('../../assets/images/places/puerto-princesa-underground-river.jpg'),
  'puerto-2':         require('../../assets/images/places/nagtabon-beach-palawan.jpg'),
};

