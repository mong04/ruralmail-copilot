// src/App.tsx
import { useState, useEffect } from 'react';
import RouteSetup from './components/RouteSetup';
import Settings from './components/Settings';
import Packages from './components/Packages';

type AppView = 'dashboard' | 'route-setup' | 'packages' | 'delivery' | 'settings';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [view, setView] = useState<AppView>('dashboard');

  // **LIFTED STATE:** Modal states now live in App.tsx
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [showPackageForm, setShowPackageForm] = useState(false);
  
  // This state can be passed down but managed by Packages.tsx
  // Or, for true centralization, we'll pass the setter down.
  const [formContext, setFormContext] = useState<'scan' | 'manual'>('manual');

  // **NATIVE NAVIGATION (FIX 1): Listen for the "popstate" (back button/gesture) event**
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handlePopState = (_event: PopStateEvent) => {
      // This is the "master controller" for the back gesture.
      // It closes the top-most modal, in order.
      if (isScannerActive) {
        setIsScannerActive(false);
      } else if (showPackageForm) {
        setShowPackageForm(false);
      } else if (view !== 'dashboard') {
        setView('dashboard');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isScannerActive, showPackageForm, view]); // Re-arm the listener if state changes

  // **NATIVE NAVIGATION (FIX 2): Sync React State TO the browser history**
  useEffect(() => {
    const currentHash = window.location.hash;
    let newHash = '';
    
    // Determine the "correct" hash based on app state
    if (isScannerActive) {
      newHash = '#scanner';
    } else if (showPackageForm) {
      newHash = '#form';
    } else if (view !== 'dashboard') {
      newHash = `#${view}`;
    }

    if (currentHash !== newHash) {
      if (newHash) {
        // We are opening a new "layer"
        window.history.pushState({ view, isScannerActive, showPackageForm }, '', newHash);
      } else if (currentHash) {
        // We are closing the last "layer" and returning to dashboard
        // We use go(-1) to clear the hash from the URL
        window.history.go(-1);
      }
    }
  }, [view, isScannerActive, showPackageForm]);


  // **CENTRALIZED HANDLERS**
  // These now live in App.tsx and will be passed to Packages
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleScanSuccess = (_tracking: string) => {
    setIsScannerActive(false);
    setShowPackageForm(true);
    setFormContext('scan');
    // The actual package state (tracking, address) remains in Packages.tsx
  };

  const handleOpenScanner = () => {
    setIsScannerActive(true);
    setShowPackageForm(false);
  };

  const handleOpenManualForm = () => {
    setFormContext('manual');
    setShowPackageForm(true);
    setIsScannerActive(false);
  };

  const handleCloseForm = () => {
    setShowPackageForm(false);
  };

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
            </button>
          </div>
        </div>
      ) : view === 'route-setup' ? (
        <RouteSetup onBack={() => setView('dashboard')} />
      ) : view === 'settings' ? (
        <Settings onBack={() => setView('dashboard')} />
      ) : view === 'packages' ? (
        <Packages 
          onBack={() => setView('dashboard')}
          
          // Pass down modal states and handlers
          isScannerActive={isScannerActive}
          showPackageForm={showPackageForm}
          formContext={formContext}
          
          onScanSuccess={handleScanSuccess}
          onOpenScanner={handleOpenScanner}
          onOpenManualForm={handleOpenManualForm}
          onCloseForm={handleCloseForm}
        />
      ) : (
        <p>Other views coming soon</p>
      )}
    </div>
  );
}

export default App;