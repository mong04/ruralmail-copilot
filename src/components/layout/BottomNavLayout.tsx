// src/components/layout/BottomNavLayout.tsx
import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Map, List, Mails, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';
import ThemeController from '../theme/ThemeController';

const BottomNavLayout: React.FC = () => {
  return (
    <ThemeController>
      {/* Root — uses semantic bg-background (becomes void in cyberpunk) */}
      <div className="fixed inset-0 flex flex-col bg-background">

        {/* Header — glass using semantic surface */}
        <header
          className="relative z-50 w-full border-b border-border/40 backdrop-blur-xl"
          style={{ height: 'var(--header-height)' }}
        >
          <div className="max-w-md mx-auto px-4 flex items-center justify-center h-full">
            <NavLink 
              to="/" 
              className="font-bold text-2xl tracking-tighter text-foreground drop-shadow-lg"
            >
              RuralMail Co‑Pilot
            </NavLink>
          </div>
        </header>

        <main className="flex-1 overflow-auto pb-20">
          <Outlet />
        </main>

        {/* Bottom nav — glass using semantic surface */}
        <nav
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border/40 backdrop-blur-xl"
          style={{ height: 'var(--bottom-nav-height)' }}
        >
          <div className="max-w-md mx-auto px-4 flex justify-around items-center h-full">
            <NavItem to="/" icon={Map} label="Map" />
            <NavItem to="/route-setup" icon={List} label="Route" />
            <NavItem to="/packages" icon={Mails} label="Mailbag" />
            <NavItem to="/settings" icon={Settings} label="Settings" />
          </div>
        </nav>
      </div>
    </ThemeController>
  );
};

const NavItem: React.FC<{ to: string; icon: React.ElementType; label: string }> = ({ 
  to, icon: Icon, label 
}) => (
  <NavLink
    to={to}
    end
    className={({ isActive }) =>
      cn(
        'flex flex-col items-center justify-center w-20 h-16 rounded-2xl transition-all duration-300',
        isActive
          ? 'text-brand scale-125 font-bold drop-shadow-glow'
          : 'text-muted-foreground hover:text-foreground hover:scale-110'
      )
    }
  >
    <Icon className="w-7 h-7" strokeWidth={3} />
    <span className="text-xs mt-1 font-medium">{label}</span>
  </NavLink>
);

export default BottomNavLayout;