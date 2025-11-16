// src/features/delivery-hud/hudSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction, createSelector } from '@reduxjs/toolkit';
import axios from 'axios';
import { toast } from 'sonner';
import { loadHud, saveHud, type HudData } from '../../db';
import type { RootState } from '../../store';

// OWM API response types (simplified)
export interface ForecastData {
  list: {
    dt: number;
    main: {
      temp: number;
      feels_like: number;
      temp_max: number;
    };
    weather: {
      id: number;
      main: string;
      description: string;
      icon: string;
    }[];
    wind: {
      speed: number;
    };
    pop: number; // Probability of precipitation
  }[];
}

export interface AlertData {
  sender_name: string;
  event: string;
  start: number;
  end: number;
  description: string;
  tags: string[];
}

export interface HudState extends Omit<HudData, 'weatherAlerts'> {
  loading: boolean;
  position: { lat: number; lng: number } | null;
  voiceEnabled: boolean;
  currentStop: number;
  mapStyle: 'streets' | 'satellite';
  cameraMode: 'task' | 'follow' | 'overview';
  forecast: ForecastData | null;
  severeAlerts: AlertData[] | null;
  briefingDismissed: boolean;
}

const initialState: HudState = {
  currentStop: 0,
  loading: false,
  position: null,
  voiceEnabled: false,
  mapStyle: 'streets',
  cameraMode: 'task',
  forecast: null,
  severeAlerts: null,
  briefingDismissed: false,
};

/**
 * Async thunk to load HUD data from IndexedDB.
 */
export const loadHudFromDB = createAsyncThunk('hud/load', async () => {
  const data = await loadHud();
  // Ensure we don't load old weatherAlerts
  return data ? { currentStop: data.currentStop } : { currentStop: 0 };
});

/**
 * Async thunk to save HUD data to IndexedDB.
 */
export const saveHudToDB = createAsyncThunk('hud/save', async (hud: HudData) => {
  await saveHud(hud);
  return hud;
});

/**
 * Fetches 5-day/3-hour forecast.
 */
export const fetchForecast = createAsyncThunk(
  'hud/fetchForecast',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const { lat, lng } = state.hud.position || {};
    const token = import.meta.env.VITE_OPENWEATHER_KEY;

    if (!token || !lat || !lng) {
      return rejectWithValue('No position or token');
    }

    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${token}&units=imperial`
      );
      return response.data as ForecastData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Forecast fetch failed: ${message}`);
      return rejectWithValue('Fetch error');
    }
  }
);

/**
 * Fetches government weather alerts.
 */
export const fetchSevereAlerts = createAsyncThunk(
  'hud/fetchSevereAlerts',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const { lat, lng } = state.hud.position || {};
    const token = import.meta.env.VITE_OPENWEATHER_KEY;

    if (!token || !lat || !lng) {
      return rejectWithValue('No position or token');
    }

    try {
      // Note: OWM free tier does not include alerts. This is for demonstration.
      // A real app would use a different endpoint or paid tier.
      // For now, this will likely return an empty array.
      const response = await axios.get(
        `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lng}&exclude=minutely,hourly,daily,current&appid=${token}`
      );
      const alerts = (response.data.alerts || []) as AlertData[];
      if (alerts.length > 0) {
        toast.warning(`New Severe Alert: ${alerts[0].event}`);
      }
      return alerts;
    } catch (err) {
      // Don't show toast for this as it runs in background
      console.error('Severe alerts fetch failed:', err);
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
    },
    advanceStop: (state) => {
      state.currentStop += 1;
      toast.success('Stop advanced!');
    },
    markDelivered: (state, action: PayloadAction<{ stopId: string }>) => {
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
    dismissBriefing: (state) => {
      state.briefingDismissed = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadHudFromDB.fulfilled, (state, action) => {
        state.currentStop = action.payload.currentStop;
      })
      .addCase(fetchForecast.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchForecast.fulfilled, (state, action) => {
        state.loading = false;
        state.forecast = action.payload;
      })
      .addCase(fetchForecast.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchSevereAlerts.fulfilled, (state, action) => {
        state.severeAlerts = action.payload;
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
  dismissBriefing,
} = hudSlice.actions;

// SELECTORS
const selectForecast = (state: RootState) => state.hud.forecast;
const selectSevereAlerts = (state: RootState) => state.hud.severeAlerts;
const selectBriefingDismissed = (state: RootState) => state.hud.briefingDismissed;

// A simple icon mapper
const getWeatherIcon = (weatherId: number): string => {
    if (weatherId >= 200 && weatherId < 300) return 'CloudDrizzle'; // Thunderstorm
    if (weatherId >= 300 && weatherId < 400) return 'CloudDrizzle'; // Drizzle
    if (weatherId >= 500 && weatherId < 600) return 'CloudDrizzle'; // Rain
    if (weatherId >= 600 && weatherId < 700) return 'CloudSnow'; // Snow
    if (weatherId >= 700 && weatherId < 800) return 'Wind'; // Atmosphere
    if (weatherId === 800) return 'Sun'; // Clear
    if (weatherId > 800) return 'CloudSun'; // Clouds
    return 'Sun';
};

export const selectWeatherBriefingData = createSelector(
  [selectForecast, selectSevereAlerts, selectBriefingDismissed],
  (forecast, severeAlerts, briefingDismissed) => {
    const isVisible = !!forecast && !briefingDismissed;

    if (!forecast) {
      return { isVisible: false, currentIcon: 'Sun', currentTemp: 0, feelsLike: 0, highTemp: 0, precipSummary: '', activeAlert: {} };
    }

    const current = forecast.list[0];
    const highTemp = Math.max(...forecast.list.slice(0, 8).map(f => f.main.temp_max));
    
    let precipSummary = "No precipitation expected.";
    const firstPrecip = forecast.list.slice(0, 8).find(f => f.pop > 0.1);
    if (firstPrecip) {
        const time = new Date(firstPrecip.dt * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        precipSummary = `${firstPrecip.weather[0].main} starting ~${time}.`;
    }

    const activeAlert = severeAlerts && severeAlerts.length > 0 
      ? { title: severeAlerts[0].event, details: severeAlerts[0].description }
      : {};

    return {
      isVisible,
      currentIcon: getWeatherIcon(current.weather[0].id),
      currentTemp: current.main.temp,
      feelsLike: current.main.feels_like,
      highTemp,
      precipSummary,
      activeAlert,
    };
  }
);

export const selectLookAheadData = createSelector(
  [selectForecast],
  (forecast) => {
    if (!forecast || forecast.list.length < 3) return null;

    const formatTime = (dt: number) => new Date(dt * 1000).toLocaleTimeString([], { hour: 'numeric' }).replace(' ', '');

    const transformForecastItem = (item: ForecastData['list'][0]) => ({
        temp: item.main.temp,
        precip: Math.round(item.pop * 100),
        icon: getWeatherIcon(item.weather[0].id),
        time: formatTime(item.dt),
    });

    return {
      now: transformForecastItem(forecast.list[0]),
      next_3h: transformForecastItem(forecast.list[1]),
      next_6h: transformForecastItem(forecast.list[2]),
    };
  }
);

export const selectDynamicHudAlert = createSelector(
  [selectForecast, selectSevereAlerts],
  (forecast, severeAlerts) => {
    // Priority 1: Severe Alert
    if (severeAlerts && severeAlerts.length > 0) {
      return {
        priority: 'severe' as const,
        icon: 'AlertTriangle',
        text: 'SEVERE ALERT ACTIVE',
        color: 'text-red-500',
      };
    }

    if (forecast) {
      // Priority 2: Imminent Precipitation
      const imminentPrecip = forecast.list.slice(0, 2).find(f => f.pop > 0.3); // 30% chance in next 6 hours
      if (imminentPrecip) {
        const isSnow = imminentPrecip.weather[0].main === 'Snow';
        return {
          priority: 'imminent' as const,
          icon: isSnow ? 'CloudSnow' : 'CloudDrizzle',
          text: `${isSnow ? 'Snow' : 'Rain'} starting soon`,
          color: 'text-yellow-400',
        };
      }

      // Priority 3: Info (High Wind or Low Temp)
      const current = forecast.list[0];
      if (current.wind.speed > 25) {
        return {
          priority: 'info' as const,
          icon: 'Wind',
          text: `High Winds: ${Math.round(current.wind.speed)}mph`,
          color: 'text-blue-300',
        };
      }
      if (current.main.temp < 32) {
        return {
            priority: 'info' as const,
            icon: 'CloudSnow',
            text: `Freezing: ${Math.round(current.main.temp)}°F`,
            color: 'text-blue-300',
        };
      }
    }

    // Priority 4: Clear
    return {
      priority: 'clear' as const,
      icon: 'Sun',
      text: 'Clear Skies',
      color: 'text-gray-400',
    };
  }
);


export default hudSlice.reducer;