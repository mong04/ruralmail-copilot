import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { type AppDispatch, type RootState } from '../store';
import { saveSettingsToDB, loadSettingsFromDB } from '../store/settingsSlice';
import { toast } from 'sonner';
import { type SettingsData } from '../db';

const Settings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const dispatch = useDispatch<AppDispatch>();
  const settings = useSelector((state: RootState) => state.settings);
  const [form, setForm] = useState<SettingsData>(settings);

  useEffect(() => {
    dispatch(loadSettingsFromDB());
  }, [dispatch]);

  useEffect(() => {
    setForm(settings);
  }, [settings]); // Sync form when Redux settings change

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    dispatch(saveSettingsToDB(form));
    toast.success('Defaults saved!');
  };

  return (
    <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Settings</h2>
      <button onClick={onBack} className="mb-4 text-blue-500">Back</button>
      <div className="mb-4">
        <label className="block text-sm mb-1">Default City</label>
        <input name="defaultCity" value={form.defaultCity || ''} onChange={handleChange} className="w-full p-2 border rounded" />
      </div>
      <div className="mb-4">
        <label className="block text-sm mb-1">Default State (e.g., CA)</label>
        <input name="defaultState" value={form.defaultState || ''} onChange={handleChange} className="w-full p-2 border rounded" />
      </div>
      <div className="mb-4">
        <label className="block text-sm mb-1">Default Zip</label>
        <input name="defaultZip" value={form.defaultZip || ''} onChange={handleChange} className="w-full p-2 border rounded" />
      </div>
      <button onClick={handleSave} className="bg-blue-500 text-white py-2 px-4 rounded">Save Defaults</button>
    </div>
  );
};

export default Settings;