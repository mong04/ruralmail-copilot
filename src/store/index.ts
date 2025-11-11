import { configureStore } from '@reduxjs/toolkit';
import routeReducer from './routeSlice';
import settingsReducer from './settingsSlice';
import packageReducer from './packageSlice';
import hudReducer from './hudSlice';

/**
 * Configures the Redux store with slices.
 * DevTools enabled only in development (per Redux docs: https://redux-toolkit.js.org/api/configureStore).
 */
export const store = configureStore({
  reducer: {
    route: routeReducer,
    settings: settingsReducer,
    packages: packageReducer,
    hud: hudReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

// Infer types for hooks
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;