import { Link } from 'react-router-dom';

/**
 * Dashboard component serving as the main navigation hub.
 * Displays links to key app sections with accessible, styled buttons.
 */
const Dashboard: React.FC = () => {
  return (
    <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
      <div className="flex flex-col space-y-4">
        <Link
          to="/route-setup"
          className="bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-center transition-colors"
          aria-label="Setup Route"
        >
          Setup Route
        </Link>
        <Link
          to="/packages"
          className="bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-center transition-colors"
          aria-label="Add Packages"
        >
          Add Packages
        </Link>
        <Link
          to="/delivery"
          className="bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 text-center transition-colors"
          aria-label="Start Delivery"
        >
          Start Delivery
        </Link>
        <Link
          to="/settings"
          className="bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-center transition-colors"
          aria-label="Settings"
        >
          Settings
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;