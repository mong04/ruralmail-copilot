import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { type AppDispatch, type RootState } from '../store';
import { saveSettingsToDB } from '../store/settingsSlice';
import { toast } from 'sonner';
import { type SettingsData } from '../db';

/**
 * Settings component for managing default location data.
 * Persists changes via Redux and IndexedDB.
 */
const Settings: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const settings = useSelector((state: RootState) => state.settings);
  const [form, setForm] = useState<SettingsData>(settings);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  const handleSave = useCallback(() => {
    dispatch(saveSettingsToDB(form));
    toast.success('Defaults saved!');
  }, [dispatch, form]);

  return (
    <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Settings</h2>
      <button
        onClick={() => navigate('/')}
        className="mb-4 text-blue-500 hover:underline focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Back to Dashboard"
      >
        Back
      </button>
      <div className="mb-4">
        <label htmlFor="defaultCity" className="block text-sm mb-1">Default City</label>
        <input
          id="defaultCity"
          name="defaultCity"
          value={form.defaultCity || ''}
          onChange={handleChange}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          aria-required="false"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="defaultState" className="block text-sm mb-1">Default State (e.g., CA)</label>
        <input
          id="defaultState"
          name="defaultState"
          value={form.defaultState || ''}
          onChange={handleChange}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          aria-required="false"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="defaultZip" className="block text-sm mb-1">Default Zip</label>
        <input
          id="defaultZip"
          name="defaultZip"
          value={form.defaultZip || ''}
          onChange={handleChange}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          aria-required="false"
        />
      </div>
      <button
        onClick={handleSave}
        className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Save Defaults"
      >
        Save Defaults
      </button>
    </div>
  );
};

export default Settings;