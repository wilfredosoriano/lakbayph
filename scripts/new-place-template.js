#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PLACES_DATA_PATH = path.join(PROJECT_ROOT, 'src', 'data', 'placesData.js');
const VALID_CATEGORIES = ['beach', 'nature', 'food', 'landmark', 'activity', 'shopping'];
const VALID_TRAVEL_KEYS = ['walk', 'tricycle', 'jeepney', 'van', 'ferry'];

function parseArgs(argv) {
  const args = {
    destination: '',
    name: '',
    category: 'landmark',
    description: 'Add description here.',
    mustVisit: false,
    entranceFee: 0,
    mapsUrl: '',
    travel: {},
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === '--destination' || arg === '-d') {
      args.destination = next || '';
      i += 1;
    } else if (arg === '--name' || arg === '-n') {
      args.name = next || '';
      i += 1;
    } else if (arg === '--category' || arg === '-c') {
      args.category = next || 'landmark';
      i += 1;
    } else if (arg === '--description') {
      args.description = next || args.description;
      i += 1;
    } else if (arg === '--must-visit') {
      args.mustVisit = true;
    } else if (arg === '--fee') {
      args.entranceFee = Number(next || 0);
      i += 1;
    } else if (arg === '--maps-url' || arg === '--url') {
      args.mapsUrl = next || '';
      i += 1;
    } else if (arg.startsWith('--travel-')) {
      const key = arg.replace('--travel-', '');
      if (VALID_TRAVEL_KEYS.includes(key)) {
        args.travel[key] = next || null;
        i += 1;
      }
    }
  }

  return args;
}

function loadPlacesModule() {
  const source = fs.readFileSync(PLACES_DATA_PATH, 'utf8');
  const transformed = `${source
    .replace(/export const /g, 'const ')
    .replace(/export function /g, 'function ')
  }\nmodule.exports = { PLACES_BY_DESTINATION, matchDestination };`;

  const sandbox = {
    module: { exports: {} },
    exports: {},
    require,
    console,
  };

  vm.runInNewContext(transformed, sandbox, { filename: PLACES_DATA_PATH });
  return sandbox.module.exports;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractGoogleMapsCoordinates(url) {
  if (!url) return null;

  const exactMatch = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (exactMatch) {
    return {
      latitude: Number(exactMatch[1]),
      longitude: Number(exactMatch[2]),
    };
  }

  const viewMatch = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),/);
  if (viewMatch) {
    return {
      latitude: Number(viewMatch[1]),
      longitude: Number(viewMatch[2]),
    };
  }

  return null;
}

function buildTravelObject(inputTravel) {
  const travel = {};
  for (const key of VALID_TRAVEL_KEYS) {
    travel[key] = inputTravel[key] ?? null;
  }
  return travel;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { PLACES_BY_DESTINATION, matchDestination } = loadPlacesModule();

  if (!args.destination) {
    throw new Error('Missing --destination');
  }
  if (!args.name) {
    throw new Error('Missing --name');
  }
  if (!VALID_CATEGORIES.includes(args.category)) {
    throw new Error(`Invalid --category. Use one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  const destinationKey = matchDestination(args.destination) || args.destination;
  const destinationPlaces = PLACES_BY_DESTINATION[destinationKey];
  if (!destinationPlaces) {
    const available = Object.keys(PLACES_BY_DESTINATION).sort().join(', ');
    throw new Error(`Destination "${args.destination}" not found. Available: ${available}`);
  }

  const coordinates = extractGoogleMapsCoordinates(args.mapsUrl);
  if (!coordinates) {
    throw new Error('Could not extract coordinates from --maps-url');
  }

  const existingIds = destinationPlaces
    .map((place) => place.id)
    .filter((id) => typeof id === 'string');
  const prefix = slugify(destinationKey).replace(/-/g, '');
  const nextNumber = destinationPlaces.length + 1;
  let suggestedId = `${prefix}-${nextNumber}`;

  if (existingIds.includes(suggestedId)) {
    let counter = nextNumber + 1;
    while (existingIds.includes(`${prefix}-${counter}`)) {
      counter += 1;
    }
    suggestedId = `${prefix}-${counter}`;
  }

  const placeObject = [
    '{',
    `  id: '${suggestedId}',`,
    `  name: '${args.name.replace(/'/g, '\\\'')}',`,
    `  category: '${args.category}',`,
    `  description: '${args.description.replace(/'/g, '\\\'')}',`,
    `  mustVisit: ${args.mustVisit ? 'true' : 'false'},`,
    `  entranceFee: ${Number.isFinite(args.entranceFee) ? args.entranceFee : 0},`,
    `  coordinates: [${coordinates.longitude}, ${coordinates.latitude}],`,
    `  travel: ${JSON.stringify(buildTravelObject(args.travel)).replace(/"([^"]+)":/g, '$1:')},`,
    '}',
  ].join('\n');

  process.stdout.write(`Destination: ${destinationKey}\n`);
  process.stdout.write(`Suggested ID: ${suggestedId}\n\n`);
  process.stdout.write(`${placeObject}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
