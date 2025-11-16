// src/features/delivery-hud/Delivery.test.tsx
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '../../store';
import Delivery from './Delivery';

test('renders weather alerts', async () => {
  render(
    <Provider store={store}>
      <Delivery />
    </Provider>
  );

  const alert = await screen.findByText(/No alerts/i);
  expect(alert).toBeInTheDocument();
});
