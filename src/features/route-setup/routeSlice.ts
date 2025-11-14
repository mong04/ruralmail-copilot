// store/routeSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { loadRoute, saveRoute, type RouteData, type Stop } from '../../db';
import MapboxSdk from '@mapbox/mapbox-sdk';
import Geocoding from '@mapbox/mapbox-sdk/services/geocoding';
import { toast } from 'sonner';

// Mapbox token from env
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const mapboxClient = MAPBOX_TOKEN ? MapboxSdk({ accessToken: MAPBOX_TOKEN }) : null;
const geocodingService = mapboxClient ? Geocoding(mapboxClient) : null;

// Define payload types
interface UpdateStopPayload {
  index: number;
  stop: Stop;
}

interface ReorderStopsPayload {
  startIndex: number;
  endIndex: number;
}

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

/**
 * Async thunk to load route from DB.
 * @returns {Promise<RouteData>} Loaded route or empty array.
 */
export const loadRouteFromDB = createAsyncThunk('route/load', async () => {
  const route = await loadRoute();
  return route || [];
});

/**
 * Async thunk to save route to DB.
 * @param {RouteData} route - Route to save.
 * @returns {Promise<RouteData>} Saved route.
 */
export const saveRouteToDB = createAsyncThunk('route/save', async (route: RouteData) => {
  await saveRoute(route);
  return route;
});

/**
 * Async thunk for geocoding a stop using Mapbox.
 * Reference: https://docs.mapbox.com/mapbox-search-js/api/#forwardgeocode for query options.
 * @param {Partial<Stop>} partialStop - Partial stop data.
 * @returns {Promise<Stop>} Geocoded stop.
 */
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
      // Construct query string (Mapbox v5 expects 'query')
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
          limit: 1,
          // Optional: Bias to US if no country specified
          countries: ['us'],
        })
        .send();

      const feature = response.body.features[0];
      if (!feature) {
        return rejectWithValue('No results found');
      }

      return {
        ...partialStop,
        lat: feature.center[1],
        lng: feature.center[0],
        full_address: feature.place_name,
      } as Stop;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Geocoding failed';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const routeSlice = createSlice({
  name: 'route',
  initialState,
  reducers: {
    /**
     * Reducer to add a stop, computing full_address.
     * @param {RouteState} state - Current state.
     * @param {PayloadAction<Stop>} action - Stop to add.
     */
    addStop: (state, action: PayloadAction<Stop>) => {
      const stop = {
        ...action.payload,
        id: action.payload.id ?? crypto.randomUUID(),
        full_address: [
          action.payload.address_line1,
          action.payload.address_line2,
          action.payload.city,
          action.payload.state,
          action.payload.zip,
        ].filter(Boolean).join(', '),
      };
      state.route.push(stop);
    },
    /**
     * Reducer to update a stop, recomputing full_address.
     * @param {RouteState} state - Current state.
     * @param {PayloadAction<UpdateStopPayload>} action - Index and updated stop.
     */
    updateStop: (state, action: PayloadAction<UpdateStopPayload>) => {
      const { index, stop } = action.payload;
      if (state.route[index]) {
        stop.full_address = [
          stop.address_line1,
          stop.address_line2,
          stop.city,
          stop.state,
          stop.zip,
        ].filter(Boolean).join(', ');
        state.route[index] = stop;
      }
    },
    /**
     * Reducer to remove a stop by index.
     * @param {RouteState} state - Current state.
     * @param {PayloadAction<number>} action - Index to remove.
     */
    removeStop: (state, action: PayloadAction<number>) => {
      state.route.splice(action.payload, 1);
    },
    /**
     * Reducer to reorder stops.
     * @param {RouteState} state - Current state.
     * @param {PayloadAction<ReorderStopsPayload>} action - Start and end indices.
     */
    reorderStops: (state, action: PayloadAction<ReorderStopsPayload>) => {
      const { startIndex, endIndex } = action.payload;
      const [removed] = state.route.splice(startIndex, 1);
      state.route.splice(endIndex, 0, removed);
    },
    /**
     * Reducer to clear route in memory.
     * @param {RouteState} state - Current state.
     */
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

export const { addStop, updateStop, removeStop, reorderStops, clearRouteMemory } = routeSlice.actions;
export default routeSlice.reducer;