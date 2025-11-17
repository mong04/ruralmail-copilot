// src/features/delivery-hud/hudSlice.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import hudReducer, {
  dismissBriefing,
  fetchForecast,
  fetchSevereAlerts,
  selectDynamicHudAlert,
  selectWeatherBriefingData,
  type HudState,
  type ForecastData,
  type AlertData,
  fetchDirections, // Keep fetchDirections
} from './hudSlice';
import { type Stop, type Package } from '../../db';
import type { RootState } from '../../store';
// --- FIX: Import the types for the other slices ---
import type { SettingsState } from '../../features/settings/settingsSlice';
import { type NotificationState } from '../notification/notificationSlice';
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
const testHudInitialState: HudState = {
  currentStop: 0,
  status: 'idle',
  position: { lat: 40, lng: -79 },
  voiceEnabled: false,
  mapStyle: 'streets',
  cameraMode: 'task',
  forecast: null,
  severeAlerts: null,
  briefingDismissed: false,
  isNavigating: false,
  navigationData: null,
  navigationStepIndex: 0,
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

const mockNotificationInitialState: NotificationState = {
  message: '',
  type: 'info',
  visible: false,
  id: 0, // FIX: Add the missing 'id' property
};

// --- FIX: Update the helper function ---
// Helper to create a mock RootState
const createMockState = (hudState: Partial<HudState>): RootState => ({
  hud: { ...testHudInitialState, ...hudState },
  route: mockRouteInitialState,
  packages: mockPackagesInitialState,
  settings: mockSettingsInitialState, // Use the complete, valid mock
  notification: mockNotificationInitialState,
});

// --- Reset mocks before each test ---
// ... (rest of the file is the same)
beforeEach(() => {
  mockedAxios.get.mockClear();
});

describe('hudSlice', () => {
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

  describe('async thunks', () => {
    const mockDispatch = vi.fn();
    const mockGetState = vi.fn();

    beforeEach(() => {
      mockDispatch.mockClear();
      mockGetState.mockClear();
    });

    describe('fetchForecast', () => {
      it('handles pending state', () => {
        const state = hudReducer({ ...testHudInitialState, status: 'idle' }, fetchForecast.pending('', { lat: 0, lng: 0 }));
        expect(state.status).toBe('loading');
      });

      it('handles fulfilled state', () => {
        const action = { type: fetchForecast.fulfilled.type, payload: mockClearForecast };
        const state = hudReducer({ ...testHudInitialState, status: 'loading' }, action);
        expect(state.status).toBe('succeeded');
        expect(state.forecast).toEqual(mockClearForecast);
      });

      it('handles rejected state', () => {
        const action = { type: fetchForecast.rejected.type, error: { message: 'Fetch failed' } };
        const state = hudReducer({ ...testHudInitialState, status: 'loading' }, action);
        expect(state.status).toBe('failed');
        expect(state.forecast).toBe(null);
      });
    });

    describe('fetchSevereAlerts', () => {
      it('handles pending state', () => {
        const state = hudReducer({ ...testHudInitialState, status: 'succeeded' }, fetchSevereAlerts.pending('', { lat: 0, lng: 0 }));
        expect(state.status).toBe('succeeded'); // Correct, status should not change for this thunk
      });

      it('handles fulfilled state', () => {
        const action = { type: fetchSevereAlerts.fulfilled.type, payload: mockSevereAlerts };
        const state = hudReducer(testHudInitialState, action);
        expect(state.severeAlerts).toEqual(mockSevereAlerts);
      });

      it('handles rejected state', () => {
        const action = { type: fetchSevereAlerts.rejected.type, error: { message: 'Fetch failed' } };
        const state = hudReducer(testHudInitialState, action);
        expect(state.severeAlerts).toBe(null); // Or remain unchanged
      });
    });

    describe('fetchDirections', () => {
      it('should not run if position is null', async () => {
        mockGetState.mockReturnValue({ hud: { position: null } });
        const thunk = fetchDirections({ end: { location: [-79, 40] } });
        await thunk(mockDispatch, mockGetState, undefined);

        // The thunk's condition should fail, so no actions are dispatched.
        expect(mockDispatch).not.toHaveBeenCalled();
      });

      it('should handle pending and fulfilled states correctly', async () => {
        const mockRoute = {
          geometry: { type: 'LineString', coordinates: [[-79, 40], [-79, 41]] },
          duration: 120,
          distance: 1500,
          legs: [{ steps: [{ instruction: 'Go straight' }] }],
        };
        mockedAxios.get.mockResolvedValue({ data: { routes: [mockRoute] } });
        mockGetState.mockReturnValue(createMockState({ position: { lat: 40.1, lng: -79.1 } }));

        const thunk = fetchDirections({ end: { location: [-79, 40] } });
        const result = await thunk(mockDispatch, mockGetState, undefined);

        // Check that the pending action was dispatched
        const pendingAction = mockDispatch.mock.calls[0][0];
        expect(pendingAction.type).toBe('hud/fetchDirections/pending');

        // Check the reducer for the pending state
        let state = hudReducer(testHudInitialState, pendingAction);
        expect(state.isNavigating).toBe(true);

        // Check that the fulfilled action was dispatched
        expect(result.type).toBe('hud/fetchDirections/fulfilled');

        // Check the reducer for the fulfilled state
        state = hudReducer(state, result);
        expect(state.isNavigating).toBe(true);
        expect(state.navigationData).not.toBeNull();
        expect(state.navigationData?.geometry).toEqual(mockRoute.geometry);
        expect(state.cameraMode).toBe('follow');
      });

      it('should handle rejected state when no route is found', async () => {
        mockedAxios.get.mockResolvedValue({ data: { routes: [] } }); // API returns 200 but no routes
        mockGetState.mockReturnValue(createMockState({ position: { lat: 40.1, lng: -79.1 } }));

        const thunk = fetchDirections({ end: { location: [-79, 40] } });
        const result = await thunk(mockDispatch, mockGetState, undefined);

        // Check that the rejected action was dispatched
        expect(result.type).toBe('hud/fetchDirections/rejected');
        expect(result.payload).toBe('No route found');

        // Check the reducer for the rejected state
        const pendingState: HudState = { ...testHudInitialState, isNavigating: true };
        const state = hudReducer(pendingState, result);
        expect(state.isNavigating).toBe(false);
        expect(state.navigationData).toBeNull();
      });
    });
  });
});