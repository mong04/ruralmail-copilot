import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Map, List, Mails, Settings } from 'lucide-react';
// import { useTheme } from '../../hooks/useTheme'; // ✅ No longer needed
import { cn } from '../../lib/utils';
// ✅ Import the new action bar
// import { PackagesActionBar } from '../../features/package-management/components/PackagesActionBar';

const BottomNavLayout: React.FC = () => {
  // const { theme, toggleTheme } = useTheme(); // ✅ Removed

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header Bar: Full-width bar */}
      <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border">
        {/* Centered content */}
        {/* ✅ Updated justify-center to center the title now */}
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-center">
          <NavLink to="/" className="font-bold text-lg tracking-tight">
            RuralMail Co‑Pilot
          </NavLink>
          {/* ✅ Removed the theme toggle button */}
        </div>
      </header>

      {/* Main Content Area: Will scroll */}
      <main className="flex-1 overflow-y-auto">
        {/* ✅ Adjusted padding:
          pb-24 (96px) was for the main nav (72px).
          The new action bar is ~80px.
          Total space needed: 72px + 80px = 152px.
          pb-40 (160px) gives us the clearance.
        */}
        <div className="max-w-md mx-auto px-4 py-6 pb-40">
          <Outlet />
        </div>
      </main>

      {/* ✅ NEW: Conditional Action Bar */}
      {/* This renders *above* the main nav */}
      {/* <PackagesActionBar /> */}

      {/* Persistent Bottom Navigation: Full-width bar */}
      <nav className="sticky bottom-0 z-40 w-full bg-surface/95 backdrop-blur border-t border-border">
        {/* Centered content */}
        <div className="max-w-md mx-auto p-3 flex justify-around">
          <NavItem to="/" icon={Map} label="Map" />
          <NavItem to="/route-setup" icon={List} label="Route" />
          <NavItem to="/packages" icon={Mails} label="Mailbag" />
          <NavItem to="/settings" icon={Settings} label="Settings" />
        </div>
      </nav>
    </div>
  );
};

// Helper component for NavLink
interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    end
    className={({ isActive }) =>
      cn(
        'flex flex-col items-center justify-center w-16 h-12 rounded-lg text-muted transition-colors',
        isActive ? 'text-brand' : 'hover:text-foreground'
      )
    }
  >
    <Icon className="w-6 h-6" strokeWidth={2.5} />
    <span className="text-xs font-medium">{label}</span>
  </NavLink>
);

export default BottomNavLayout;