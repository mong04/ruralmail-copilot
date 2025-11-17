import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';

import { store } from './store';
import App from './App.tsx';
import './style.css';
import { Toaster } from 'sonner';

import { loadRouteFromDB } from './features/route-setup/routeSlice';
import { loadPackagesFromDB } from './features/package-management/packageSlice';
import { loadSettingsFromDB } from './features/settings/settingsSlice';
import { loadHudFromDB } from './features/delivery-hud/hudSlice';
import 'mapbox-gl/dist/mapbox-gl.css';

function initApp() {
  store.dispatch(loadRouteFromDB());
  store.dispatch(loadPackagesFromDB());
  store.dispatch(loadSettingsFromDB());
  store.dispatch(loadHudFromDB());
}

// ✅ REMOVED: This logic is now handled by the Redux store's initialState
// const theme = localStorage.getItem("theme");
// if (theme === "dark") {
//   document.documentElement.classList.add("dark");
// } else {
//   document.documentElement.classList.remove("dark")
// }

initApp();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      {/* ✅ FIX:
        Moved the toaster to the top-right corner to avoid overlapping with
        either the top navigation panel or the bottom HUD panel.
      */}
      <Toaster position="top-right" richColors gap={16} />
      <App />
    </Provider>
  </React.StrictMode>
);