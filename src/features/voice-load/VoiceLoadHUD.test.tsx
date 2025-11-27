// Explicitly import test primitives
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VoiceLoadHUD } from './VoiceLoadHUD';
import { Provider } from 'react-redux';
import { store } from '../../store';

describe('VoiceLoadHUD', () => {
  it('renders initialization button on boot', () => {
    render(
      <Provider store={store}>
        <VoiceLoadHUD />
      </Provider>
    );
    expect(screen.getByText(/INITIALIZE SYSTEM/i)).toBeInTheDocument();
  });

  it('updates visual state to LIVE after initialization', async () => {
    render(
      <Provider store={store}>
        <VoiceLoadHUD />
      </Provider>
    );
    
    // Find button
    const btn = screen.getByText(/INITIALIZE SYSTEM/i);
    
    // Click it to trigger audio unlock and state change
    fireEvent.click(btn);
    
    // In a real integration test, we might need to wait for the state transition.
    // Since we are mocking the store behavior via the real Redux store, 
    // and the transition is immediate in logic (though async in audio),
    // we use findByText to await the appearance.
    expect(await screen.findByText(/LIVE/i)).toBeInTheDocument();
  });
});