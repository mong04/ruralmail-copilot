import { openDB, type DBSchema } from 'idb';

// Define schema for TypeScript safety (per idb docs: https://github.com/jakearchibald/idb)
interface RuralMailDB extends DBSchema {
  routes: {
    key: string;
    value: RouteData;
  };
  settings: {
    key: string;
    value: SettingsData;
  };
  packages: {
    key: string;
    value: PackageData;
  };
  hud: {
    key: string;
    value: HudData;
  };
}

export type Stop = {
  id: string;
  address_line1: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  lat: number;
  lng: number;
  notes?: string;
  full_address?: string; // Computed on load/save
};

export type RouteData = Stop[];

// ✅ ADDED new fields to SettingsData
export type SettingsData = {
  defaultCity?: string;
  defaultState?: string;
  defaultZip?: string;
  defaultRouteName?: string; // e.g., "Route 7"
  preferredNavApp?: 'in-app' | 'google' | 'apple' | 'waze';
  theme?: 'light' | 'dark'; // ✅ ADDED
};

export type Package = {
  id: string;
  tracking?: string;
  size: 'large' | 'medium' | 'small';
  notes?: string; // This is for "Load Location / Notes"
  assignedStopId?: string;
  assignedStopNumber?: number;
  assignedAddress?: string; // The canonical, matched address
  delivered?: boolean;
};

export type PackageData = {
  date: string; // YYYY-MM-DD for daily
  packages: Package[];
};

export type HudData = {
  currentStop: number;
  weatherAlerts: string[]; // Cached alerts
};

/**
 * Opens or creates the IndexedDB database with schema.
 * @returns {Promise<IDBPDatabase<RuralMailDB>>} The opened database.
 */
export async function getDB() {
  return openDB<RuralMailDB>('ruralmail-db', 5, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('routes');
      }
      if (oldVersion < 2) {
        db.createObjectStore('settings');
      }
      if (oldVersion < 3) {
        db.createObjectStore('packages');
      }
      if (oldVersion < 4) {
        db.createObjectStore('hud');
      }
      // Future migrations can be added here
    },
  });
}

/**
 * Saves the route to IndexedDB.
 * @param {RouteData} route - The route data to save.
 */
export async function saveRoute(route: RouteData) {
  const db = await getDB();
  const tx = db.transaction('routes', 'readwrite');
  await tx.store.put(route, 'fixed-route');
  await tx.done;
}

/**
 * Loads the route from IndexedDB.
 * @returns {Promise<RouteData | undefined>} Loaded route or undefined if not found.
 */
export async function loadRoute(): Promise<RouteData | undefined> {
  const db = await getDB();
  return db.get('routes', 'fixed-route');
}

/**
 * Clears the route from IndexedDB.
 */
export async function clearRoute() {
  const db = await getDB();
  const tx = db.transaction('routes', 'readwrite');
  await tx.store.delete('fixed-route');
  await tx.done;
}

/**
 * Saves settings to IndexedDB.
 * @param {SettingsData} settings - Settings to save.
 */
export async function saveSettings(settings: SettingsData) {
  const db = await getDB();
  const tx = db.transaction('settings', 'readwrite');
  await tx.store.put(settings, 'defaults');
  await tx.done;
}

/**
 * Loads settings from IndexedDB.
 * @returns {Promise<SettingsData>} Loaded settings or empty object.
 */
export async function loadSettings(): Promise<SettingsData> {
  const db = await getDB();
  const data = await db.get('settings', 'defaults');
  // ✅ FIX: Explicitly cast the empty object to SettingsData
  // to satisfy the strict return type.
  return data || ({} as SettingsData);
}

/**
 * Saves packages to IndexedDB for the given date.
 * @param {Package[]} packages - Packages to save.
 * @param {string} [date] - Date key (default: current YYYY-MM-DD).
 */
export async function savePackages(packages: Package[], date: string = new Date().toISOString().split('T')[0]) {
  const db = await getDB();
  const tx = db.transaction('packages', 'readwrite');
  await tx.store.put({ date, packages }, 'daily-packages');
  await tx.done;
}

/**
 * Loads packages from IndexedDB if matching current date.
 * @returns {Promise<PackageData | undefined>} Loaded data or undefined if outdated/no data.
 */
export async function loadPackages(): Promise<PackageData | undefined> {
  const db = await getDB();
  const data = await db.get('packages', 'daily-packages');
  const currentDate = new Date().toISOString().split('T')[0];
  if (data && data.date === currentDate) {
    return data;
  }
  return undefined; // Clear if old data
}

/**
 * Clears packages from IndexedDB.
 */
export async function clearPackages() {
  const db = await getDB();
  const tx = db.transaction('packages', 'readwrite');
  await tx.store.delete('daily-packages');
  await tx.done;
}

/**
 * Saves HUD data to IndexedDB.
 * @param {HudData} hud - HUD data to save.
 */
export async function saveHud(hud: HudData) {
  const db = await getDB();
  const tx = db.transaction('hud', 'readwrite');
  await tx.store.put(hud, 'delivery-state');
  await tx.done;
}

/**
 * Loads HUD data from IndexedDB.
 * @returns {Promise<HudData | undefined>} Loaded HUD or undefined.
 */
export async function loadHud(): Promise<HudData | undefined> {
  const db = await getDB();
  return db.get('hud', 'delivery-state');
}

/**
 * Clears HUD data from IndexedDB.
 */
export async function clearHud() {
  const db = await getDB();
  const tx = db.transaction('hud', 'readwrite');
  await tx.store.delete('delivery-state');
  await tx.done;
}