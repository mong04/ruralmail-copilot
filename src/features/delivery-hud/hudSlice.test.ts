// src/features/delivery-hud/hudSlice.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import hudReducer, {
  dismissBriefing,
  fetchForecast,
  fetchSevereAlerts,
  selectDynamicHudAlert,
  selectWeatherBriefingData,
  type HudState,
  type ForecastData,
  type AlertData,
} from './hudSlice';
import { type Stop, type Package } from '../../db';
import type { RootState } from '../../store';
import axios from 'axios';
// --- FIX: Import the types for the other slices ---
import type { SettingsState } from '../../features/settings/settingsSlice';
// Assuming simple types for these, adjust if incorrect
interface RouteState { route: Stop[]; loading: boolean; error: string | null; }
interface PackageState { packages: Package[]; loading: boolean; error: string | null; }


// --- Mock axios ---
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

// --- Mock Data (Now using real, strict types) ---
// ... (mockClearForecast, mockPrecipForecast, etc. - no changes here)
const mockClearForecast: ForecastData = {
  list: [
    { dt: 1731776400, main: { temp: 70, feels_like: 68, temp_max: 72 }, weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }], wind: { speed: 5 }, pop: 0 },
    { dt: 1731787200, main: { temp: 72, feels_like: 70, temp_max: 73 }, weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }], wind: { speed: 5 }, pop: 0 },
    { dt: 1731798000, main: { temp: 71, feels_like: 69, temp_max: 71 }, weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }], wind: { speed: 5 }, pop: 0 },
  ],
};

const mockPrecipForecast: ForecastData = {
  list: [
    { dt: 1731776400, main: { temp: 40, feels_like: 38, temp_max: 40 }, weather: [{ id: 600, main: 'Snow', description: 'light snow', icon: '13d' }], wind: { speed: 10 }, pop: 0.8 },
    { dt: 1731787200, main: { temp: 38, feels_like: 35, temp_max: 40 }, weather: [{ id: 601, main: 'Snow', description: 'snow', icon: '13d' }], wind: { speed: 15 }, pop: 0.9 },
    { dt: 1731798000, main: { temp: 37, feels_like: 34, temp_max: 40 }, weather: [{ id: 601, main: 'Snow', description: 'snow', icon: '13d' }], wind: { speed: 15 }, pop: 0.9 },
  ],
};

const mockSevereAlerts: AlertData[] = [
  { event: 'Wind Chill Advisory', description: 'Very cold wind chills expected.', start: 123, end: 456, sender_name: 'NWS', tags: [] },
];

const mockNoAlerts: AlertData[] = [];


// --- Mock Initial State ---
const hudInitialState: HudState = {
  currentStop: 0,
  loading: false,
  position: { lat: 40, lng: -79 },
  voiceEnabled: false,
  mapStyle: 'streets',
  cameraMode: 'task',
  forecast: null,
  severeAlerts: null,
  briefingDismissed: false,
};

// --- FIX: Create valid initial states for other slices ---
const mockRouteInitialState: RouteState = { 
  route: [], 
  loading: false, 
  error: null 
};

const mockPackagesInitialState: PackageState = { 
  packages: [], 
  loading: false, 
  error: null 
};

// This must match the initialState from settingsSlice.ts
const mockSettingsInitialState: SettingsState = {
  loading: false,
  lastSaved: null,
  defaultCity: '',
  defaultState: '',
  defaultZip: '',
  defaultRouteName: '',
  preferredNavApp: 'in-app',
};

// --- FIX: Update the helper function ---
// Helper to create a mock RootState
const createMockState = (hudState: Partial<HudState>): RootState => ({
  hud: { ...hudInitialState, ...hudState },
  route: mockRouteInitialState,
  packages: mockPackagesInitialState,
  settings: mockSettingsInitialState, // Use the complete, valid mock
});

// --- Reset mocks before each test ---
// ... (rest of the file is the same)
beforeEach(() => {
  mockedAxios.get.mockClear();
});

describe('hudSlice selectors', () => {
  // ... (all your selector tests)
    // Test 1: Priority 1 (Severe)
  it('selectDynamicHudAlert should return Priority 1 (Severe) when alerts are present', () => {
    const state = createMockState({
      severeAlerts: mockSevereAlerts,
      forecast: mockClearForecast,
    });
    const alertData = selectDynamicHudAlert(state);
    expect(alertData.priority).toBe('severe');
    expect(alertData.icon).toBe('AlertTriangle');
    expect(alertData.text).toContain('SEVERE ALERT ACTIVE');
  });

  // Test 2: Priority 2 (Imminent)
  it('selectDynamicHudAlert should return Priority 2 (Imminent) for precipitation', () => {
    const state = createMockState({
      severeAlerts: mockNoAlerts, // Use the correct empty array
      forecast: mockPrecipForecast,
    });
    const alertData = selectDynamicHudAlert(state);
    expect(alertData.priority).toBe('imminent');
    expect(alertData.icon).toBe('CloudSnow');
    expect(alertData.text).toContain('Snow');
  });

  // Test 3: Priority 4 (Clear)
  it('selectDynamicHudAlert should return Priority 4 (Clear) with no adverse conditions', () => {
    const state = createMockState({
      severeAlerts: mockNoAlerts, // Use the correct empty array
      forecast: mockClearForecast,
    });
    const alertData = selectDynamicHudAlert(state);
    expect(alertData.priority).toBe('clear');
    expect(alertData.icon).toBe('Sun');
  });

  // Test 4: Briefing Visibility (Visible)
  it('selectWeatherBriefingData should set isVisible to true when forecast is loaded and not dismissed', () => {
    const state = createMockState({
      forecast: mockClearForecast,
      briefingDismissed: false,
    });
    const briefingData = selectWeatherBriefingData(state);
    expect(briefingData.isVisible).toBe(true);
    expect(briefingData.currentTemp).toBe(70);
  });

  // Test 5: Briefing Visibility (Dismissed)
  it('selectWeatherBriefingData should set isVisible to false after dismissBriefing is called', () => {
    const state = createMockState({
      forecast: mockClearForecast,
      briefingDismissed: false,
    });

    const newState = hudReducer(state.hud, dismissBriefing());
    const newRootState = { ...state, hud: newState };

    const briefingData = selectWeatherBriefingData(newRootState);
    expect(briefingData.isVisible).toBe(false);
  });
});

describe('hudSlice async thunks', () => {

  describe('fetchForecast', () => {
    it('handles pending state', () => {
      // FIX: The second argument should be 'undefined'
      const state = hudReducer(hudInitialState, fetchForecast.pending('', undefined));
      expect(state.loading).toBe(true);
    });

    it('handles fulfilled state', () => {
      const action = { type: fetchForecast.fulfilled.type, payload: mockClearForecast };
      const state = hudReducer(hudInitialState, action);
      expect(state.loading).toBe(false);
      expect(state.forecast).toEqual(mockClearForecast);
    });

    it('handles rejected state', () => {
      const action = { type: fetchForecast.rejected.type, error: { message: 'Fetch failed' } };
      // FIX: This was a typo, changed 'initialSection' to 'hudInitialState'
      const state = hudReducer(hudInitialState, action);
      expect(state.loading).toBe(false);
      expect(state.forecast).toBe(null);
    });
  });

  describe('fetchSevereAlerts', () => {
    it('handles pending state', () => {
      // FIX: The second argument should be 'undefined'
      const state = hudReducer(hudInitialState, fetchSevereAlerts.pending('', undefined));
      expect(state.loading).toBe(false); // Correct, no loading state for this thunk
    });

    it('handles fulfilled state', () => {
      const action = { type: fetchSevereAlerts.fulfilled.type, payload: mockSevereAlerts };
      const state = hudReducer(hudInitialState, action);
      expect(state.severeAlerts).toEqual(mockSevereAlerts);
    });

    it('handles rejected state', () => {
      const action = { type: fetchSevereAlerts.rejected.type, error: { message: 'Fetch failed' } };
      const state = hudReducer(hudInitialState, action);
      expect(state.severeAlerts).toBe(null); // Or remain unchanged
    });
  });
});