import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loadSettings, saveSettings, type SettingsData } from '../../db';

interface SettingsState extends SettingsData {
  loading: boolean;
}

const initialState: SettingsState = {
  loading: false,
};

/**
 * Async thunk to load settings from DB.
 * @returns {Promise<SettingsData>} Loaded settings.
 */
export const loadSettingsFromDB = createAsyncThunk('settings/load', async () => {
  return await loadSettings();
});

/**
 * Async thunk to save settings to DB.
 * @param {SettingsData} settings - Settings to save.
 * @returns {Promise<SettingsData>} Saved settings.
 */
export const saveSettingsToDB = createAsyncThunk('settings/save', async (settings: SettingsData) => {
  await saveSettings(settings);
  return settings;
});

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {},
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
      });
  },
});

export default settingsSlice.reducer;