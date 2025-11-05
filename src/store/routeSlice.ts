import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { loadRoute, saveRoute, type RouteData, type Stop } from '../db';
import MapboxSdk from '@mapbox/mapbox-sdk';
import Geocoding from '@mapbox/mapbox-sdk/services/geocoding';
import { toast } from 'sonner';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

if (!MAPBOX_TOKEN) {
  console.warn('Mapbox token missing - geocoding disabled');
}

const mapboxClient = MAPBOX_TOKEN ? MapboxSdk({ accessToken: MAPBOX_TOKEN }) : null;
const geocodingService = mapboxClient ? Geocoding(mapboxClient) : null;

// Initial state
interface RouteState {
  route: RouteData;
  loading: boolean;
  error: string | null;
}

const initialState: RouteState = {
  route: [],
  loading: false,
  error: null,
};

// Async thunk to load route from DB
export const loadRouteFromDB = createAsyncThunk('route/load', async () => {
  const route = await loadRoute();
  return route || [];
});

// Async thunk to save route to DB
export const saveRouteToDB = createAsyncThunk('route/save', async (route: RouteData) => {
  await saveRoute(route);
  return route;
});

// New thunk for geocoding a stop (structured input)
export const geocodeStop = createAsyncThunk(
  'route/geocodeStop',
  async (partialStop: Partial<Stop>, { rejectWithValue }) => {
    if (!geocodingService) {
      toast.error('Mapbox token missing - enter lat/lng manually');
      return rejectWithValue('No token');
    }
    if (!navigator.onLine) {
      toast.error('Offline - enter lat/lng manually');
      return rejectWithValue('Offline');
    }

    try {
      // Construct a query string since Mapbox v5 forwardGeocode expects 'query' (not structured fields)
      const addressParts = [
        partialStop.address_line1,
        partialStop.address_line2,
        partialStop.city,
        partialStop.state,
        partialStop.zip,
      ].filter(Boolean).join(', ');

      const response = await geocodingService
        .forwardGeocode({
          query: addressParts,
          countries: ['us'],  // Fixed for USPS
          limit: 1,
          autocomplete: false,
          types: ['address'],  // Focus on addresses
        })
        .send();

      const feature = response.body.features[0];
      if (!feature || feature.relevance < 0.75) {  // Use 'relevance' instead of 'match_code.confidence'
        toast.error('No accurate match found - try manual lat/lng');
        return rejectWithValue('No match');
      }

      return {
        lat: feature.center[1],  // [lng, lat] -> lat first
        lng: feature.center[0],
        full_address: feature.place_name,  // Use 'place_name' for full address
      };
    } catch (err: unknown) {  // Type 'err' as 'unknown'
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Geocoding failed: ${message}`);
      return rejectWithValue(message);
    }
  }
);

const routeSlice = createSlice({
  name: 'route',
  initialState,
  reducers: {
    // Temporary in-memory add stop (before save)
    addStop: (state, action: PayloadAction<Stop>) => {  // Now full Stop
        const stop = action.payload;
        stop.full_address = [
            stop.address_line1,
            stop.address_line2,
            stop.city,
            stop.state,
            stop.zip,
        ].filter(Boolean).join(', ');
        state.route.push(stop);
    },
    // Clear in-memory
    clearRouteMemory: (state) => {
      state.route = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadRouteFromDB.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadRouteFromDB.fulfilled, (state, action) => {
        state.loading = false;
        state.route = action.payload;
      })
      .addCase(loadRouteFromDB.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load route';
      })
      .addCase(saveRouteToDB.fulfilled, (state, action) => {
        state.route = action.payload;
      })
      .addCase(geocodeStop.pending, (state) => { state.loading = true; })
      .addCase(geocodeStop.fulfilled, (state) => {  // Remove unused 'action'
        state.loading = false;
        // Update last added stop with coords (or handle index later)
        // For now, assume called before add; we'll adjust UI
      })
      .addCase(geocodeStop.rejected, (state) => { state.loading = false; });  // Remove unused 'action'
  },
});

export const { addStop, clearRouteMemory } = routeSlice.actions;
export default routeSlice.reducer;