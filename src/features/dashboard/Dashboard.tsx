// src/features/dashboard/Dashboard.tsx

import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  return (
    <div className="w-full max-w-md grid gap-6">
      <h2 className="text-xl font-semibold mb-4 text-center text-foreground">
        Dashboard
      </h2>

      <nav className="flex flex-col space-y-4" aria-label="Main navigation">
        {/* We use "bg-primary" for the main action */}
        <Link
          to="/delivery"
          className="bg-primary text-primary-foreground text-lg font-bold py-4 rounded-lg hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 text-center transition-colors"
          aria-label="Start Delivery"
        >
          Start Delivery
        </Link>

        {/* We use "bg-secondary" for all other actions */}
        <Link
          to="/packages"
          className="bg-secondary text-secondary-foreground font-semibold py-3 rounded-lg hover:bg-secondary/80 focus:ring-2 focus:ring-primary focus:ring-offset-2 text-center transition-colors"
          aria-label="Add Packages"
        >
          Add Packages
        </Link>

        <Link
          to="/route-setup"
          className="bg-secondary text-secondary-foreground font-semibold py-3 rounded-lg hover:bg-secondary/80 focus:ring-2 focus:ring-primary focus:ring-offset-2 text-center transition-colors"
          aria-label="Setup Route"
        >
          Setup Route
        </Link>

        <Link
          to="/settings"
          className="bg-secondary text-secondary-foreground font-semibold py-3 rounded-lg hover:bg-secondary/80 focus:ring-2 focus:ring-primary focus:ring-offset-2 text-center transition-colors"
          aria-label="Settings"
        >
          Settings
        </Link>
      </nav>
    </div>
  );
};

export default Dashboard;