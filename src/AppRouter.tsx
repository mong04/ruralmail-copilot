import { createHashRouter } from 'react-router-dom';
import Dashboard from './features/dashboard/Dashboard';
import RouteSetup from './features/route-setup/RouteSetup';
import Settings from '../src/features/settings/Settings';
import Packages from './features/package-management/Packages';
import Delivery from './features/delivery-hud/Delivery';
import Layout from './components/layout/Layout'; // Adjust path if needed

export const router = createHashRouter([
  {
    element: <Layout />,
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
    ],
  },
  {
    path: '/delivery',
    element: <Delivery />,
  },
]);