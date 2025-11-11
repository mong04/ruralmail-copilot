import { Link } from 'react-router-dom';

/**
 * Dashboard component serving as the main navigation hub.
 * Provides accessible, styled links to key app sections.
 * Future-proofed for theming and responsive design.
 */
const Dashboard: React.FC = () => {
  const navItems = [
    { to: '/route-setup', label: 'Setup Route', color: 'blue', aria: 'Setup Route' },
    { to: '/packages', label: 'Add Packages', color: 'green', aria: 'Add Packages' },
    { to: '/delivery', label: 'Start Delivery', color: 'purple', aria: 'Start Delivery' },
    { to: '/settings', label: 'Settings', color: 'gray', aria: 'Settings' },
  ];

  return (
    <div className="w-full max-w-md grid gap-6 bg-primary text-primary-foreground p-8">
      <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
      <nav className="flex flex-col space-y-4" aria-label="Main navigation">
        {navItems.map(({ to, label, color, aria }) => (
          <Link
            key={to}
            to={to}
            className={`bg-${color}-500 text-white py-2 rounded-lg hover:bg-${color}-600 
              focus:ring-2 focus:ring-${color}-500 focus:ring-offset-2 text-center transition-colors`}
            aria-label={aria}
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Dashboard;
