// src/store/packageSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
// **FIX:** Import 'Stop' from your existing 'db' file
import { loadPackages, savePackages, clearPackages, type Package, type Stop } from '../db';
import type { RootState } from '.';
import { toast } from 'sonner';
import Fuse from 'fuse.js';

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

// This type is correct
type AddressMatch = {
  stopIndex: number;
  address: string;
} | null;

export const loadPackagesFromDB = createAsyncThunk('packages/load', async () => {
  const data = await loadPackages();
  return data ? data.packages : [];
});

export const savePackagesToDB = createAsyncThunk('packages/save', async (packages: Package[]) => {
  await savePackages(packages);
  return packages;
});

export const clearPackagesFromDB = createAsyncThunk('packages/clear', async () => {
    await clearPackages();
    return []; // Return empty array to reset state
})

export const matchAddressToStop = createAsyncThunk<
  AddressMatch[],
  string,
  { state: RootState }
>('packages/matchAddress', async (address, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    
    // **FIX:** Use the 'Stop' type you're already importing in routeSlice
    const route = state.route.route as Stop[]; 
    
    if (!route || route.length === 0) {
      return rejectWithValue('No route');
    }

    const fuse = new Fuse(route, {
      keys: ['full_address'],
      threshold: 0.3,
      ignoreLocation: true,
    });

    const results = fuse.search(address, { limit: 5 });

    const matches: AddressMatch[] = results
      .map(result => {
        // **FIX:** Cast the item to 'Stop'
        const item = result.item as Stop;
        if (item && item.full_address) {
          return {
            stopIndex: result.refIndex,
            address: item.full_address 
          };
        }
        return null;
      })
      .filter((match): match is AddressMatch => match !== null);

    return matches;
  }
);

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
      state.packages = state.packages.filter(
        (pkg) => pkg.id !== action.payload
      );
    },
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
        // Not directly updating state
        })
        .addCase(matchAddressToStop.rejected, () => {
        // Not directly updating state
        })
    },
});

export const { addPackage, clearPackagesMemory, updatePackage, deletePackage } = packageSlice.actions;
export default packageSlice.reducer;