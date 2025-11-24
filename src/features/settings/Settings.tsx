import React, { useEffect, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { saveSettingsToDB, toggleRichTheming } from './settingsSlice';
import { clearRoute, loadRoute, saveRoute, type RouteData } from '../../db';
import { clearPackagesFromDB } from '../package-management/store/packageSlice';
import { toast } from 'sonner';
import { type SettingsData } from '../../db';

// --- UI Components ---
import { Card } from '../../components/ui/Card'; 
import { Button } from '../../components/ui/Button'; 
import { Input } from '../../components/ui/Input'; 
import { Select } from '../../components/ui/Select'; 
import Portal from '../../components/ui/Portal';

// --- Cyberpunk Theme Components ---
import { TechPanel } from '../../components/theme/cyberpunk/TechPanel';
import { CyberpunkText } from '../../components/theme/cyberpunk/CyberpunkText'

// --- Icons ---
import {
  Save,
  UploadCloud,
  DownloadCloud,
  Trash2,
  Map,
  Palette,
  FileText,
  AlertTriangle,
  Zap,
} from 'lucide-react';

import applyTheme from '../../theme';


// ------------------------------------------------------------------
// Helper: Adaptive Card
// Switches between standard Card and TechPanel based on theme state
// ------------------------------------------------------------------
const AdaptiveCard: React.FC<{ 
  children: React.ReactNode; 
  className?: string; 
  variant?: 'default' | 'alert' | 'success';
}> = ({ children, className, variant }) => {
  const theme = useAppSelector(state => state.settings.theme);
  
  // If Cyberpunk theme is active, use the holographic TechPanel
  if (theme === 'cyberpunk') {
    return <TechPanel className={className} variant={variant}>{children}</TechPanel>;
  }
  
  // Otherwise, use the standard clean UI Card
  // We apply a red border manually if it's the alert variant in standard mode
  const alertClass = variant === 'alert' ? 'border-danger/20' : '';
  
  return (
    <Card className={`${className} ${alertClass}`}>
      {children}
    </Card>
  );
};

// ------------------------------------------------------------------
// Helper: Setting Row
// Standardizes the layout of label + input pairs
// ------------------------------------------------------------------
const SettingRow: React.FC<React.PropsWithChildren<{ 
  title: string; 
  icon: React.ElementType;
  color?: string; 
}>> = ({
  title,
  icon: Icon,
  color = 'text-brand',
  children,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 border-b border-border/40 last:border-0 hover:bg-surface-muted/30 transition-colors group">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg bg-surface-muted/50 ${color} group-hover:shadow-[0_0_15px_currentColor] transition-shadow duration-300`}>
         <Icon className="w-5 h-5" />
      </div>
      <span className="font-semibold text-sm">{title}</span>
    </div>
    <div className="w-full sm:w-1/2 flex justify-end">
        {children}
    </div>
  </div>
);

// ------------------------------------------------------------------
// Main Component
// ------------------------------------------------------------------
const Settings: React.FC = () => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);
  const theme = useAppSelector((state) => state.settings.theme);
  const richThemingEnabled = useAppSelector((state) => state.settings.richThemingEnabled ?? true);

  const [form, setForm] = useState<SettingsData>(settings);

  // Sync local form with Redux state on load
  useEffect(() => {
    setForm(settings);
  }, [settings]);

  // Handle Input Changes
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    },
    []
  );

  // Handle Save
  const handleSave = useCallback(() => {
    dispatch(
      saveSettingsToDB({
        ...form,
        richThemingEnabled,
      })
    );
    toast.success('System Configuration Updated');
  }, [dispatch, form, richThemingEnabled]);

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
      
      {/* Header - Adaptive Title */}
      <div className="flex-none z-10 bg-background/95 backdrop-blur border-b border-border px-6 pt-6 pb-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {theme === 'cyberpunk' && richThemingEnabled ? (
            <CyberpunkText 
              as="h2" 
              text="SYSTEM CONFIG" 
              className="text-3xl font-bold tracking-tight text-foreground" 
            />
          ) : (
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Settings</h2>
          )}
          
          <div className="text-xs font-mono text-muted-foreground bg-surface-muted px-2 py-1 rounded-md border border-border">
            {theme === 'cyberpunk' ? 'V.2.0.77' : 'v1.0.0'}
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-6 py-6 space-y-8 max-w-2xl mx-auto w-full pb-40">
        
        {/* Group 1: Defaults */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Route Defaults</h3>
          <AdaptiveCard>
              <SettingRow title="Callsign" icon={FileText} color="text-brand">
              <Input
                  name="defaultRouteName"
                  value={form.defaultRouteName || ''}
                  onChange={handleChange}
                  placeholder="e.g. Route 7"
                  className="text-right"
              />
              </SettingRow>
              <SettingRow title="Base City" icon={Map} color="text-success">
              <Input
                  name="defaultCity"
                  value={form.defaultCity || ''}
                  onChange={handleChange}
                  placeholder="City"
                  className="text-right"
              />
              </SettingRow>
              <div className="flex border-b border-border/40 last:border-0">
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
          </AdaptiveCard>
        </div>

        {/* Group 2: Preferences */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Interface & Nav</h3>
          <AdaptiveCard>
              <SettingRow title="Nav Link" icon={Map} color="text-warning">
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
              
              <SettingRow title="Visual Theme" icon={Palette} color="text-brand">
              <Select
                  name="theme"
                  value={form.theme || 'light'}
                  onChange={(e) => {
                      const newTheme = e.target.value as 'light' | 'dark' | 'cyberpunk';
                      setForm((prev) => ({ ...prev, theme: newTheme }));
                      applyTheme(newTheme);
                      // We save immediately on theme switch for better UX
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
                  className="accent-brand w-5 h-5 rounded border-border focus:ring-brand"
                />
                <span className="text-sm font-mono">
                  {richThemingEnabled ? 'ONLINE' : 'OFFLINE'}
                </span>
              </label>
            </SettingRow>
          </AdaptiveCard>
        </div>

        {/* Group 3: Data Management */}
        <div className="space-y-3 pt-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Data IO</h3>
          <AdaptiveCard>
              <SettingRow title="Export Route" icon={DownloadCloud} color="text-brand">
                  <Button variant="ghost" onClick={handleExport} size="sm">Download JSON</Button>
              </SettingRow>
              <SettingRow title="Import Route" icon={UploadCloud} color="text-brand">
                  <Button variant="ghost" onClick={handleImport} size="sm">Upload JSON</Button>
              </SettingRow>
              <div className="p-4 bg-surface-muted/20 text-xs text-center text-muted-foreground font-mono">
                  LAST SYNC: {settings.lastSaved ? new Date(settings.lastSaved).toLocaleString() : 'UNKNOWN'}
              </div>
          </AdaptiveCard>
        </div>

        {/* Danger Zone */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-danger uppercase tracking-[0.2em] ml-1">Danger Zone</h3>
          <AdaptiveCard variant="alert">
              <SettingRow title="Clear Manifest" icon={Trash2} color="text-danger">
                  <Button variant="danger" size="sm" onClick={handleClearPackages}>Clear Packages</Button>
              </SettingRow>
              <SettingRow title="Purge Route" icon={AlertTriangle} color="text-danger">
                  <Button variant="danger" size="sm" onClick={handleClearRoute}>Delete Route</Button>
              </SettingRow>
          </AdaptiveCard> 
        </div>

        </div> 
      </div>

      {/* Floating Save Button */}
      <Portal>
        <div className="pointer-events-none fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute left-0 right-0 h-40 bg-linear-to-t from-background via-background/80 to-transparent z-0"
            style={{ bottom: 'calc(var(--bottom-nav-height) + 8px)' }}
          />
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