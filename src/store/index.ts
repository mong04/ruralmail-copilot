import { configureStore } from '@reduxjs/toolkit';
// We'll add reducers later; for now, empty store

export const store = configureStore({
  reducer: {
    // Add slices here in future steps
  },
});

// Infer types for use in hooks
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;