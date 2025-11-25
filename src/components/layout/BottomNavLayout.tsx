import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Map, List, Mails, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';
import ThemeController from '../theme/ThemeController';
import { useAppSelector } from '../../store';

const BottomNavLayout: React.FC = () => {
  const theme = useAppSelector((state) => state.settings.theme);
  const richEnabled = useAppSelector((state) => state.settings.richThemingEnabled);
  
  // Distinguish between pure Cyberpunk and Rich Cyberpunk
  const isCyberpunkTheme = theme === 'cyberpunk';
  const isRich = isCyberpunkTheme && richEnabled;

  return (
    <ThemeController>
      <div className={cn(
        "fixed inset-0 flex flex-col transition-colors duration-500",
        // Ensure background is dark for ANY cyberpunk mode
        isCyberpunkTheme ? "bg-[#05000a]" : "bg-background"
      )}>

        <main className="flex-1 overflow-auto pb-20 no-scrollbar">
          <Outlet />
        </main>

        <nav
          className={cn(
             "fixed inset-x-0 bottom-0 z-50 border-t transition-all duration-300",
             isRich 
               ? "bg-black/80 border-brand/30 backdrop-blur-xl shadow-[0_-5px_20px_rgba(0,240,255,0.1)]" 
               : isCyberpunkTheme
                 ? "bg-surface border-border backdrop-blur-xl" // Dark mode style for Regular Cyberpunk
                 : "bg-surface/80 border-border backdrop-blur-xl" // Light mode style
          )}
          style={{ height: 'var(--bottom-nav-height)' }}
        >
          <div className="max-w-md mx-auto px-2 flex justify-around items-center h-full">
            <NavItem to="/" icon={Map} label="Map" isRich={isRich} isCyberpunk={isCyberpunkTheme} />
            <NavItem to="/route-setup" icon={List} label={isRich ? "VECTORS" : "Route"} isRich={isRich} isCyberpunk={isCyberpunkTheme} />
            <NavItem to="/packages" icon={Mails} label={isRich ? "CARGO" : "Mailbag"} isRich={isRich} isCyberpunk={isCyberpunkTheme} />
            <NavItem to="/settings" icon={Settings} label={isRich ? "SYS" : "Settings"} isRich={isRich} isCyberpunk={isCyberpunkTheme} />
          </div>
        </nav>
      </div>
    </ThemeController>
  );
};

const NavItem: React.FC<{ to: string; icon: React.ElementType; label: string; isRich?: boolean; isCyberpunk?: boolean }> = ({ 
  to, icon: Icon, label, isRich, isCyberpunk 
}) => (
  <NavLink
    to={to}
    end
    className={({ isActive }) =>
      cn(
        'flex flex-col items-center justify-center w-20 h-full transition-all duration-300 relative group',
        isActive
          ? (isCyberpunk ? 'text-brand scale-110' : 'text-brand scale-110')
          : 'text-muted-foreground hover:text-foreground'
      )
    }
  >
    {({ isActive }) => (
      <>
        {/* Rich Cyberpunk Active Indicator */}
        {isActive && isRich && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-[>2px] bg-brand shadow-[0_0_10px_#00f0ff]" />
        )}

        <Icon 
          className={cn(
            "mb-1 transition-all duration-300", 
            isActive && isRich && "drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]"
          )} 
          size={isRich ? 22 : 26} 
          strokeWidth={isRich ? 2 : 2.5} 
        />
        
        <span className={cn(
            "text-[10px] font-medium transition-all",
            isRich && "font-mono tracking-widest uppercase",
            isActive && "font-bold"
        )}>
            {label}
        </span>
      </>
    )}
  </NavLink>
);

export default BottomNavLayout;