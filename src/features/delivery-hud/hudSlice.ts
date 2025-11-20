// src/features/delivery-hud/hudSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction, createSelector } from '@reduxjs/toolkit';
import axios from 'axios';
import { loadHud, saveHud, type HudData } from '../../db'; 
import { showNotification } from '../notification/notificationSlice';
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

export interface NavigationData {
  geometry: unknown; // GeoJSON geometry
  duration: number; // in seconds
  distance: number; // in meters
  steps: {
    maneuver: {
      instruction: string;
      type?: string;
      modifier?: string;
    };
    location: [number, number]; // [lng, lat]
    distance: number;
  }[];
}
export interface HudState extends Omit<HudData, 'weatherAlerts'> {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  position: { lat: number; lng: number; heading?: number } | null;
  voiceEnabled: boolean;
  currentStop: number;
  mapStyle: 'streets' | 'satellite';
  cameraMode: 'task' | 'follow' | 'overview';
  forecast: ForecastData | null;
  severeAlerts: AlertData[] | null;
  briefingDismissed: boolean;
  isNavigating: boolean;
  navigationData: NavigationData | null;
  navigationStepIndex: number;
  isMapOffCenter: boolean;
}

const initialState: HudState = {
  currentStop: 0,
  status: 'idle',
  position: null,
  voiceEnabled: false,
  mapStyle: 'streets',
  cameraMode: 'task',
  forecast: null,
  severeAlerts: null,
  briefingDismissed: false,
  isNavigating: false,
  navigationData: null,
  navigationStepIndex: 0,
  isMapOffCenter: false
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
  async (position: { lat: number; lng: number }, { rejectWithValue }) => { 
    const token = import.meta.env.VITE_OPENWEATHER_TOKEN;

    const { lat, lng } = position;
    if (!token || !lat || !lng) {
      return rejectWithValue('No position or token');
    }

    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${token}&units=imperial`
      );
      return response.data as ForecastData;
    } catch (err) {
      // const message = err instanceof Error ? err.message : 'Failed to fetch forecast'; // 'message' is assigned a value but never used.
      console.error('Forecast fetch failed:', err);
      return rejectWithValue('Fetch error');
    }
  }
);

/**
 * Fetches government weather alerts.
 */
export const fetchSevereAlerts = createAsyncThunk(
  'hud/fetchSevereAlerts',
  async (position: { lat: number; lng: number }, { rejectWithValue }) => { 
    const { lat, lng } = position;
    const token = import.meta.env.VITE_OPENWEATHER_TOKEN;

    if (!token || !lat || !lng) {
      return rejectWithValue('No position or token');
    }

    try {
      // Note: OWM free tier does not include alerts. This is for demonstration.
      // A real app would use a different endpoint or paid tier.
      // The OneCall API v2.5 is deprecated; new keys require v3.0.
      const response = await axios.get(
        // Switched from deprecated 2.5 to 3.0
        `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lng}&exclude=minutely,hourly,daily,current&appid=${token}`
      );
      const alerts = (response.data.alerts || []) as AlertData[];
      return alerts;
    } catch (err) {
      // Don't show toast for this as it runs in background
      console.error('Severe alerts fetch failed:', err);
      return rejectWithValue('Fetch error');
    }
  }
);

/**
 * Fetches driving directions from Mapbox.
 */
export const fetchDirections = createAsyncThunk(
  'hud/fetchDirections',
  async ({ end }: { end: { location: [number, number] } }, { getState, rejectWithValue, dispatch }) => {
    const state = getState() as RootState;
    const start = state.hud.position;

    // This should theoretically not be hit due to the `condition` below, but serves as a safeguard.
    if (!start) {
      return rejectWithValue('Starting position is null');
    }

    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) return rejectWithValue('No Mapbox token');
    
    const profile = 'driving-traffic'; // 'driving', 'walking', 'cycling'
    // Round coordinates to 6 decimal places. The Mapbox API can be sensitive to
    // overly long coordinate precision. 6 decimal places provides ~11cm precision.
    const startCoords = `${Number(start.lng).toFixed(6)},${Number(start.lat).toFixed(6)}`;
    const endCoords = `${Number(end.location[0]).toFixed(6)},${Number(end.location[1]).toFixed(6)}`;

    // Use `overview=full` to get the most detailed route geometry for a smooth line.
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${startCoords};${endCoords}?steps=true&geometries=geojson&overview=full&access_token=${token}`;

    try {
      const response = await axios.get(url);
      dispatch(showNotification({ message: 'Calculating route...', type: 'info' }));
      const route = response.data.routes[0];
      if (!route) return rejectWithValue('No route found');

      const navigationData: NavigationData = {
        geometry: route.geometry,
        duration: route.duration,
        distance: route.distance,
        steps: route.legs[0].steps,
      };
      return navigationData;
    } catch (err) {
      let errorMessage = 'Failed to fetch directions';
      // Check if it's an Axios error with a response from the server
      if (axios.isAxiosError(err) && err.response) {
        // Use the specific error message from Mapbox if available
        errorMessage = err.response.data?.message || errorMessage;
      }
      // Dispatch a specific notification to the user
      dispatch(showNotification({
        message: 'Navigation Error', description: errorMessage, type: 'error'
      }));
      return rejectWithValue(errorMessage);
    }
  },
  {
    // Prevent the thunk from running if we don't have a position yet.
    condition: (_, { getState }) => {
      const { hud } = getState() as RootState;
      if (!hud.position) {
        console.warn('[Directions] Aborting fetchDirections: No user position available in state.');
        return false; // Abort the thunk
      }
      return true; // Proceed with the thunk
    },
  }
);

const hudSlice = createSlice({
  name: 'hud',
  initialState,
  reducers: {
    updatePosition: (state, action: PayloadAction<{ lat: number; lng: number; heading?: number }>) => {
      state.position = action.payload;
    },
    advanceStop: (state) => {
      state.currentStop += 1;
    },
    setCurrentStop: (state, action: PayloadAction<number>) => {
      state.currentStop = action.payload;
    },
    toggleVoice: (state, action: PayloadAction<boolean>) => { state.voiceEnabled = action.payload; },
    setMapStyle: (state, action: PayloadAction<HudState['mapStyle']>) => {
      state.mapStyle = action.payload;
    },
    setCameraMode: (state, action: PayloadAction<HudState['cameraMode']>) => {
      state.cameraMode = action.payload;
    },
    cycleCameraMode: (state) => {
      const modes: HudState['cameraMode'][] = ['task', 'follow', 'overview'];
      const currentIndex = modes.indexOf(state.cameraMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      state.cameraMode = modes[nextIndex];
    },
    dismissBriefing: (state) => {
      state.briefingDismissed = true;
    },
    exitNavigation: (state) => {
      state.isNavigating = false;
      state.navigationData = null;
      state.navigationStepIndex = 0;
      state.cameraMode = 'task'; // Revert camera to task mode on exit
    },
    advanceNavigationStep: (state) => {
      state.navigationStepIndex += 1;
    },
    setMapOffCenter(state, action: PayloadAction<boolean>) {
      state.isMapOffCenter = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadHudFromDB.fulfilled, (state, action) => {
        state.currentStop = action.payload.currentStop;
      })
      .addCase(fetchForecast.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchForecast.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.forecast = action.payload;
      })
      .addCase(fetchForecast.rejected, (state) => {
        state.status = 'failed';
      })
      .addCase(fetchSevereAlerts.fulfilled, (state, action) => {
        // Note: We don't change primary status for this background task,
        // but you could add a separate status for alerts if needed.
        if (action.payload && action.payload.length > 0) {
          state.severeAlerts = action.payload;
        }
      })
      .addCase(fetchDirections.pending, (state) => {
        state.isNavigating = true;
      })
      .addCase(fetchDirections.fulfilled, (state, action) => {
        state.isNavigating = true; // Ensure navigation state is active
        state.cameraMode = 'follow'; // Automatically switch to follow mode on success
        state.navigationStepIndex = 0;
        state.navigationData = action.payload;
      })
      .addCase(fetchDirections.rejected, (state) => {
        state.isNavigating = false;
        state.navigationData = null;
      });
      
  },
});

export const { 
  updatePosition, 
  advanceStop, 
  setCurrentStop,
  toggleVoice,
  setMapStyle,
  setCameraMode, 
  cycleCameraMode,
  dismissBriefing,
  exitNavigation,
  advanceNavigationStep,
  setMapOffCenter
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
    if (weatherId >= 700 && weatherId < 800) return 'Cloud'; // Atmosphere (e.g., fog, haze) -> Use Cloud
    if (weatherId === 800) return 'Sun'; // Clear
    if (weatherId > 800) return 'Cloud'; // Clouds -> Use Cloud
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

/**
 * Selects the most relevant forecast entry from the list based on the current time.
 * This selector does NOT need to be memoized with reselect because it depends on `Date.now()`,
 * which should always cause it to re-evaluate when the component re-renders.
 * It finds the first forecast in the list that is for a future time.
 */
export const selectCurrentForecastPeriod = (state: RootState) => {
  const forecastList = state.hud.forecast?.list;
  if (!forecastList || forecastList.length === 0) return null;

  const nowInSeconds = Date.now() / 1000;
  // Find the first forecast period that is in the future or very recent past.
  const currentPeriod = forecastList.find(f => f.dt >= nowInSeconds - 3600); // Look for forecast up to 1hr old
  return currentPeriod || forecastList[0]; // Fallback to the first item
};

export const selectDynamicHudAlert = createSelector(
  [selectCurrentForecastPeriod, selectForecast, selectSevereAlerts],
  (currentPeriod, forecast, severeAlerts) => {
    // Priority 1: Severe Alert
    if (severeAlerts && severeAlerts.length > 0) {
      return {
        priority: 'severe' as const,
        icon: 'AlertTriangle',
        text: 'SEVERE ALERT ACTIVE',
        color: 'text-red-500',
      };
    }

    if (forecast && currentPeriod) {
      // Priority 2: Imminent Precipitation
      // Check the next two 3-hour blocks (6 hours) for precipitation
      const currentIndex = forecast.list.findIndex(f => f.dt === currentPeriod.dt);
      const lookaheadIndex = Math.max(0, currentIndex);
      const imminentPrecip = forecast.list.slice(lookaheadIndex, lookaheadIndex + 2).find(f => f.pop > 0.3);
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
      if (currentPeriod.wind.speed > 25) {
        return {
          priority: 'info' as const,
          icon: 'Wind',
          text: `High Winds: ${Math.round(currentPeriod.wind.speed)}mph`,
          color: 'text-blue-300',
        };
      }
      if (currentPeriod.main.temp < 32) {
        return {
            priority: 'info' as const,
            icon: 'CloudSnow',
            text: `Freezing: ${Math.round(currentPeriod.main.temp)}°F`,
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