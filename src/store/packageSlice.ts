import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import Fuse from 'fuse.js';
import { loadPackages, savePackages, clearPackages, type Package, type Stop } from '../db';
import { toast } from 'sonner';
import type { RootState } from '.';

// Define AddressMatch type
type AddressMatch = {
  stopIndex: number;
  address: string;
} | null;

interface PackageState {
  packages: Package[];
  loading: boolean;
  error: string | null;
}

const initialState: PackageState = {
  packages: [],
  loading: false,
  error: null,
};

/**
 * Type guard to check if an item is a Stop.
 * @param {unknown} item - Item to check.
 * @returns {item is Stop} True if item is a Stop.
 */
function isStop(item: unknown): item is Stop {
  return typeof item === 'object' && item !== null && 'full_address' in item;
}

/**
 * Async thunk to load packages from DB.
 * @returns {Promise<Package[]>} Loaded packages or empty array.
 */
export const loadPackagesFromDB = createAsyncThunk('packages/load', async () => {
  const data = await loadPackages();
  return data ? data.packages : [];
});

/**
 * Async thunk to save packages to DB.
 * @param {Package[]} packages - Packages to save.
 * @returns {Promise<Package[]>} Saved packages.
 */
export const savePackagesToDB = createAsyncThunk('packages/save', async (packages: Package[]) => {
  await savePackages(packages);
  return packages;
});

/**
 * Async thunk to clear packages from DB.
 * @returns {Promise<Package[]>} Empty array to reset state.
 */
export const clearPackagesFromDB = createAsyncThunk('packages/clear', async () => {
  await clearPackages();
  return []; // Return empty array to reset state
});

/**
 * Async thunk to match address to stop using Fuse.js fuzzy search.
 * Reference: https://www.fusejs.io/options.html for Fuse options.
 * @param {string} address - Address to match.
 * @returns {Promise<AddressMatch[]>} Array of matches.
 */
export const matchAddressToStop = createAsyncThunk<
  AddressMatch[],
  string,
  { state: RootState }
>('packages/matchAddress', async (address, { getState, rejectWithValue }) => {
  const state = getState() as RootState;
  const route = state.route.route;

  if (!Array.isArray(route) || route.length === 0 || !route.every(isStop)) {
    return rejectWithValue('No route or invalid route');
  }

  const fuse = new Fuse(route, {
    keys: ['full_address'],
    threshold: 0.3,
    ignoreLocation: true,
  });

  const results = fuse.search(address, { limit: 5 });

  // Sort by score for better relevance (lower score = better match)
  results.sort((a, b) => (a.score ?? 1) - (b.score ?? 1));

  const matches: AddressMatch[] = results
    .map(result => {
      const item = result.item;
      if (isStop(item) && item.full_address) {
        return {
          stopIndex: result.refIndex,
          address: item.full_address 
        };
      }
      return null;
    })
    .filter((match): match is AddressMatch => match !== null);

  if (matches.length === 0) {
    return rejectWithValue('No matches found');
  }

  return matches;
});

const packageSlice = createSlice({
  name: 'packages',
  initialState,
  reducers: {
    /**
     * Reducer to add a package.
     * @param {PackageState} state - Current state.
     * @param {PayloadAction<Package>} action - Package to add.
     */
    addPackage: (state, action: PayloadAction<Package>) => {
      state.packages.push(action.payload);
    },
    /**
     * Reducer to clear packages in memory.
     * @param {PackageState} state - Current state.
     */
    clearPackagesMemory: (state) => {
      state.packages = [];
    },
    /**
     * Reducer to delete a package by ID.
     * @param {PackageState} state - Current state.
     * @param {PayloadAction<string>} action - ID of package to delete.
     */
    deletePackage: (state, action: PayloadAction<string>) => {
      state.packages = state.packages.filter(
        (pkg) => pkg.id !== action.payload
      );
    },
    /**
     * Reducer to update a package.
     * @param {PackageState} state - Current state.
     * @param {PayloadAction<Package>} action - Updated package.
     */
    updatePackage: (state, action: PayloadAction<Package>) => {
      const index = state.packages.findIndex(
        (pkg) => pkg.id === action.payload.id
      );
      if (index !== -1) {
        state.packages[index] = action.payload;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadPackagesFromDB.pending, (state) => { state.loading = true; })
      .addCase(loadPackagesFromDB.fulfilled, (state, action) => {
        state.loading = false;
        state.packages = action.payload;
      })
      .addCase(loadPackagesFromDB.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load packages';
        toast.error(state.error);
      })
      .addCase(savePackagesToDB.pending, (state) => { state.loading = true; })
      .addCase(savePackagesToDB.fulfilled, (state, action) => {
        state.loading = false;
        state.packages = action.payload;
      })
      .addCase(savePackagesToDB.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to save packages';
        toast.error(state.error);
      })
      .addCase(clearPackagesFromDB.fulfilled, (state) => {
        state.packages = [];
      })
      .addCase(clearPackagesFromDB.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to clear packages';
        toast.error(state.error);
      })
      .addCase(matchAddressToStop.fulfilled, () => {
        // Not directly updating state (handled by caller)
      })
      .addCase(matchAddressToStop.rejected, () => {
        // Not directly updating state (handled by caller)
      });
  },
});

export const { addPackage, clearPackagesMemory, updatePackage, deletePackage } = packageSlice.actions;
export default packageSlice.reducer;