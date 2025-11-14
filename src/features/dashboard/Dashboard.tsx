import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
// import { Button } from '../../components/ui/Button';

const Dashboard: React.FC = () => {
  return (
    <div className="grid gap-6">
      <h2 className="text-xl font-semibold text-center">Dashboard</h2>

      <Card className="p-4 space-y-3">
        <Link
          to="/delivery"
          className="inline-flex items-center justify-center h-12 px-5 rounded-xl bg-brand text-brand-foreground font-semibold hover:bg-brand/90 focus:ring-2 focus:ring-brand focus:ring-offset-2 transition w-full"
          aria-label="Start Delivery"
        >
          Start Delivery
        </Link>

        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/packages"
            className="h-11 rounded-xl bg-surface text-foreground border border-border grid place-items-center hover:bg-surface-muted transition"
            aria-label="Add Packages"
          >
            Packages
          </Link>

          <Link
            to="/route-setup"
            className="h-11 rounded-xl bg-surface text-foreground border border-border grid place-items-center hover:bg-surface-muted transition"
            aria-label="Setup Route"
          >
            Route Setup
          </Link>

          <Link
            to="/settings"
            className="col-span-2 h-11 rounded-xl bg-surface text-foreground border border-border grid place-items-center hover:bg-surface-muted transition"
            aria-label="Settings"
          >
            Settings
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
