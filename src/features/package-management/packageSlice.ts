import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import Fuse from 'fuse.js';
import { loadPackages, savePackages, clearPackages, type Package, type Stop } from '../../db';
import { toast } from 'sonner';
import type { RootState } from '../../store';

// Define AddressMatch type
type AddressMatch = {
  stopId: string;
  stopNumber: number;
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

function isStop(item: unknown): item is Stop {
  return typeof item === 'object' && item !== null && 'full_address' in item;
}

/**
 * Async thunk to load packages from DB.
 */
export const loadPackagesFromDB = createAsyncThunk('packages/load', async () => {
  const data = await loadPackages();
  return data ? data.packages : [];
});

/**
 * Async thunk to save packages to DB.
 */
export const savePackagesToDB = createAsyncThunk('packages/save', async (packages: Package[]) => {
  await savePackages(packages);
  return packages;
});

/**
 * Async thunk to clear packages from DB.
 */
export const clearPackagesFromDB = createAsyncThunk('packages/clear', async () => {
  await clearPackages();
  return [];
});

/**
 * Async thunk to match address to stop using Fuse.js fuzzy search.
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
  results.sort((a, b) => (a.score ?? 1) - (b.score ?? 1));

  const matches: AddressMatch[] = results
    .map(result => {
      const item = result.item;
      if (isStop(item) && item.full_address) {
        return {
          stopId: (item as Stop).id,
          stopNumber: result.refIndex,
          address: item.full_address,
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
    addPackage: (state, action: PayloadAction<Package>) => {
      state.packages.push(action.payload);
    },
    clearPackagesMemory: (state) => {
      state.packages = [];
    },
    deletePackage: (state, action: PayloadAction<string>) => {
      state.packages = state.packages.filter(pkg => pkg.id !== action.payload);
    },
    updatePackage: (state, action: PayloadAction<Package>) => {
      const index = state.packages.findIndex(pkg => pkg.id === action.payload.id);
      if (index !== -1) {
        state.packages[index] = action.payload;
      }
    },
    /**
     * Reducer to mark all packages at a stop as delivered.
     */
    markPackagesDelivered: (state, action: PayloadAction<{ stopId: string }>) => {
      state.packages = state.packages.map(pkg =>
        pkg.assignedStopId === action.payload.stopId
          ? { ...pkg, delivered: true }
          : pkg
      );
      toast.success(`Packages at stop ${action.payload.stopId} marked delivered`);
    },
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
        // handled by caller
      })
      .addCase(matchAddressToStop.rejected, () => {
        // handled by caller
      });
  },
});

export const {
  addPackage,
  clearPackagesMemory,
  updatePackage,
  deletePackage,
  markPackagesDelivered,
} = packageSlice.actions;

export default packageSlice.reducer;
