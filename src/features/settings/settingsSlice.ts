import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loadSettings, saveSettings, type SettingsData } from '../../db';

// ✅ The state now fully mirrors the DB type
interface SettingsState extends SettingsData {
  loading: boolean;
  lastSaved: string | null; // ✅ Add lastSaved for peace of mind
}

const initialState: SettingsState = {
  loading: false,
  lastSaved: null,
  defaultCity: '',
  defaultState: '',
  defaultZip: '',
  defaultRouteName: '',
  preferredNavApp: 'in-app',
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
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadSettingsFromDB.fulfilled, (state, action) => {
        // ✅ Merge saved settings into the initial state
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
        // ✅ Merge saved settings into the current state
        Object.assign(state, action.payload);
        state.lastSaved = new Date().toISOString(); // ✅ Update lastSaved
      });
  },
});

export default settingsSlice.reducer;