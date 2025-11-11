import { createHashRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import RouteSetup from '../route-setup/RouteSetup';
import Settings from '../Settings';
import Packages from '../packages/Packages';
import Delivery from '../Delivery/Delivery';
import Layout from '../layout/Layout'; // Adjust path if needed

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