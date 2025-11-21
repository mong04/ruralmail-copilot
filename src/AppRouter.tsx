// src/AppRouter.tsx
import { createHashRouter } from 'react-router-dom';
import Dashboard from './features/dashboard/Dashboard';
import RouteSetup from './features/route-setup/RouteSetup';
import Settings from './features/settings/Settings';
import Packages from './features/package-management/views/Packages';
import Delivery from './features/delivery-hud/Delivery';
import BottomNavLayout from './components/layout/BottomNavLayout';
import { LoadTruck } from './features/package-management/views/LoadTruck';

export const router = createHashRouter([
  {
    // Use the new layout as the wrapper
    element: <BottomNavLayout />,
    children: [
      {
        path: '/',
        element: <Dashboard />,
      },
      {
        path: '/route-setup',
        element: <RouteSetup />,
      },
      {
        path: '/settings',
        element: <Settings />,
      },
      {
        path: '/packages',
        element: <Packages />,
      },
      {
        path: 'load-truck',
        element: <LoadTruck />,
      }
    ],
  },
  {
    // The delivery route remains full-screen, outside the layout
    path: '/delivery',
    element: <Delivery />,
  },
]);