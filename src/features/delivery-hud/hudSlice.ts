// src/features/delivery-hud/hudSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { toast } from 'sonner';
import { loadHud, saveHud, type HudData } from '../../db';
import type { RootState } from '../../store';

interface HudState extends HudData {
  loading: boolean;
  position: { lat: number; lng: number } | null;
  voiceEnabled: boolean;
  currentStop: number;
  mapStyle: 'streets' | 'satellite';
  cameraMode: 'task' | 'follow' | 'overview';
}

const initialState: HudState = {
  currentStop: 0,
  weatherAlerts: [],
  loading: false,
  position: null,
  voiceEnabled: false,
  mapStyle: 'streets',
  cameraMode: 'task',
};

/**
 * Async thunk to load HUD data from IndexedDB.
 */
export const loadHudFromDB = createAsyncThunk('hud/load', async () => {
  const data = await loadHud();
  return data || { currentStop: 0, weatherAlerts: [] };
});

/**
 * Async thunk to save HUD data to IndexedDB.
 */
export const saveHudToDB = createAsyncThunk('hud/save', async (hud: HudData) => {
  await saveHud(hud);
  return hud;
});

/**
 * Async thunk to fetch current weather and derive adverse driving alerts.
 */
export const fetchWeatherAlerts = createAsyncThunk(
  'hud/fetchWeather',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const { lat, lng } = state.hud.position || { lat: 0, lng: 0 };
    const token = import.meta.env.VITE_OPENWEATHER_KEY;
    if (!token || lat === 0 || lng === 0) {
      return rejectWithValue('No position or token');
    }

    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${token}&units=imperial`
      );
      const data = response.data;

      const alerts: string[] = [];

      const condition = data.weather?.[0]?.main?.toLowerCase();
      if (condition && ['snow', 'rain', 'thunderstorm', 'drizzle'].includes(condition)) {
        alerts.push(`Adverse condition: ${condition}`);
      }

      if (data.wind?.speed > 25) {
        alerts.push('High winds may affect driving');
      }

      if (data.visibility && data.visibility < 1000) {
        alerts.push('Low visibility warning');
      }

      if (data.main?.temp < 32) {
        alerts.push('Freezing temperatures — watch for ice');
      }

      return alerts;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Weather fetch failed: ${message}`);
      return rejectWithValue('Fetch error');
    }
  }
);

const hudSlice = createSlice({
  name: 'hud',
  initialState,
  reducers: {
    updatePosition: (state, action: PayloadAction<{ lat: number; lng: number }>) => {
      state.position = action.payload;
      if (navigator.vibrate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        navigator.vibrate(200);
      }
    },
    advanceStop: (state) => {
      state.currentStop += 1;
      toast.success('Stop advanced!');
      if (navigator.vibrate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        navigator.vibrate([100, 50, 100]);
      }
    },
    markDelivered: (state, action: PayloadAction<{ stopId: string }>) => {
      // This reducer doesn’t directly mutate packages (that’s in packagesSlice),
      // but it can trigger a toast and advance the HUD.
      toast.success(`Packages at stop ${action.payload.stopId} marked delivered`);
      state.currentStop += 1;
    },
    toggleVoice: (state, action: PayloadAction<boolean>) => {
      state.voiceEnabled = action.payload;
      toast.info(`Voice guidance ${action.payload ? 'enabled' : 'disabled'}`);
    },
    setMapStyle: (state, action: PayloadAction<HudState['mapStyle']>) => {
      state.mapStyle = action.payload;
    },
    setCameraMode: (state, action: PayloadAction<HudState['cameraMode']>) => {
      state.cameraMode = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadHudFromDB.fulfilled, (state, action) => {
        state.currentStop = action.payload.currentStop;
        state.weatherAlerts = action.payload.weatherAlerts;
      })
      .addCase(saveHudToDB.fulfilled, (state, action) => {
        state.currentStop = action.payload.currentStop;
        state.weatherAlerts = action.payload.weatherAlerts;
      })
      .addCase(fetchWeatherAlerts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchWeatherAlerts.fulfilled, (state, action) => {
        state.loading = false;
        state.weatherAlerts = action.payload;
        if (action.payload.length > 0) {
          toast.warning(`Weather alerts: ${action.payload.join(', ')}`);
        }
      })
      .addCase(fetchWeatherAlerts.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const { 
  updatePosition, 
  advanceStop, 
  markDelivered, 
  toggleVoice,
  setMapStyle,
  setCameraMode, 
} = hudSlice.actions;
export default hudSlice.reducer;
