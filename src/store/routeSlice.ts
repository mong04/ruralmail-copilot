// store/routeSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { loadRoute, saveRoute, type RouteData, type Stop } from '../db';
import MapboxSdk from '@mapbox/mapbox-sdk';
import Geocoding from '@mapbox/mapbox-sdk/services/geocoding';
import { toast } from 'sonner';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

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


// ** NEW PAYLOAD TYPES **
interface UpdateStopPayload {
  index: number;
  stop: Stop;
}

interface ReorderStopsPayload {
  startIndex: number;
  endIndex: number;
}

const routeSlice = createSlice({
  name: 'route',
  initialState,
  reducers: {
    // ** UPDATED to ensure full_address is always set **
    addStop: (state, action: PayloadAction<Stop>) => {
      const stop = action.payload;
      stop.full_address = [
        stop.address_line1,
        stop.address_line2,
        stop.city,
        stop.state,
        stop.zip,
      ]
        .filter(Boolean)
        .join(', ');
      state.route.push(stop);
    },
    // ** NEW **
    updateStop: (state, action: PayloadAction<UpdateStopPayload>) => {
      const { index, stop } = action.payload;
      if (state.route[index]) {
        // Ensure full_address is re-computed
        stop.full_address = [
          stop.address_line1,
          stop.address_line2,
          stop.city,
          stop.state,
          stop.zip,
        ]
          .filter(Boolean)
          .join(', ');
        state.route[index] = stop;
      }
    },
    // ** NEW **
    removeStop: (state, action: PayloadAction<number>) => {
      state.route.splice(action.payload, 1);
    },
    // ** NEW **
    reorderStops: (state, action: PayloadAction<ReorderStopsPayload>) => {
      const { startIndex, endIndex } = action.payload;
      const [removed] = state.route.splice(startIndex, 1);
      state.route.splice(endIndex, 0, removed);
    },
    clearRouteMemory: (state) => {
      state.route = [];
    },
  },
  extraReducers: (builder) => {
    // ... (all existing extraReducers for thunks) ...
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
      .addCase(geocodeStop.pending, (state) => {
        state.loading = true;
      })
      .addCase(geocodeStop.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(geocodeStop.rejected, (state) => {
        state.loading = false;
      });
  },
});

// ** UPDATED exports **
export const { addStop, updateStop, removeStop, reorderStops, clearRouteMemory } =
  routeSlice.actions;
export default routeSlice.reducer;