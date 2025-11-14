import { Outlet, Link } from "react-router-dom";
import { DarkModeToggle } from "../../components/ui/DarkModeToggle";

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg tracking-tight">
            RuralMail Co‑Pilot
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/packages" className="text-muted hover:text-foreground">
              Packages
            </Link>
            <Link to="/route-setup" className="text-muted hover:text-foreground">
              Route
            </Link>
            <Link to="/settings" className="text-muted hover:text-foreground">
              Settings
            </Link>
            <DarkModeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-md mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
