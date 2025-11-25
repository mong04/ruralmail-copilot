import React, { useEffect, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { saveSettingsToDB, toggleRichTheming } from './settingsSlice';
import { clearRoute, loadRoute, saveRoute, type RouteData } from '../../db';
import { clearPackagesFromDB } from '../package-management/store/packageSlice';
import { toast } from 'sonner';
import { type SettingsData } from '../../db';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import {
  Save,
  Map,
  Palette,
  FileText,
  Zap,
  AlertTriangle,
  DownloadCloud,
  UploadCloud,
  Trash2
} from 'lucide-react';
import Portal from '../../components/ui/Portal';
import applyTheme from '../../theme';
import { CyberpunkText } from '../../components/theme/cyberpunk/CyberpunkText';
// Ensure this file exists at this path. If it's in the same folder, remove '/components'
import { SettingRow } from '../../components/ui/SettingRow';

const Settings: React.FC = () => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);
  const theme = useAppSelector((state) => state.settings.theme);
  const richThemingEnabled = useAppSelector((state) => state.settings.richThemingEnabled ?? true);
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
    dispatch(saveSettingsToDB({ ...form, richThemingEnabled }));
    toast.success('System Configuration Updated');
  }, [dispatch, form, richThemingEnabled]);

  // --- Data Management Handlers ---

  const handleExport = async () => {
    try {
      // FIX: loadRoute is now used
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
        // FIX: RouteData is now used for type assertion
        const routeData = JSON.parse(text) as RouteData;
        
        // Basic validation check
        if (Array.isArray(routeData) && (routeData.length === 0 || 'address_line1' in routeData[0])) {
          // FIX: saveRoute is now used
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
    if (confirm('WARNING: PERMANENTLY DELETE ROUTE DATABASE?')) {
      clearRoute();
      toast.success('Route database purged.');
    }
  };

  const handleClearPackages = () => {
    if (confirm("Delete today's package manifest?")) {
      dispatch(clearPackagesFromDB());
      toast.success('Manifest cleared.');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none z-10 bg-background/95 backdrop-blur border-b border-border px-6 pt-6 pb-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {theme === 'cyberpunk' && richThemingEnabled ? (
             <CyberpunkText as="h2" text="SYSTEM CONFIG" className="text-3xl font-bold tracking-tight text-foreground" />
          ) : (
             <h2 className="text-3xl font-bold tracking-tight text-foreground">Settings</h2>
          )}
          
          <div className="text-xs font-mono text-muted-foreground bg-surface-muted px-2 py-1 rounded-md border border-border">
            {theme === 'cyberpunk' ? 'V.2.0.77' : 'v1.0.0'}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-6 py-6 space-y-8 max-w-2xl mx-auto w-full pb-40">
        
          {/* Group 1: Interface */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Interface</h3>
            <Card>
                <SettingRow title="Theme" icon={Palette} color="text-brand">
                  <Select
                      name="theme"
                      value={form.theme || 'light'}
                      onChange={(e) => {
                          // FIX: Proper typing instead of 'any'
                          const newTheme = e.target.value as 'light' | 'dark' | 'cyberpunk';
                          setForm((prev) => ({ ...prev, theme: newTheme }));
                          applyTheme(newTheme);
                          dispatch(saveSettingsToDB({ ...form, theme: newTheme, richThemingEnabled }));
                      }}
                      className={theme === 'cyberpunk' ? "bg-black border-brand text-brand font-mono uppercase" : ""}
                  >
                      <option value="light">☀️ Light</option>
                      <option value="dark">🌙 Dark</option>
                      <option value="cyberpunk">🤖 Cyberpunk</option>
                  </Select>
                </SettingRow>
                <SettingRow title="FX Engine" icon={Zap} color="text-brand">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={richThemingEnabled}
                      onChange={(e) => dispatch(toggleRichTheming(e.target.checked))}
                      className="accent-brand w-5 h-5"
                    />
                    <span className="text-sm font-mono">{richThemingEnabled ? 'ONLINE' : 'OFFLINE'}</span>
                  </label>
                </SettingRow>
            </Card>
          </div>

          {/* Group 2: Route Config */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Route</h3>
            <Card>
                <SettingRow title="Callsign" icon={FileText} color="text-brand">
                  <Input name="defaultRouteName" value={form.defaultRouteName || ''} onChange={handleChange} placeholder="e.g. Route 7" className="text-right" />
                </SettingRow>
                <SettingRow title="Base City" icon={Map} color="text-success">
                  <Input name="defaultCity" value={form.defaultCity || ''} onChange={handleChange} placeholder="City" className="text-right" />
                </SettingRow>
            </Card>
          </div>

          {/* Group 3: Data IO */}
          <div className="space-y-3 pt-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Data IO</h3>
            <Card>
                {/* FIX: Using DownloadCloud and handleExport */}
                <SettingRow title="Export Route" icon={DownloadCloud} color="text-brand">
                    <Button variant="ghost" onClick={handleExport} size="sm">Download JSON</Button>
                </SettingRow>
                {/* FIX: Using UploadCloud and handleImport */}
                <SettingRow title="Import Route" icon={UploadCloud} color="text-brand">
                    <Button variant="ghost" onClick={handleImport} size="sm">Upload JSON</Button>
                </SettingRow>
                <div className="p-4 bg-surface-muted/20 text-xs text-center text-muted-foreground font-mono">
                    LAST SYNC: {settings.lastSaved ? new Date(settings.lastSaved).toLocaleString() : 'UNKNOWN'}
                </div>
            </Card>
          </div>
          
           {/* Group 4: Danger Zone */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-danger uppercase tracking-[0.2em] ml-1">Danger Zone</h3>
            <Card className={theme === 'cyberpunk' ? '' : 'border-danger/20'}>
                {/* FIX: Using Trash2 and handleClearPackages */}
                <SettingRow title="Clear Manifest" icon={Trash2} color="text-danger">
                    <Button variant="danger" size="sm" onClick={handleClearPackages}>Clear Packages</Button>
                </SettingRow>
                <SettingRow title="Purge Route" icon={AlertTriangle} color="text-danger">
                    <Button variant="danger" size="sm" onClick={handleClearRoute}>Delete Route</Button>
                </SettingRow>
            </Card> 
          </div>

        </div>
      </div>

      <Portal>
        <div className="pointer-events-none fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute left-0 right-0 h-40 bg-linear-to-t from-background via-background/80 to-transparent z-0" style={{ bottom: 'calc(var(--bottom-nav-height) + 8px)' }} />
          <div className="relative z-10 fab-offset px-6 w-full max-w-md mx-auto">
            <div className="flex items-end justify-end gap-4 pointer-events-auto">
              <Button onClick={handleSave} size="lg" className="w-full btn-glow">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </Portal>
    </div>
  );
};

export default Settings;