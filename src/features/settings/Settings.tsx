import React, { useEffect, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { saveSettingsToDB } from './settingsSlice';
import { clearRoute, loadRoute, saveRoute, type RouteData } from '../../db';
import { clearPackagesFromDB } from '../package-management/store/packageSlice';
import { toast } from 'sonner';
import { type SettingsData } from '../../db';
import { Card } from '../../components/ui/Card'; // Uses your new Luminous Card
import { Button } from '../../components/ui/Button'; // Uses your new Tactile Button
import { Input } from '../../components/ui/Input'; // ✅ NEW
import { Select } from '../../components/ui/Select'; // ✅ NEW
import {
  // Database,
  UploadCloud,
  DownloadCloud,
  Trash2,
  Map,
  Moon,
  Sun,
  Palette,
  FileText,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';

// --- UI Helper for iOS-style Rows ---
const SettingRow: React.FC<React.PropsWithChildren<{ 
  title: string; 
  icon: React.ElementType;
  color?: string; // 'blue', 'orange', etc.
}>> = ({
  title,
  icon: Icon,
  color = 'text-brand',
  children,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 border-b border-border/40 last:border-0 hover:bg-surface-muted/30 transition-colors">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg bg-surface-muted/50 ${color}`}>
         <Icon className="w-5 h-5" />
      </div>
      <span className="font-semibold text-sm">{title}</span>
    </div>
    <div className="w-full sm:w-1/2 flex justify-end">
        {children}
    </div>
  </div>
);

const Settings: React.FC = () => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);
  const { theme } = settings;
  const [form, setForm] = useState<SettingsData>(settings);

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
    dispatch(saveSettingsToDB(form));
    toast.success('Settings saved!');
  }, [dispatch, form]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    dispatch(saveSettingsToDB({ ...form, theme: newTheme }));
  };

  // --- Data Handlers (Unchanged Logic, just checking types) ---
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
      toast.success('Route data exported!');
    } catch (err) {
      console.error(err);
      toast.error('Export failed.');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (!confirm('Overwrite current route?')) return;

      try {
        const text = await file.text();
        const routeData = JSON.parse(text) as RouteData;
        if (Array.isArray(routeData) && routeData.every((stop) => 'address_line1' in stop)) {
          await saveRoute(routeData);
          toast.success('Import successful! Please restart.');
        } else {
          toast.error('Invalid file format.');
        }
      } catch (err) {
        console.error(err);
        toast.error('Import failed.');
      }
    };
    input.click();
  };

  const handleClearRoute = () => {
    if (confirm('PERMANENTLY DELETE ROUTE?')) {
      clearRoute();
      toast.success('Route cleared.');
    }
  };

  const handleClearPackages = () => {
    if (confirm("Delete today's packages?")) {
      dispatch(clearPackagesFromDB());
    }
  };

  return (
    <div className="space-y-8 pb-24 max-w-2xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Settings</h2>
          <div className="text-xs font-mono text-muted-foreground bg-surface-muted px-2 py-1 rounded-md">v1.0.0</div>
      </div>

      {/* Group 1: General */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider ml-1">Defaults</h3>
        <Card>
            <SettingRow title="Route Name" icon={FileText} color="text-blue-500">
            <Input
                name="defaultRouteName"
                value={form.defaultRouteName || ''}
                onChange={handleChange}
                placeholder="e.g. Route 7"
                className="text-right"
            />
            </SettingRow>
            <SettingRow title="Default City" icon={Map} color="text-green-500">
            <Input
                name="defaultCity"
                value={form.defaultCity || ''}
                onChange={handleChange}
                placeholder="City"
                className="text-right"
            />
            </SettingRow>
            <div className="flex border-b border-border/40 last:border-0">
                {/* Split Row for State/Zip to save space */}
                <div className="w-1/2 p-4 border-r border-border/40">
                    <Input
                        name="defaultState"
                        value={form.defaultState || ''}
                        onChange={handleChange}
                        placeholder="State"
                        maxLength={2}
                        className="text-center uppercase"
                    />
                </div>
                <div className="w-1/2 p-4">
                    <Input
                        name="defaultZip"
                        value={form.defaultZip || ''}
                        onChange={handleChange}
                        placeholder="Zip"
                        maxLength={5}
                        className="text-center"
                    />
                </div>
            </div>
        </Card>
      </div>

      {/* Group 2: Preferences */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider ml-1">Preferences</h3>
        <Card>
            <SettingRow title="Navigation App" icon={Map} color="text-orange-500">
            <Select
                name="preferredNavApp"
                value={form.preferredNavApp || 'in-app'}
                onChange={handleChange}
            >
                <option value="in-app">In-App Map</option>
                <option value="google">Google Maps</option>
                <option value="apple">Apple Maps</option>
                <option value="waze">Waze</option>
            </Select>
            </SettingRow>
            
            <SettingRow title="Theme" icon={Palette} color="text-purple-500">
            <Button 
                variant="surface" 
                onClick={toggleTheme} 
                className="w-full justify-between group"
            >
                <span className="flex items-center gap-2">
                    {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </span>
                <ChevronRight className="text-muted-foreground group-hover:translate-x-1 transition-transform" size={16} />
            </Button>
            </SettingRow>
        </Card>
      </div>

      {/* Save Action */}
      <Button onClick={handleSave} size="lg" className="w-full shadow-xl shadow-brand/20">
        Save Changes
      </Button>

      {/* Group 3: Data */}
      <div className="space-y-3 pt-4">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider ml-1">Data Management</h3>
        <Card>
            <SettingRow title="Export Data" icon={DownloadCloud} color="text-teal-500">
                <Button variant="ghost" onClick={handleExport} size="sm">Export JSON</Button>
            </SettingRow>
            <SettingRow title="Import Data" icon={UploadCloud} color="text-teal-500">
                <Button variant="ghost" onClick={handleImport} size="sm">Import JSON</Button>
            </SettingRow>
            <div className="p-4 bg-surface-muted/20 text-xs text-center text-muted-foreground">
                Last saved: {settings.lastSaved ? new Date(settings.lastSaved).toLocaleString() : 'Never'}
            </div>
        </Card>
      </div>

      {/* Danger Zone */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider ml-1">Danger Zone</h3>
        <Card className="border-red-500/20 dark:border-red-500/10">
            <SettingRow title="Clear Packages" icon={Trash2} color="text-red-500">
                <Button variant="danger" size="sm" onClick={handleClearPackages}>Clear Today</Button>
            </SettingRow>
            <SettingRow title="Nuke Route" icon={AlertTriangle} color="text-red-500">
                <Button variant="danger" size="sm" onClick={handleClearRoute}>Delete Everything</Button>
            </SettingRow>
        </Card>
      </div>

    </div>
  );
};

export default Settings;