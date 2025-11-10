import { openDB, type DBSchema } from 'idb';

// Define schema for TypeScript safety (per idb docs)
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
  hud: {  // NEW for Iteration 4
    key: string;
    value: HudData;
  };
}

// Type for route (array of stops)
export type Stop = {
  address_line1: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  lat: number;
  lng: number;
  notes?: string;
  full_address?: string;  // Computed on load/save
};

export type RouteData = Stop[];

export type SettingsData = {
  defaultCity?: string;
  defaultState?: string;
  defaultZip?: string;
};

export type Package = {
  id: string;  // YOUR UPDATE: Unique ID
  tracking?: string;  // YOUR UPDATE: Optional
  size: 'small' | 'medium' | 'large';
  notes?: string;
  assignedStop?: number; // Index in route
  assignedAddress?: string; // For matching/input
};

export type PackageData = {
  date: string;  // YYYY-MM-DD for daily
  packages: Package[];
};

// NEW for HUD (Iteration 4)
export type HudData = {
  currentStop: number;
  weatherAlerts: string[];  // Cached
};

export async function getDB() {
  return openDB<RuralMailDB>('ruralmail-db', 4, {  // Bumped to 4 for HUD
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('routes');
      }
      if (oldVersion < 2) {
        db.createObjectStore('settings');
      }
      if (oldVersion < 3) {  // FIXED: Added space
        db.createObjectStore('packages');
      }
      if (oldVersion < 4) {  // NEW: HUD store
        db.createObjectStore('hud');
      }
    },
  });
}

// Route methods (unchanged)
export async function saveRoute(route: RouteData) {
  const db = await getDB();
  const tx = db.transaction('routes', 'readwrite');
  await tx.store.put(route, 'fixed-route');
  await tx.done;
}

export async function loadRoute(): Promise<RouteData | undefined> {
  const db = await getDB();
  return db.get('routes', 'fixed-route');
}

export async function clearRoute() {
  const db = await getDB();
  const tx = db.transaction('routes', 'readwrite');
  await tx.store.delete('fixed-route');
  await tx.done;
}

// Settings methods (unchanged)
export async function saveSettings(settings: SettingsData) {
  const db = await getDB();
  const tx = db.transaction('settings', 'readwrite');
  await tx.store.put(settings, 'defaults');
  await tx.done;
}

export async function loadSettings(): Promise<SettingsData> {
  const db = await getDB();
  return (await db.get('settings', 'defaults')) || {};
}

// Packages methods (unchanged)
export async function savePackages(packages: Package[], date: string = new Date().toISOString().split('T')[0]) {
  const db = await getDB();
  const tx = db.transaction('packages', 'readwrite');
  await tx.store.put({ date, packages }, 'daily-packages');
  await tx.done;
}

export async function loadPackages(): Promise<PackageData | undefined> {
  const db = await getDB();
  const data = await db.get('packages', 'daily-packages');
  const currentDate = new Date().toISOString().split('T')[0];
  if (data && data.date === currentDate) {
    return data;
  }
  return undefined; // Clear if old data
}

export async function clearPackages() {
  const db = await getDB();
  const tx = db.transaction('packages', 'readwrite');
  await tx.store.delete('daily-packages');
  await tx.done;
}

// NEW HUD methods (Iteration 4)
export async function saveHud(hud: HudData) {
  const db = await getDB();
  const tx = db.transaction('hud', 'readwrite');
  await tx.store.put(hud, 'delivery-state');
  await tx.done;
}

export async function loadHud(): Promise<HudData | undefined> {
  const db = await getDB();
  return db.get('hud', 'delivery-state');
}

export async function clearHud() {
  const db = await getDB();
  const tx = db.transaction('hud', 'readwrite');
  await tx.store.delete('delivery-state');
  await tx.done;
}