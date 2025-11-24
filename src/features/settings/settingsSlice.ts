// src/features/settings/settingsSlice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { loadSettings, saveSettings, type SettingsData } from '../../db';

export interface SettingsState extends SettingsData {
  loading: boolean;
  lastSaved: string | null;
}

const initialState: SettingsState = {
  loading: false,
  lastSaved: null,
  defaultCity: '',
  defaultState: '',
  defaultZip: '',
  defaultRouteName: '',
  preferredNavApp: 'in-app',
  theme: 'light',
  richThemingEnabled: true, // ← default on
};

export const loadSettingsFromDB = createAsyncThunk('settings/load', async () => {
  return await loadSettings();
});

export const saveSettingsToDB = createAsyncThunk(
  'settings/save',
  async (settings: SettingsData) => {
    await saveSettings(settings);
    return settings;
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    // ← ADD THIS ACTION
    toggleRichTheming(state, action: PayloadAction<boolean>) {
      state.richThemingEnabled = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSettingsFromDB.fulfilled, (state, action) => {
        Object.assign(state, action.payload);
        state.loading = false;
      })
      .addCase(loadSettingsFromDB.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadSettingsFromDB.rejected, (state) => {
        state.loading = false;
      })
      .addCase(saveSettingsToDB.fulfilled, (state, action) => {
        Object.assign(state, action.payload);
        state.lastSaved = new Date().toISOString();
      });
  },
});

// ← EXPORT THE ACTION
export const { toggleRichTheming } = settingsSlice.actions;

export default settingsSlice.reducer;