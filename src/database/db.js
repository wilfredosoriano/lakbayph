import * as SQLite from 'expo-sqlite';

let db = null;

// ── Open & initialise the database ─────────────────────────────────────────
export async function initDB() {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('lakbayph.db');

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS budgets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id     TEXT    NOT NULL DEFAULT '1',
      total       REAL    NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id     TEXT    NOT NULL DEFAULT '1',
      amount      REAL    NOT NULL,
      category    TEXT    NOT NULL,
      note        TEXT,
      date        TEXT    NOT NULL,
      created_at  TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trips (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      destination TEXT NOT NULL,
      dates       TEXT NOT NULL,
      days        INTEGER NOT NULL,
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trip_activities (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id     INTEGER NOT NULL,
      day         INTEGER NOT NULL,
      time        TEXT NOT NULL,
      title       TEXT NOT NULL,
      subtitle    TEXT,
      category    TEXT NOT NULL DEFAULT 'other',
      cost        REAL NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS saved_locations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      region      TEXT NOT NULL,
      latitude    REAL NOT NULL,
      longitude   REAL NOT NULL,
      starred     INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL
    );
  `);

  // Migrate: add emoji column to trips if it doesn't exist yet
  try {
    await db.execAsync(`ALTER TABLE trips ADD COLUMN emoji TEXT NOT NULL DEFAULT '✈️'`);
  } catch (_) { /* column already exists */ }

  // Migrate: add done column to trip_activities
  try {
    await db.execAsync(`ALTER TABLE trip_activities ADD COLUMN done INTEGER NOT NULL DEFAULT 0`);
  } catch (_) { /* column already exists */ }

  // Migrate: add photo_uri column to trip_activities
  try {
    await db.execAsync(`ALTER TABLE trip_activities ADD COLUMN photo_uri TEXT`);
  } catch (_) { /* column already exists */ }

  // Migrate: add notes column to trip_activities
  try {
    await db.execAsync(`ALTER TABLE trip_activities ADD COLUMN notes TEXT`);
  } catch (_) { /* column already exists */ }

  // Migrate: add location column to trip_activities
  try {
    await db.execAsync(`ALTER TABLE trip_activities ADD COLUMN location TEXT`);
  } catch (_) { /* column already exists */ }

  // Migrate: add sort_order column to trip_activities
  try {
    await db.execAsync(`ALTER TABLE trip_activities ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`);
  } catch (_) { /* column already exists */ }

  // Migrate: create day_labels table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS day_labels (
      trip_id  INTEGER NOT NULL,
      day      INTEGER NOT NULL,
      label    TEXT    NOT NULL DEFAULT '',
      PRIMARY KEY (trip_id, day)
    );
  `);

  // Migrate: create packing_items table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS packing_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id    INTEGER NOT NULL,
      item       TEXT    NOT NULL,
      checked    INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL
    );
  `);

  // Seed a default budget if none exists
  const existing = await db.getFirstAsync(
    `SELECT id FROM budgets WHERE trip_id = '1' LIMIT 1`
  );
  if (!existing) {
    await db.runAsync(
      `INSERT INTO budgets (trip_id, total, created_at) VALUES ('1', 0, ?)`,
      [new Date().toISOString()]
    );
  } else if (existing) {
    // One-time migration: reset the old hardcoded ₱20,000 default to 0
    await db.runAsync(
      `UPDATE budgets SET total = 0 WHERE trip_id = '1' AND total = 20000`
    );
  }

  return db;
}

// ── Settings ────────────────────────────────────────────────────────────────
export async function getSetting(key, defaultValue = null) {
  const d = await initDB();
  const row = await d.getFirstAsync(`SELECT value FROM settings WHERE key = ?`, [key]);
  return row ? row.value : defaultValue;
}

export async function setSetting(key, value) {
  const d = await initDB();
  await d.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, String(value)]
  );
}

// ── Budget ──────────────────────────────────────────────────────────────────
export async function getBudget(tripId = '1') {
  const d = await initDB();
  return d.getFirstAsync(`SELECT * FROM budgets WHERE trip_id = ? LIMIT 1`, [tripId]);
}

export async function updateBudgetTotal(total, tripId = '1') {
  const d = await initDB();
  await d.runAsync(`UPDATE budgets SET total = ? WHERE trip_id = ?`, [total, tripId]);
}

// ── Expenses ────────────────────────────────────────────────────────────────
// month = 'YYYY-MM' e.g. '2025-05', or null for all
export async function getExpenses(tripId = '1', month = null) {
  const d = await initDB();
  if (month) {
    return d.getAllAsync(
      `SELECT * FROM expenses WHERE trip_id = ? AND strftime('%Y-%m', date) = ?
       ORDER BY date DESC, created_at DESC`,
      [tripId, month]
    );
  }
  return d.getAllAsync(
    `SELECT * FROM expenses WHERE trip_id = ? ORDER BY date DESC, created_at DESC`,
    [tripId]
  );
}

export async function getExpenseMonths(tripId = '1') {
  const d = await initDB();
  return d.getAllAsync(
    `SELECT DISTINCT strftime('%Y-%m', date) as month FROM expenses
     WHERE trip_id = ? ORDER BY month DESC`,
    [tripId]
  );
}

export async function addExpense({ tripId = '1', amount, category, note, date }) {
  const d = await initDB();
  const result = await d.runAsync(
    `INSERT INTO expenses (trip_id, amount, category, note, date, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [tripId, amount, category, note || '', date, new Date().toISOString()]
  );
  return result.lastInsertRowId;
}

export async function deleteExpense(id) {
  const d = await initDB();
  await d.runAsync(`DELETE FROM expenses WHERE id = ?`, [id]);
}

// ── Computed totals ─────────────────────────────────────────────────────────
// month = 'YYYY-MM' or null for all time
export async function getBudgetSummary(tripId = '1', month = null) {
  const d = await initDB();

  const budget = await getBudget(tripId);
  const filter = month
    ? `AND strftime('%Y-%m', date) = '${month}'`
    : '';

  const totals = await d.getAllAsync(
    `SELECT category, SUM(amount) as total FROM expenses
     WHERE trip_id = ? ${filter} GROUP BY category`,
    [tripId]
  );
  const spent = await d.getFirstAsync(
    `SELECT SUM(amount) as total FROM expenses WHERE trip_id = ? ${filter}`,
    [tripId]
  );

  const spentTotal = spent?.total ?? 0;
  const budgetTotal = budget?.total ?? 0;

  // Build breakdown with percentages
  const breakdown = totals.map(row => ({
    category: row.category,
    amount:   Math.round(row.total),
    percentage: spentTotal > 0 ? Math.round((row.total / spentTotal) * 100) : 0,
    ...CATEGORY_META[row.category],
  }));

  return {
    total:     budgetTotal,
    spent:     Math.round(spentTotal),
    remaining: Math.round(budgetTotal - spentTotal),
    breakdown,
  };
}

// ── Trips ────────────────────────────────────────────────────────────────────
export async function getTrips() {
  const d = await initDB();
  return d.getAllAsync(`SELECT * FROM trips ORDER BY created_at DESC`);
}

export async function getTrip(id) {
  const d = await initDB();
  return d.getFirstAsync(`SELECT * FROM trips WHERE id = ?`, [id]);
}

export async function createTrip({ name, destination, dates, days, emoji = '✈️' }) {
  const d = await initDB();
  const result = await d.runAsync(
    `INSERT INTO trips (name, destination, dates, days, emoji, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [name, destination, dates, days, emoji, new Date().toISOString()]
  );
  return result.lastInsertRowId;
}

export async function updateTrip(id, { name, destination, dates, days, emoji }) {
  const d = await initDB();
  await d.runAsync(
    `UPDATE trips SET name = ?, destination = ?, dates = ?, days = ?, emoji = ? WHERE id = ?`,
    [name, destination, dates, days, emoji, id]
  );
}

export async function duplicateTrip(tripId) {
  const d = await initDB();
  const trip = await d.getFirstAsync(`SELECT * FROM trips WHERE id = ?`, [tripId]);
  if (!trip) return null;

  const result = await d.runAsync(
    `INSERT INTO trips (name, destination, dates, days, emoji, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [`${trip.name} (Copy)`, trip.destination, trip.dates, trip.days, trip.emoji, new Date().toISOString()]
  );
  const newTripId = result.lastInsertRowId;

  const activities = await d.getAllAsync(`SELECT * FROM trip_activities WHERE trip_id = ?`, [tripId]);
  for (const a of activities) {
    await d.runAsync(
      `INSERT INTO trip_activities (trip_id, day, time, title, subtitle, category, cost, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newTripId, a.day, a.time, a.title, a.subtitle || '', a.category, a.cost || 0, a.notes || '', new Date().toISOString()]
    );
  }

  return newTripId;
}

export async function deleteTrip(id) {
  const d = await initDB();
  await d.runAsync(`DELETE FROM trip_activities WHERE trip_id = ?`, [id]);
  await d.runAsync(`DELETE FROM trips WHERE id = ?`, [id]);
}

// ── Trip Activities ──────────────────────────────────────────────────────────
export async function getTripActivities(tripId, day) {
  const d = await initDB();
  return d.getAllAsync(
    `SELECT * FROM trip_activities WHERE trip_id = ? AND day = ? ORDER BY sort_order ASC, time ASC, created_at ASC`,
    [tripId, day]
  );
}

export async function reorderActivities(orderedIds) {
  const d = await initDB();
  for (let i = 0; i < orderedIds.length; i++) {
    await d.runAsync(`UPDATE trip_activities SET sort_order = ? WHERE id = ?`, [i, orderedIds[i]]);
  }
}

export async function getAllTripActivities(tripId) {
  const d = await initDB();
  return d.getAllAsync(
    `SELECT * FROM trip_activities WHERE trip_id = ? ORDER BY day ASC, sort_order ASC, time ASC, created_at ASC`,
    [tripId]
  );
}

export async function addTripActivity({ tripId, day, time, title, subtitle, category, cost, notes }) {
  const d = await initDB();
  const lastSortRow = await d.getFirstAsync(
    `SELECT COALESCE(MAX(sort_order), -1) as max_sort_order FROM trip_activities WHERE trip_id = ? AND day = ?`,
    [tripId, day]
  );
  const nextSortOrder = (lastSortRow?.max_sort_order ?? -1) + 1;
  const result = await d.runAsync(
    `INSERT INTO trip_activities (trip_id, day, time, title, subtitle, category, cost, notes, created_at, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tripId, day, time, title, subtitle || '', category, cost || 0, notes || '', new Date().toISOString(), nextSortOrder]
  );
  return result.lastInsertRowId;
}

export async function updateTripActivity({ id, time, title, subtitle, category, notes }) {
  const d = await initDB();
  await d.runAsync(
    `UPDATE trip_activities
     SET time = ?, title = ?, subtitle = ?, category = ?, notes = ?
     WHERE id = ?`,
    [time, title, subtitle || '', category, notes || '', id]
  );
}

export async function updateActivityNotes(id, notes) {
  const d = await initDB();
  await d.runAsync(`UPDATE trip_activities SET notes = ? WHERE id = ?`, [notes, id]);
}

export async function updateActivityLocation(id, location) {
  const d = await initDB();
  await d.runAsync(`UPDATE trip_activities SET location = ? WHERE id = ?`, [location, id]);
}

export async function deleteTripActivity(id) {
  const d = await initDB();
  await d.runAsync(`DELETE FROM trip_activities WHERE id = ?`, [id]);
}

export async function updateActivityPhotos(id, photosArray) {
  const d = await initDB();
  await d.runAsync(`UPDATE trip_activities SET photo_uri = ? WHERE id = ?`, [JSON.stringify(photosArray), id]);
}

export async function toggleActivityDone(id, done) {
  const d = await initDB();
  await d.runAsync(`UPDATE trip_activities SET done = ? WHERE id = ?`, [done ? 1 : 0, id]);
}

// ── Saved Locations ──────────────────────────────────────────────────────────
export async function getSavedLocations() {
  const d = await initDB();
  return d.getAllAsync(`SELECT * FROM saved_locations ORDER BY starred DESC, created_at DESC`);
}

export async function addSavedLocation({ name, region, latitude, longitude }) {
  const d = await initDB();
  // Avoid duplicates
  const existing = await d.getFirstAsync(
    `SELECT id FROM saved_locations WHERE name = ? LIMIT 1`, [name]
  );
  if (existing) return existing.id;
  const result = await d.runAsync(
    `INSERT INTO saved_locations (name, region, latitude, longitude, starred, created_at) VALUES (?, ?, ?, ?, 0, ?)`,
    [name, region, latitude, longitude, new Date().toISOString()]
  );
  return result.lastInsertRowId;
}

export async function deleteSavedLocation(id) {
  const d = await initDB();
  await d.runAsync(`DELETE FROM saved_locations WHERE id = ?`, [id]);
}

export async function toggleSavedLocationStar(id, starred) {
  const d = await initDB();
  await d.runAsync(`UPDATE saved_locations SET starred = ? WHERE id = ?`, [starred ? 1 : 0, id]);
}

export async function searchActivities(query) {
  const d = await initDB();
  const like = `%${query}%`;
  return await d.getAllAsync(`
    SELECT ta.*, t.name as trip_name, t.destination, t.emoji as trip_emoji
    FROM trip_activities ta
    JOIN trips t ON t.id = ta.trip_id
    WHERE ta.title LIKE ? OR ta.subtitle LIKE ? OR ta.notes LIKE ? OR ta.location LIKE ?
    ORDER BY t.name ASC, ta.day ASC, ta.time ASC
  `, [like, like, like, like]);
}

export async function searchTrips(query) {
  const d = await initDB();
  const like = `%${query}%`;
  return await d.getAllAsync(`
    SELECT * FROM trips
    WHERE name LIKE ? OR destination LIKE ?
    ORDER BY created_at DESC
  `, [like, like]);
}

export async function getPackingItems(tripId) {
  const d = await initDB();
  return await d.getAllAsync(`SELECT * FROM packing_items WHERE trip_id = ? ORDER BY created_at ASC`, [tripId]);
}

export async function addPackingItem(tripId, item) {
  const d = await initDB();
  await d.runAsync(
    `INSERT INTO packing_items (trip_id, item, checked, created_at) VALUES (?, ?, 0, ?)`,
    [tripId, item.trim(), new Date().toISOString()]
  );
}

export async function togglePackingItem(id, checked) {
  const d = await initDB();
  await d.runAsync(`UPDATE packing_items SET checked = ? WHERE id = ?`, [checked ? 1 : 0, id]);
}

export async function deletePackingItem(id) {
  const d = await initDB();
  await d.runAsync(`DELETE FROM packing_items WHERE id = ?`, [id]);
}

export async function getDayLabel(tripId, day) {
  const d = await initDB();
  const row = await d.getFirstAsync(`SELECT label FROM day_labels WHERE trip_id = ? AND day = ?`, [tripId, day]);
  return row?.label || '';
}

export async function setDayLabel(tripId, day, label) {
  const d = await initDB();
  await d.runAsync(
    `INSERT INTO day_labels (trip_id, day, label) VALUES (?, ?, ?)
     ON CONFLICT(trip_id, day) DO UPDATE SET label = excluded.label`,
    [tripId, day, label]
  );
}

// Category colours & icons (used in breakdown)
export const CATEGORIES = ['Transport', 'Food', 'Activities', 'Accommodation', 'Others'];

export const CATEGORY_META = {
  Transport:     { color: '#D62828', icon: 'bus' },
  Food:          { color: '#F4A261', icon: 'restaurant' },
  Activities:    { color: '#3B82F6', icon: 'compass' },
  Accommodation: { color: '#10B981', icon: 'bed' },
  Others:        { color: '#8B5CF6', icon: 'ellipse' },
};
