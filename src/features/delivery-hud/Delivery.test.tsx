// src/features/delivery-hud/Delivery.test.tsx
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { test, expect, vi } from 'vitest';

// 1. Import the new rootReducer and RootState
import { rootReducer, type RootState } from '../../store'; 

// 2. Import the REAL state types from your slices
//    (Ensure these are exported from their respective files)
import type { RouteState } from '../../features/route-setup/routeSlice';
import type { PackageState } from '../../features/package-management/store/packageSlice';
import type { Stop, Package } from '../../db';

import Delivery from './Delivery';

// 3. Mock mapbox-gl to prevent WebGL errors
vi.mock('mapbox-gl', () => ({
  default: {
    Map: vi.fn(() => ({
      on: vi.fn(),
      addControl: vi.fn(),
      remove: vi.fn(),
    })),
    NavigationControl: vi.fn(),
    Marker: vi.fn(() => ({
      setLngLat: vi.fn(() => ({
        addTo: vi.fn(),
      })),
      remove: vi.fn(),
    })),
    LngLatBounds: vi.fn(() => ({
      extend: vi.fn(),
    })),
  },
}));

// 4. Create a test-specific render function
const renderWithProviders = (
  ui: React.ReactElement,
  {
    preloadedState = {},
    ...renderOptions
  }: { preloadedState?: Partial<RootState> } = {} // Use TypeScript's built-in Partial
) => {
  const testStore = configureStore({
    reducer: rootReducer as never, // Use the imported rootReducer
    preloadedState,
  });

  return render(
    <Provider store={testStore}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Provider>,
    { ...renderOptions }
  );
};

// 5. The Test
test('renders default weather alert from hudSlice', async () => {
  // Explicitly type the mock state objects using the imported types
  const mockRoute: RouteState = {
    // Cast as Stop to satisfy type, even if minimal
    route: [{ id: 'stop-1', full_address: '123 Fake St', lat: 0, lng: 0 } as Stop], 
    loading: false,
    error: null,
  };
  
  const mockPackages: PackageState = {
    // Cast as Package
    packages: [{ id: 'pkg-1', assignedStopId: 'stop-1', delivered: false, size: 'medium' } as Package], 
    loading: false,
    error: null,
    loadingSession: { isActive: false, startTime: null, endTime: null, count: 0 },
  };

  // Create the preloaded state using Partial<RootState>
  const mockState: Partial<RootState> = {
    route: mockRoute,
    packages: mockPackages,
  };

  renderWithProviders(<Delivery />, { preloadedState: mockState });

  // Now, the component will have an active stop and render "Clear Skies"
  const alert = await screen.findByText(/Clear Skies/i);

  expect(alert).not.toBeNull();
});