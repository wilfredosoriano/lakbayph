#!/usr/bin/env node
/**
 * scripts/fetchWikimediaImages.js
 *
 * Fetches permanent Wikimedia Commons image URLs for every place in the app.
 * Images never expire — run once, commit the output, never run again.
 *
 * Outputs: scripts/output/wikimediaImages.json
 * Run:     node scripts/fetchWikimediaImages.js
 *
 * No API key required. Respects Wikipedia's rate limit (~5 req/s).
 * Safe to interrupt — resumes from where it left off.
 */

const fs   = require('fs');
const path = require('path');

const PLACES_PATH = path.join(__dirname, '..', 'src', 'data', 'placesData.js');
const BUILD_PATH  = path.join(__dirname, 'buildPlacesData.js');
const OUT_PATH    = path.join(__dirname, 'output', 'wikimediaImages.json');
const THUMB_SIZE  = 800;

// App names that differ from the Wikipedia article title.
// Maps norm(appName) → wiki search term.
const WIKI_ALIASES = {
  '7 commandos beach':              'Seven Commandos Beach Philippines',
  'hanging coffins of echo valley': 'Hanging Coffins of Sagada',
  'man-made forest':                'Bilar Man-Made Forest Bohol',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

function norm(s) {
  return (s || '').toLowerCase()
    .replace(/[ñ]/g, 'n').replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i').replace(/[óòöô]/g, 'o').replace(/[úùüû]/g, 'u')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── Parser ────────────────────────────────────────────────────────────────────
// Extracts the text of a named JS object literal from source, respecting braces.
function extractSection(content, objectName) {
  const re    = new RegExp(`(?:export )?const ${objectName}\\s*=\\s*\\{`);
  const match = re.exec(content);
  if (!match) return null;

  let depth = 0;
  let start = match.index + match[0].length - 1; // opening {
  let end   = start;

  for (let i = start; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  return content.slice(start, end + 1);
}

function parsePlaces(filePath, objectName) {
  const content = fs.readFileSync(filePath, 'utf8');
  const section = extractSection(content, objectName);
  if (!section) return [];

  const places = [];
  let currentDest = null;

  for (const line of section.split('\n')) {
    // Destination key:  Coron: [  or  'El Nido': [
    const destMatch = line.match(/^\s{2,4}['"]?([\w][\w\s,.']+?)['"]?\s*:\s*\[/);
    if (destMatch) {
      currentDest = destMatch[1].trim().replace(/'/g, '');
    }

    const nameMatch = line.match(/^\s+name:\s*['"]([^'"]+)['"]/);
    if (nameMatch && currentDest) {
      places.push({ name: nameMatch[1], dest: currentDest });
    }
  }

  return places;
}

// ── Image APIs ────────────────────────────────────────────────────────────────

// Wikimedia Commons file search — searches the actual image repository.
// Works even for places without a Wikipedia article.
async function fetchFromCommons(searchTerm) {
  try {
    const params = new URLSearchParams({
      action:      'query',
      generator:   'search',
      gsrsearch:   searchTerm,
      gsrnamespace:'6',          // File namespace
      gsrlimit:    '10',
      prop:        'imageinfo',
      iiprop:      'url|mime',
      iiurlwidth:  String(THUMB_SIZE),
      format:      'json',
      origin:      '*',
    });

    const res  = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
    const data = await res.json();
    const pages = Object.values(data.query?.pages ?? {});

    for (const page of pages) {
      const info = page.imageinfo?.[0];
      if (!info) continue;
      // Only photos — skip SVGs, GIFs, maps, logos
      if (!info.mime?.startsWith('image/jpeg') && !info.mime?.startsWith('image/png')) continue;
      const url = info.thumburl || info.url;
      if (url) return url;
    }
  } catch { /* fall through */ }
  return null;
}

// Wikipedia article page image — works best for very well-known landmarks.
async function fetchFromWikipedia(searchTerm) {
  try {
    const searchParams = new URLSearchParams({
      action:   'query',
      list:     'search',
      srsearch: searchTerm,
      srlimit:  '3',
      format:   'json',
      origin:   '*',
    });

    const searchRes  = await fetch(`https://en.wikipedia.org/w/api.php?${searchParams}`);
    const searchData = await searchRes.json();
    const results    = searchData.query?.search ?? [];
    if (!results.length) return null;

    await sleep(80);

    const pageId    = results[0].pageid;
    const imgParams = new URLSearchParams({
      action:      'query',
      pageids:     String(pageId),
      prop:        'pageimages',
      pithumbsize: String(THUMB_SIZE),
      format:      'json',
      origin:      '*',
    });

    const imgRes  = await fetch(`https://en.wikipedia.org/w/api.php?${imgParams}`);
    const imgData = await imgRes.json();
    const page    = imgData.query?.pages?.[String(pageId)];

    return page?.thumbnail?.source ?? null;
  } catch { /* fall through */ }
  return null;
}

async function fetchWikiImage(name, dest) {
  const normName = norm(name);
  const alias    = WIKI_ALIASES[normName];

  // Try progressively broader Commons queries — no "Philippines" requirement
  // since most Commons files don't include country names in their descriptions
  const commonsQueries = alias
    ? [`"${alias}"`, `${alias} Philippines`]
    : [
        `"${name}"`,
        `"${name}" ${dest}`,
        `${name} ${dest}`,
      ];

  for (const q of commonsQueries) {
    const url = await fetchFromCommons(q);
    if (url) return url;
    await sleep(80);
  }

  // Fall back to Wikipedia article page image
  const wikiQuery = alias ?? `${name} ${dest} Philippines`;
  return fetchFromWikipedia(wikiQuery);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const fromPlaces = parsePlaces(PLACES_PATH, 'PLACES_BY_DESTINATION');
  const fromBuild  = parsePlaces(BUILD_PATH,  'NEW_PLACES');

  // Deduplicate by normalized name
  const seen = new Set();
  const all  = [];
  for (const p of [...fromPlaces, ...fromBuild]) {
    const key = norm(p.name);
    if (!seen.has(key)) { seen.add(key); all.push(p); }
  }

  console.log('\nLakbayPH — Wikimedia Image Fetcher');
  console.log(`${all.length} unique places found\n`);

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });

  // Load existing results — allows safe resume after interruption
  let results = {};
  if (fs.existsSync(OUT_PATH)) {
    results = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
    const done = Object.keys(results).length;
    console.log(`Resuming — ${done} already processed\n`);
  }

  let found = 0, missing = 0, skipped = 0;

  for (let i = 0; i < all.length; i++) {
    const { name, dest } = all[i];
    const key = norm(name);

    if (key in results) {
      skipped++;
      continue;
    }

    process.stdout.write(`[${i + 1}/${all.length}] ${name} ... `);

    const url = await fetchWikiImage(name, dest);

    results[key] = url; // null stored so we skip on resume
    if (url) { found++;   console.log('✓'); }
    else      { missing++; console.log('✗ not found'); }

    if ((i + 1) % 10 === 0) {
      fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2), 'utf8');
    }

    await sleep(200); // ~5 req/s — well within Wikipedia's limits
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2), 'utf8');

  console.log([
    '',
    '✓ Done!',
    `  Found   : ${found + skipped} / ${all.length}`,
    `  Missing : ${missing}`,
    `  Saved   : scripts/output/wikimediaImages.json`,
    '',
    'For missing images, manually add entries to wikimediaImages.json:',
    '  "normalized place name": "https://upload.wikimedia.org/..."',
    '',
    'Next: node scripts/buildPlacesData.js',
    '',
  ].join('\n'));
}

main().catch(err => {
  console.error(`\nFatal: ${err.message}`);
  process.exit(1);
});
