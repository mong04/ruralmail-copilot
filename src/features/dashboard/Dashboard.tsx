import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { List, Mails, Settings } from 'lucide-react';

const Dashboard: React.FC = () => {
  return (
    <div className="grid gap-6">
      <h2 className="text-2xl font-bold text-center tracking-tight text-foreground">Dashboard</h2>
      <p className="text-center text-muted-foreground -mt-4">
        Welcome! Start your delivery or manage your route.
      </p>

      <Card className="p-4 space-y-3">
        <Link
          to="/delivery"
          className="inline-flex items-center justify-center h-16 px-5 rounded-xl bg-brand text-brand-foreground text-lg font-semibold hover:bg-brand/90 focus:ring-2 focus:ring-brand focus:ring-offset-2 transition w-full"
          aria-label="Start Delivery"
        >
          Start Delivery
        </Link>
      </Card>

      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-3 text-center">Manage Your Day</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/packages"
            className="h-24 rounded-xl bg-surface text-foreground border border-border grid place-items-center hover:bg-surface-muted transition"
            aria-label="Add Packages"
          >
            <Mails size={24} className="mb-1 text-brand" />
            <span className="font-semibold">Mailbag</span>
          </Link>

          <Link
            to="/route-setup"
            className="h-24 rounded-xl bg-surface text-foreground border border-border grid place-items-center hover:bg-surface-muted transition"
            aria-label="Setup Route"
          >
            <List size={24} className="mb-1 text-brand" />
            <span className="font-semibold">Route Setup</span>
          </Link>

          <Link
            to="/settings"
            className="col-span-2 h-16 rounded-xl bg-surface text-foreground border border-border flex items-center justify-center gap-3 hover:bg-surface-muted transition"
            aria-label="Settings"
          >
            <Settings size={20} className="text-brand" />
            <span className="font-semibold">Settings</span>
          </Link>
        </div>
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="text-lg font-semibold">Quick Actions</h3>
        <Button variant="surface" className="w-full justify-start">
          View Today's Manifest (coming soon)
        </Button>
        <Button variant="surface" className="w-full justify-start">
          End of Day Report (coming soon)
        </Button>
      </Card>
    </div>
  );
};

export default Dashboard;