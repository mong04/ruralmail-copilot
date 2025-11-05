import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { loadPackages, savePackages, clearPackages, type Package } from '../db';
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

export const loadPackagesFromDB = createAsyncThunk('packages/load', async () => {
  const data = await loadPackages();
  return data ? data.packages : [];
});

export const savePackagesToDB = createAsyncThunk('packages/save', async (packages: Package[]) => {
  await savePackages(packages);
  return packages;
});

export const clearPackagesFromDB = createAsyncThunk('pakcages/clear', async () => {
    await clearPackages();
    return []; // Return empty array to reset state
})

export const matchAddressToStop = createAsyncThunk(
  'packages/matchAddress',
  async (address: string, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const route = state.route.route;
    if (route.length === 0) {
      toast.error('No route loaded - cannot match address');
      return rejectWithValue('No route');
    }

    const fuse = new Fuse(route, {
      keys: ['full_address'],  // Match on computed full_address
      threshold: 0.3,  // Fuzzy tolerance for typos
      ignoreLocation: true,
    });

    const result = fuse.search(address);
    if (result.length > 0) {
      return result[0].refIndex;  // Return stop index
    }
    toast.warning('No matching stop found - saving as unassigned');
    return -1;  // Unassigned
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
        toast.error(state.error);  // Add this for user feedback
        })
        .addCase(savePackagesToDB.pending, (state) => { state.loading = true; })  // Optional: Add pending if we want loader
        .addCase(savePackagesToDB.fulfilled, (state, action) => {
        state.loading = false;
        state.packages = action.payload;
        toast.success('Packages saved!');  // Optional success toast
        })
        .addCase(savePackagesToDB.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to save packages';
        toast.error(state.error);  // Add this
        })
        .addCase(clearPackagesFromDB.fulfilled, (state) => {
        state.packages = [];
        toast.success('Packages cleared for new day!');
        })
        .addCase(clearPackagesFromDB.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to clear packages';
        toast.error(state.error);
        })
  .addCase(matchAddressToStop.fulfilled, () => {
  // Not directly updating state; used in UI dispatch chain
  })
    },
});

export const { addPackage, clearPackagesMemory } = packageSlice.actions;
export default packageSlice.reducer;