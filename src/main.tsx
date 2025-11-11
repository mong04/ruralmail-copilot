import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App.tsx';
import './style.css';
import { Toaster } from 'sonner';
import { loadRouteFromDB } from './store/routeSlice';
import { loadPackagesFromDB } from './store/packageSlice';
import { loadSettingsFromDB } from './store/settingsSlice';
import { loadHudFromDB } from './store/hudSlice';

// Dispatch initial loads (fire-and-forget; thunks handle async)
store.dispatch(loadRouteFromDB());
store.dispatch(loadPackagesFromDB());
store.dispatch(loadSettingsFromDB());
store.dispatch(loadHudFromDB());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <Toaster />
      <App />
    </Provider>
  </React.StrictMode>
);