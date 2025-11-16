// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import routeReducer from '../../src/features/route-setup/routeSlice';
import settingsReducer from '../../src/features/settings/settingsSlice';
import packageReducer from '../features/package-management/packageSlice';
import hudReducer from '../features/delivery-hud/hudSlice';

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

// Typed hooks for use in components
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
