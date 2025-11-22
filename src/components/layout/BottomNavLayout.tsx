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
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header Bar: Full-width bar */}
      <header
        className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border"
        style={{ height: 'var(--header-height)' }}
      >
        <div className="max-w-md mx-auto px-4 flex items-center justify-center h-full">
          <NavLink to="/" className="font-bold text-lg tracking-tight text-foreground">
            RuralMail Co‑Pilot
          </NavLink>
        </div>
      </header>

      {/* Main Content Area: A flexible container that allows child routes to control their own layout and scrolling. */}
      <main className="flex-1 min-h-0">
        <Outlet />
      </main> 

      {/* Persistent Bottom Navigation: fixed to viewport bottom so it doesn't depend on parent scroll context */}
      <nav
        className="fixed left-0 right-0 bottom-0 z-40 w-full bg-surface/95 backdrop-blur border-t border-border"
        style={{ height: 'var(--bottom-nav-height)' }}
      >
        <div className="max-w-md mx-auto p-3 flex justify-around h-full items-center">
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