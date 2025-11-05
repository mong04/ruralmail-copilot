import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loadSettings, saveSettings, type SettingsData } from '../db';

interface SettingsState extends SettingsData {
  loading: boolean;
}

const initialState: SettingsState = {
  loading: false,
};

export const loadSettingsFromDB = createAsyncThunk('settings/load', async () => {
  return await loadSettings();
});

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
      })
      .addCase(saveSettingsToDB.fulfilled, (state, action) => {
        Object.assign(state, action.payload);
      });
  },
});

export default settingsSlice.reducer;