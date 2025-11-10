// src/routeDB.ts
import { openDB, type IDBPDatabase } from 'idb';

// Define the shape of your route stop
export interface RouteStop {
  stopIndex: number;
  full_address: string;
  // Add any other properties from your CSV
  [key: string]: unknown; 
}

// Define the shape of the data we store
interface RouteDBData {
  route: RouteStop[];
}

const DB_NAME = 'RouteDataDB';
const STORE_NAME = 'routeStore';
const KEY = 'currentRoute';

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDB = (): Promise<IDBPDatabase> => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME);
      },
    });
  }
  return dbPromise;
};

// Function to save the route
export const saveRoute = async (route: RouteStop[]): Promise<void> => {
  const db = await getDB();
  await db.put(STORE_NAME, { route }, KEY);
};

// Function to load the route
export const loadRoute = async (): Promise<RouteDBData | undefined> => {
  const db = await getDB();
  return db.get(STORE_NAME, KEY);
};

// Function to clear the route
export const clearRoute = async (): Promise<void> => {
  const db = await getDB();
  await db.delete(STORE_NAME, KEY);
};