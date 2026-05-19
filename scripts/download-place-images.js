/**
 * Downloads one Pexels image per missing place.
 * Usage: PEXELS_KEY=your_key node scripts/download-place-images.js
 *
 * Images are saved as .jpg to assets/images/places/
 * After running, convert to .webp with: npx @squoosh/cli --webp '{}' assets/images/places/*.jpg
 * Then update src/data/placeImages.js with the entries printed at the end.
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const API_KEY   = process.env.PEXELS_KEY;
const OUT_DIR   = path.join(__dirname, '../assets/images/places');

if (!API_KEY) {
  console.error('Set PEXELS_KEY=your_api_key before running.');
  process.exit(1);
}

// Places missing images — { id, filename, query }
const PLACES = [
  // Baguio
  { id: 'baguio-1',  filename: 'burnham-park',            query: 'Burnham Park Baguio Philippines' },
  { id: 'baguio-5',  filename: 'good-taste-restaurant',   query: 'Good Taste Restaurant Baguio Philippines food' },
  { id: 'baguio-6',  filename: 'strawberry-farm',         query: 'Strawberry Farm La Trinidad Baguio Philippines' },
  { id: 'baguio-7',  filename: 'baguio-cathedral',        query: 'Baguio Cathedral Philippines' },
  { id: 'baguio-11', filename: 'tam-awan-village',        query: 'Tam-Awan Village Baguio Philippines' },
  { id: 'baguio-12', filename: 'bencab-museum',           query: 'BenCab Museum Baguio Philippines' },
  { id: 'baguio-17', filename: 'cafe-by-the-ruins',       query: 'Cafe by the Ruins Baguio Philippines' },
  { id: 'baguio-18', filename: 'philippine-military-academy', query: 'Philippine Military Academy Baguio PMA' },
  { id: 'baguio-19', filename: 'dragon-treasure-castle',  query: 'Dragon Treasure Castle Baguio Philippines' },
  { id: 'baguio-g2', filename: 'old-diplomat-hotel',      query: 'Old Diplomat Hotel Ruins Baguio Philippines' },
  { id: 'baguio-g3', filename: 'mirador-heritage-park',   query: 'Mirador Heritage Park Baguio Philippines' },
  { id: 'baguio-g4', filename: 'mines-view-observation',  query: 'Mines View Park Baguio Philippines observation deck' },

  // Vigan
  { id: 'vigan-2',   filename: 'plaza-salcedo',           query: 'Plaza Salcedo Vigan Ilocos Sur Philippines' },
  { id: 'vigan-4',   filename: 'vigan-longganisa',        query: 'Vigan longganisa food Ilocos Philippines' },
  { id: 'vigan-5',   filename: 'baluarte-zoo',            query: 'Baluarte Zoo Vigan Philippines' },
  { id: 'vigan-6',   filename: 'vigan-cathedral',         query: 'St Paul Cathedral Vigan Ilocos Sur Philippines' },
  { id: 'vigan-7',   filename: 'syquia-mansion',          query: 'Syquia Mansion Museum Vigan Philippines' },
  { id: 'vigan-8',   filename: 'burnay-pottery',          query: 'burnay pottery jar Vigan Philippines' },
  { id: 'vigan-9',   filename: 'kalesa-vigan',            query: 'kalesa horse carriage Vigan Philippines heritage' },
  { id: 'vigan-10',  filename: 'crisologo-museum',        query: 'Crisologo Museum Vigan Philippines' },
  { id: 'vigan-11',  filename: 'plaza-burgos-night',      query: 'Plaza Burgos night market Vigan Philippines' },
  { id: 'vigan-12',  filename: 'hidden-garden-vigan',     query: 'Hidden Garden Vigan Philippines' },
  { id: 'vigan-g1',  filename: 'bantay-church',           query: 'Bantay Church bell tower Ilocos Sur Philippines' },
  { id: 'vigan-g2',  filename: 'national-museum-ilocos',  query: 'National Museum Ilocos Philippines' },
  { id: 'vigan-g3',  filename: 'plaza-burgos',            query: 'Plaza Burgos Vigan Philippines' },
  { id: 'vigan-g4',  filename: 'rg-jar-factory',          query: 'burnay pottery workshop Philippines' },
  { id: 'vigan-g5',  filename: 'bicentennial-park-vigan', query: 'Bicentennial Park Vigan Philippines' },

  // Pangasinan
  { id: 'pangasinan-1',  filename: 'hundred-islands',        query: 'Hundred Islands National Park Pangasinan Philippines' },
  { id: 'pangasinan-2',  filename: 'quezon-island',          query: 'Quezon Island Hundred Islands Pangasinan Philippines' },
  { id: 'pangasinan-3',  filename: 'bolinao-falls',          query: 'Bolinao Falls Pangasinan Philippines' },
  { id: 'pangasinan-4',  filename: 'cape-bolinao-lighthouse',query: 'Cape Bolinao Lighthouse Pangasinan Philippines' },
  { id: 'pangasinan-5',  filename: 'patar-beach',            query: 'Patar Beach Bolinao Pangasinan Philippines' },
  { id: 'pangasinan-6',  filename: 'manaoag-church',         query: 'Manaoag Church Pangasinan Philippines' },
  { id: 'pangasinan-7',  filename: 'enchanted-cave',         query: 'Enchanted Cave Bolinao Pangasinan Philippines' },
  { id: 'pangasinan-8',  filename: 'lingayen-beach',         query: 'Lingayen Beach Pangasinan Philippines' },
  { id: 'pangasinan-9',  filename: 'bangus-food',            query: 'bangus milkfish grilled Philippines food' },
  { id: 'pangasinan-10', filename: 'bolinao-marine-lab',     query: 'Bolinao marine Philippines coral reef' },
  { id: 'pangasinan-11', filename: 'governors-beach',        query: "Governor's Beach Lingayen Pangasinan Philippines" },
  { id: 'pangasinan-12', filename: 'dagupan-bangus-market',  query: 'fish market Philippines bangus Dagupan' },
  { id: 'pangasinan-g1', filename: 'patar-white-sand',       query: 'Patar white sand beach Bolinao Philippines' },
  { id: 'pangasinan-g2', filename: 'blue-lagoon-bolinao',    query: 'Blue Lagoon Bolinao Pangasinan Philippines' },
  { id: 'pangasinan-g3', filename: 'tondol-beach',           query: 'Tondol white sand beach Anda Pangasinan Philippines' },
  { id: 'pangasinan-g4', filename: 'masamirey-beach',        query: 'Masamirey white sand beach Pangasinan Philippines' },
  { id: 'pangasinan-g5', filename: 'lucap-wharf',            query: 'Lucap Wharf Alaminos Pangasinan Philippines' },
  { id: 'pangasinan-g6', filename: 'bued-mangrove',          query: 'mangrove forest Philippines' },
  { id: 'pangasinan-g7', filename: 'camp-puor',              query: 'Camp Puor Pangasinan Philippines' },
  { id: 'pangasinan-g8', filename: 'estanza-beach',          query: 'Estanza Beach Pangasinan Philippines' },
];

function get(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return get(res.headers.location, headers).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function searchPexels(query) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`;
  const res = await get(url, { Authorization: API_KEY });
  if (res.status !== 200) throw new Error(`Pexels error ${res.status}: ${res.body.toString()}`);
  const data = JSON.parse(res.body.toString());
  return data.photos?.[0] ?? null;
}

async function downloadFile(url, dest) {
  const res = await get(url, {});
  fs.writeFileSync(dest, res.body);
}

async function main() {
  const placeImageEntries = [];
  const failed = [];

  for (const place of PLACES) {
    const destPath = path.join(OUT_DIR, `${place.filename}.jpg`);
    if (fs.existsSync(destPath)) {
      console.log(`⏭  ${place.id} — already exists, skipping`);
      placeImageEntries.push({ id: place.id, filename: place.filename });
      continue;
    }

    process.stdout.write(`🔍 ${place.id} — searching "${place.query}"... `);
    try {
      const photo = await searchPexels(place.query);
      if (!photo) {
        console.log('no results');
        failed.push(place.id);
        continue;
      }
      const imgUrl = photo.src.large;
      await downloadFile(imgUrl, destPath);
      console.log(`✓ saved (by ${photo.photographer})`);
      placeImageEntries.push({ id: place.id, filename: place.filename });
      // Respect rate limit
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.log(`✗ error: ${err.message}`);
      failed.push(place.id);
    }
  }

  console.log('\n─────────────────────────────────────────');
  console.log('Add these to src/data/placeImages.js:\n');
  for (const { id, filename } of placeImageEntries) {
    console.log(`  '${id}': require('../../assets/images/places/${filename}.webp'),`);
  }

  if (failed.length) {
    console.log('\n⚠  No results found for:');
    failed.forEach(id => console.log(`  - ${id}`));
  }

  console.log('\n─────────────────────────────────────────');
  console.log('Next: convert downloaded .jpg files to .webp');
  console.log('Run: npx @squoosh/cli --webp \'{"quality":82}\' assets/images/places/*.jpg');
  console.log('Then delete the .jpg files.');
}

main();
