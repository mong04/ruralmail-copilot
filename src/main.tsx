import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';

import { store } from './store';
import App from './App.tsx';
import './style.css';
import { Toaster } from 'sonner';

import { loadRouteFromDB } from '../src/features/route-setup/routeSlice.ts';
import { loadPackagesFromDB } from './features/package-management/packageSlice.ts';
import { loadSettingsFromDB } from '../src/features/settings/settingsSlice.ts';
import { loadHudFromDB } from './features/delivery-hud/hudSlice.ts';

/**
 * Initialize application state by dispatching async thunks.
 * Keeping this logic in one place makes the entry file predictable and clean.
 */
function initApp() {
  store.dispatch(loadRouteFromDB());
  store.dispatch(loadPackagesFromDB());
  store.dispatch(loadSettingsFromDB());
  store.dispatch(loadHudFromDB());
}

// Kick off initial state hydration before first render
initApp();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <Toaster />
      <App />
    </Provider>
  </React.StrictMode>
);
