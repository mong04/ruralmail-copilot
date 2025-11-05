import { configureStore } from '@reduxjs/toolkit';
import routeReducer from './routeSlice';
import settingsReducer from './settingsSlice';
import packageReducer from './packageSlice';

export const store = configureStore({
  reducer: {
    route: routeReducer,
    settings: settingsReducer,
    packages: packageReducer,
  },
});

// Infer types for use in hooks
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;