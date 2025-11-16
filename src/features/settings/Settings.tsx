import React, { useEffect, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
// ✅ FIX: Removed the stray 'tr' from this import
import { saveSettingsToDB } from './settingsSlice';
import { clearRoute, loadRoute, saveRoute, type RouteData } from '../../db';
import { clearPackagesFromDB } from '../package-management/packageSlice';
import { toast } from 'sonner';
import { type SettingsData } from '../../db';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
// ❌ Remove the old theme hook
// import { useTheme } from '../../hooks/useTheme';
import {
  Database,
  UploadCloud,
  DownloadCloud,
  Trash2,
  Map,
  Moon,
  Sun,
  Palette,
  FileText,
  AlertTriangle,
} from 'lucide-react';

// Re-usable UI components for this page
const SettingRow: React.FC<React.PropsWithChildren<{ title: string; icon: React.ElementType }>> = ({
  title,
  icon: Icon,
  children,
}) => (
  <div className="flex items-center justify-between p-4 border-b border-border last:border-b-0">
    <div className="flex items-center gap-3">
      <Icon className="w-5 h-5 text-brand" />
      <span className="font-semibold">{title}</span>
    </div>
    <div className="max-w-[50%]">{children}</div>
  </div>
);

const SettingInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className="w-full text-right p-2 border border-border rounded-lg bg-surface-muted focus:ring-2 focus:ring-brand"
  />
);

const SettingSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select
    {...props}
    className="w-full text-right p-2 border border-border rounded-lg bg-surface-muted focus:ring-2 focus:ring-brand"
  />
);

/**
 * Settings component for managing default location, data, and app preferences.
 */
const Settings: React.FC = () => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);
  // ✅ FIX: Get theme directly from the Redux store
  const { theme } = settings;
  const [form, setForm] = useState<SettingsData>(settings);

  // Keep local form state in sync with Redux
  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    },
    []
  );

  const handleSave = useCallback(() => {
    // ✅ FIX: We now save the *entire* form, including any theme changes
    // that might have been staged (though toggleTheme is instant)
    dispatch(saveSettingsToDB(form));
    toast.success('Settings saved!');
  }, [dispatch, form]);

  // ✅ FIX: New toggle function that dispatches to Redux
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    // Save *all* settings, but with the new theme applied
    dispatch(saveSettingsToDB({ ...form, theme: newTheme }));
  };

  // --- Data Management Handlers ---

  const handleExport = async () => {
    try {
      const route = await loadRoute();
      if (!route || route.length === 0) {
        toast.error('No route data to export.');
        return;
      }
      const dataStr = JSON.stringify(route, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ruralmail_route_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Route data exported successfully!');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export route data.');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (!window.confirm('Importing will overwrite your current route. Are you sure?')) {
        return;
      }

      try {
        const text = await file.text();
        const routeData = JSON.parse(text) as RouteData;
        // Basic validation
        if (Array.isArray(routeData) && routeData.every((stop) => 'address_line1' in stop)) {
          await saveRoute(routeData);
          toast.success('Route imported successfully! Please restart the app.');
          // We can't easily hot-reload the route everywhere, so a restart is safest.
        } else {
          toast.error('Invalid route file format.');
        }
      } catch (err) {
        console.error('Import failed:', err);
        toast.error('Failed to import route file.');
      }
    };
    input.click();
  };

  const handleClearRoute = () => {
    if (window.confirm('ARE YOU SURE? This will permanently delete your entire route.')) {
      clearRoute();
      toast.success('Route data cleared. Please restart the app.');
    }
  };

  const handleClearPackages = () => {
    if (window.confirm("ARE YOU SURE? This will delete today's package list.")) {
      dispatch(clearPackagesFromDB());
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Settings</h2>

      {/* General Settings */}
      <Card className="overflow-hidden shadow-sm">
        <SettingRow title="Default Route Name" icon={FileText}>
          <SettingInput
            name="defaultRouteName"
            value={form.defaultRouteName || ''}
            onChange={handleChange}
            placeholder="e.g., Route 7"
          />
        </SettingRow>
        <SettingRow title="Default City" icon={FileText}>
          <SettingInput
            name="defaultCity"
            value={form.defaultCity || ''}
            onChange={handleChange}
            placeholder="e.g., Anytown"
          />
        </SettingRow>
        <SettingRow title="Default State" icon={FileText}>
          <SettingInput
            name="defaultState"
            value={form.defaultState || ''}
            placeholder="e.g., PA"
            maxLength={2}
          />
        </SettingRow>
        <SettingRow title="Default Zip" icon={FileText}>
          <SettingInput
            name="defaultZip"
            value={form.defaultZip || ''}
            placeholder="e.g., 12345"
            maxLength={5}
          />
        </SettingRow>
      </Card>

      {/* Navigation & App Settings */}
      <Card className="overflow-hidden shadow-sm">
        <SettingRow title="Preferred Navigation" icon={Map}>
          <SettingSelect
            name="preferredNavApp"
            value={form.preferredNavApp || 'in-app'}
            onChange={handleChange}
          >
            <option value="in-app">In-App Map</option>
            <option value="google">Google Maps</option>
            <option value="apple">Apple Maps</option>
            <option value="waze">Waze</option>
          </SettingSelect>
        </SettingRow>
        <SettingRow title="Appearance" icon={Palette}>
          <Button variant="surface" onClick={toggleTheme}>
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 mr-2" />
            ) : (
              <Moon className="w-5 h-5 mr-2" />
            )}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </Button>
        </SettingRow>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} size="lg" className="w-full">
        Save All Settings
      </Button>

      {/* Data Management */}
      <Card className="overflow-hidden shadow-sm">
        <SettingRow title="Export Route Data" icon={DownloadCloud}>
          <Button variant="surface" onClick={handleExport}>
            Export
          </Button>
        </SettingRow>
        <SettingRow title="Import Route Data" icon={UploadCloud}>
          <Button variant="surface" onClick={handleImport}>
            Import
          </Button>
        </SettingRow>
        <SettingRow title="Last Saved" icon={Database}>
          <span className="text-muted text-sm">
            {settings.lastSaved ? new Date(settings.lastSaved).toLocaleString() : 'Not saved yet'}
          </span>
        </SettingRow>
      </Card>

      {/* Danger Zone */}
      <Card className="border-danger/50 overflow-hidden shadow-sm">
        <div className="p-4 bg-danger/10">
          <h3 className="font-bold text-danger flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </h3>
        </div>
        <SettingRow title="Clear Today's Packages" icon={Trash2}>
          <Button variant="danger" onClick={handleClearPackages}>
            Clear
          </Button>
        </SettingRow>
        <SettingRow title="Clear All Route Data" icon={Trash2}>
          <Button variant="danger" onClick={handleClearRoute}>
            Clear
          </Button>
        </SettingRow>
      </Card>

      <div className="text-center text-muted text-xs pt-4">
        App Version: 1.0.0
      </div>
    </div>
  );
};

export default Settings;