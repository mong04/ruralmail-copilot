import { useState } from 'react';
import RouteSetup from './components/RouteSetup';
import Settings from './components/Settings';
import Packages from './components/Packages';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);  // Assume logged in for now
  const [view, setView] = useState<'dashboard' | 'route-setup' | 'packages' | 'delivery' | 'settings'>('dashboard');

  return (
    <div className="min-h-screen bg-linear-to-br from-green-100 to-blue-100 flex flex-col items-center justify-center p-4">
      <header className="w-full max-w-md text-center mb-8">
        <h1 className="text-3xl font-bold text-green-800">RuralMail Co-Pilot</h1>
        <p className="text-sm text-gray-600">Your serene delivery assistant</p>
      </header>

      {!isLoggedIn ? (
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome Back</h2>
          <button
            onClick={() => setIsLoggedIn(true)}
            className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition"
          >
            Log In (Placeholder)
          </button>
        </div>
      ) : view === 'dashboard' ? (
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
          <div className="flex flex-col space-y-4">
            <button
              onClick={() => setView('route-setup')}
              className="bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
            >
              Setup Route
            </button>
            <button 
              className="bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
              onClick={() => setView('packages')}
              >
              Add Packages
            </button>
            <button className="bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600">
              Start Delivery
            </button>
            <button
              onClick={() => setView('settings')}
              className="bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
            >
              Settings
            </button>  {/* New button */}
          </div>
        </div>
      ) : view === 'route-setup' ? (
        <RouteSetup onBack={() => setView('dashboard')} />
      ) : view === 'settings' ? (
        <Settings onBack={() => setView('dashboard')} />
      ) : view === 'packages' ? (
        <Packages onBack={() => setView('dashboard')} />
      ) : (
        <p>Other views coming soon</p>
      )}
    </div>
  );
}

export default App;