import React from 'react';
import { Mail, Box, Home } from 'lucide-react';
import { type Package } from '../../../../db';
import { useAppSelector } from '../../../../store';
import { cn } from '../../../../lib/utils';

interface SizeSelectProps {
  pkg: Partial<Package>;
  setPkg: React.Dispatch<React.SetStateAction<Partial<Package>>>;
}

const options = [
  { value: 'small', label: 'Small', icon: Mail, color: "brand" },
  { value: 'medium', label: 'Medium', icon: Box, color: "warning" },
  { value: 'large', label: 'Large', icon: Home, color: "danger" },
] as const;

const SizeSelect: React.FC<SizeSelectProps> = ({ pkg, setPkg }) => {
  const theme = useAppSelector((state) => state.settings.theme);
  const isCyberpunk = theme === 'cyberpunk';
  const selected = pkg.size || 'medium';

  return (
    <div className="space-y-3">
      <label className={cn(
        "text-xs font-bold uppercase tracking-wider ml-1",
        isCyberpunk ? "text-brand/70" : "text-muted-foreground"
      )}>
        Package Size
      </label>

      <div className={cn(
        "flex",
        isCyberpunk 
          ? "gap-3" 
          : "p-1 bg-surface-muted rounded-xl border border-border"
      )}>
        {options.map((opt) => {
          const isActive = selected === opt.value;
          
          // --- CYBERPUNK STYLING LOGIC ---
          
          // 1. Active State (The "Powered Up" look)
          const activeCyberClass = 
            opt.color === 'brand' 
              // Cyan Background -> Black Text
              ? "bg-brand text-black shadow-[0_0_20px_rgba(0,240,255,0.5)] border-brand" 
              : opt.color === 'warning' 
              // Yellow Background -> Black Text (FIXED: Was illegible white)
              ? "bg-warning text-black shadow-[0_0_20px_rgba(252,238,10,0.5)] border-warning" 
              // Red Background -> White Text
              : "bg-danger text-white shadow-[0_0_20px_rgba(255,0,60,0.5)] border-danger";

          // 2. Inactive State (The "Sleep" look)
          const inactiveCyberClass = 
            opt.color === 'brand' ? "bg-black/40 border-white/10 text-muted-foreground hover:text-brand hover:border-brand/50 hover:bg-brand/10" :
            opt.color === 'warning' ? "bg-black/40 border-white/10 text-muted-foreground hover:text-warning hover:border-warning/50 hover:bg-warning/10" :
            "bg-black/40 border-white/10 text-muted-foreground hover:text-danger hover:border-danger/50 hover:bg-danger/10";

          // --- STANDARD STYLING LOGIC ---
          const activeStdClass = "bg-surface text-foreground shadow-sm ring-1 ring-border";
          const inactiveStdClass = "text-muted-foreground hover:text-foreground hover:bg-background/50";

          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPkg(p => ({ ...p, size: opt.value }))}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-3 text-sm font-bold transition-all duration-300 relative overflow-hidden outline-none",
                // Base Shape
                isCyberpunk ? "rounded-lg border-2" : "rounded-lg flex-row gap-2",
                // Pulse Effect on Active (Cyberpunk only)
                isCyberpunk && isActive && "animate-pulse",
                // Theme Selection
                isCyberpunk 
                  ? (isActive ? activeCyberClass : inactiveCyberClass)
                  : (isActive ? activeStdClass : inactiveStdClass)
              )}
            >
              {/* Cyberpunk Scanline Overlay (Active Only) */}
              {isCyberpunk && isActive && (
                 <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIxIiBmaWxsPSJyZ2JhKDAsMCwwLDAuMSkiLz4KPC9zdmc+')] opacity-30 pointer-events-none" />
              )}

              <opt.icon 
                size={isCyberpunk ? 24 : 18} 
                className={cn(
                  "transition-transform",
                  isActive && isCyberpunk ? "scale-110" : "",
                  // In Standard mode, color the icon when active
                  !isCyberpunk && isActive ? "text-brand" : "currentColor"
                )} 
                strokeWidth={isCyberpunk ? 2 : 2}
              />
              
              <span className={isCyberpunk ? "text-[10px] tracking-widest uppercase" : "text-sm"}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SizeSelect;