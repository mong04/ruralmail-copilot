import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App.tsx';
import './style.css';
import { Toaster } from 'sonner';
import { loadRouteFromDB } from './store/routeSlice';
import { loadPackagesFromDB } from './store/packageSlice';

store.dispatch(loadPackagesFromDB());
store.dispatch(loadRouteFromDB());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <Toaster />
      <App />
    </Provider>
  </React.StrictMode>,
);