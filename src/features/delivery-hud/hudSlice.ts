import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { toast } from 'sonner';
import { loadHud, saveHud, type HudData } from '../../db';
import type { RootState } from '../../store';

// Define interface for OpenWeather alerts response (based on docs: https://openweathermap.org/api/one-call-3)
interface WeatherAlert {
  sender_name: string;
  event: string;
  start: number;
  end: number;
  description: string;
  tags: string[];
}

interface HudState extends HudData {
  loading: boolean;
  position: { lat: number; lng: number } | null;
}

const initialState: HudState = {
  currentStop: 0,
  weatherAlerts: [],
  loading: false,
  position: null,
};

/**
 * Async thunk to load HUD data from IndexedDB.
 * @returns {Promise<HudData>} Loaded HUD data or default.
 */
export const loadHudFromDB = createAsyncThunk('hud/load', async () => {
  const data = await loadHud();
  return data || { currentStop: 0, weatherAlerts: [] };
});

/**
 * Async thunk to save HUD data to IndexedDB.
 * @param {HudData} hud - HUD data to save.
 * @returns {Promise<HudData>} Saved HUD data.
 */
export const saveHudToDB = createAsyncThunk('hud/save', async (hud: HudData) => {
  await saveHud(hud);
  return hud;
});

/**
 * Async thunk to fetch weather alerts using OpenWeatherMap One Call API 3.0.
 * Reference: https://openweathermap.org/api/one-call-3 (alerts are in 'alerts' array).
 * Uses exclude to fetch only alerts for efficiency.
 * @returns {Promise<string[]>} Array of alert descriptions.
 */
export const fetchWeatherAlerts = createAsyncThunk(
  'hud/fetchWeather',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const { lat, lng } = state.hud.position || { lat: 0, lng: 0 };
    const token = import.meta.env.VITE_OPENWEATHER_TOKEN;
    if (!token || lat === 0 || lng === 0) {
      return rejectWithValue('No position or token');
    }

    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lng}&exclude=current,minutely,hourly,daily&appid=${token}`
      );
      const alerts: WeatherAlert[] = response.data.alerts || [];
      return alerts.map((a) => a.description);
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
    /**
     * Reducer to update current position with haptic feedback.
     * @param {HudState} state - Current state.
     * @param {PayloadAction<{ lat: number; lng: number }>} action - New position.
     */
    updatePosition: (state, action: PayloadAction<{ lat: number; lng: number }>) => {
      state.position = action.payload;
      if (navigator.vibrate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        navigator.vibrate(200);  // Haptic feedback (respects reduced motion)
      }
    },
    /**
     * Reducer to advance to the next stop with success toast and haptic pattern.
     * @param {HudState} state - Current state.
     */
    advanceStop: (state) => {
      state.currentStop += 1;
      toast.success('Stop advanced!');
      if (navigator.vibrate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        navigator.vibrate([100, 50, 100]);  // Pattern for completion
      }
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

export const { updatePosition, advanceStop } = hudSlice.actions;
export default hudSlice.reducer;