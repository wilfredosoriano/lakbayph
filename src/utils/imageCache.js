/**
 * Offline image cache using expo-file-system.
 *
 * Flow:
 *   1. App starts → preCacheAll() runs in the background
 *   2. Each image URL is downloaded once to device storage
 *   3. A registry file (cache-registry.json) maps placeId → { uri, cachedAt }
 *   4. CachedImage component reads the registry to resolve URIs offline
 *   5. Images older than 30 days are re-downloaded to comply with Google's ToS
 */

import * as FileSystem from 'expo-file-system/legacy';

const CACHE_DIR     = FileSystem.documentDirectory + 'place-images/';
const REGISTRY_PATH = CACHE_DIR + 'cache-registry.json';
const MAX_AGE_MS    = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

// In-memory registry loaded once at startup
let _registry = null;

// ── Registry helpers ──────────────────────────────────────────────────────────

async function loadRegistry() {
  if (_registry) return _registry;
  try {
    const info = await FileSystem.getInfoAsync(REGISTRY_PATH);
    if (info.exists) {
      const json = await FileSystem.readAsStringAsync(REGISTRY_PATH);
      const parsed = JSON.parse(json);
      // Migrate old format (string URI → object)
      const migrated = {};
      for (const [id, val] of Object.entries(parsed)) {
        migrated[id] = typeof val === 'string' ? { uri: val, cachedAt: 0 } : val;
      }
      _registry = migrated;
    } else {
      _registry = {};
    }
  } catch {
    _registry = {};
  }
  return _registry;
}

async function saveRegistry(registry) {
  _registry = registry;
  await FileSystem.writeAsStringAsync(REGISTRY_PATH, JSON.stringify(registry));
}

async function ensureCacheDir() {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

function isExpired(entry) {
  if (!entry?.cachedAt) return true;
  return Date.now() - entry.cachedAt > MAX_AGE_MS;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the local file URI for a place image, or null if not cached / expired.
 * Synchronous after the registry is loaded.
 */
export function getCachedUriSync(placeId) {
  if (!_registry) return null;
  const entry = _registry[placeId];
  if (!entry || isExpired(entry)) return null;
  return entry.uri;
}

/**
 * Async version — waits for registry to load if needed.
 */
export async function getCachedUri(placeId) {
  const reg = await loadRegistry();
  const entry = reg[placeId];
  if (!entry || isExpired(entry)) return null;
  return entry.uri;
}

/**
 * Download a single image and register it.
 * Returns the local URI on success, null on failure.
 */
export async function downloadAndCache(placeId, url) {
  if (!url || !placeId) return null;
  try {
    await ensureCacheDir();
    const reg = await loadRegistry();

    const entry = reg[placeId];

    // Check if already downloaded, file still exists, and not expired
    if (entry && !isExpired(entry)) {
      const info = await FileSystem.getInfoAsync(entry.uri);
      if (info.exists) return entry.uri;
    }

    // Download (or re-download if expired)
    const localPath = CACHE_DIR + placeId.replace(/[^a-z0-9-]/gi, '_') + '.jpg';
    const result = await FileSystem.downloadAsync(url, localPath);

    if (result.status === 200) {
      reg[placeId] = { uri: result.uri, cachedAt: Date.now() };
      await saveRegistry(reg);
      return result.uri;
    }
  } catch {
    // silently fail — app still works with remote URL as fallback
  }
  return null;
}

/**
 * Pre-cache all place images in the background.
 * Call once on app startup (non-blocking — await is optional).
 *
 * @param {Array} allPlaces  flat array of all place objects from placesData.js
 * @param {function} onProgress  optional callback(done, total)
 */
export async function preCacheAll(allPlaces, onProgress) {
  const placesWithImages = allPlaces.filter(p => p.image && p.id);
  const total = placesWithImages.length;
  let done = 0;

  const reg = await loadRegistry();

  for (const place of placesWithImages) {
    const entry = reg[place.id];
    // Skip if already cached, file exists, and not expired
    if (entry && !isExpired(entry)) {
      const info = await FileSystem.getInfoAsync(entry.uri);
      if (info.exists) {
        done++;
        onProgress?.(done, total);
        continue;
      }
    }

    await downloadAndCache(place.id, place.image);
    done++;
    onProgress?.(done, total);
  }
}

/**
 * How many images are already cached (for showing progress to the user).
 */
export async function getCacheStats(allPlaces) {
  const reg = await loadRegistry();
  const total = allPlaces.filter(p => p.image).length;
  let cached = 0;
  for (const place of allPlaces) {
    if (place.image && reg[place.id] && !isExpired(reg[place.id])) cached++;
  }
  return { cached, total };
}

/**
 * Delete all cached images (e.g. for a "Clear Cache" settings option).
 */
export async function clearCache() {
  try {
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    _registry = {};
  } catch {}
}
