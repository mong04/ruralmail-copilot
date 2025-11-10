// src/App.tsx
import { useState, useEffect } from 'react';
import RouteSetup from './components/route-setup/RouteSetup';
import Settings from './components/Settings';
import Packages from './components/packages/Packages';
// import { type Package } from './db';

type AppView = 'dashboard' | 'route-setup' | 'packages' | 'delivery' | 'settings';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [view, setView] = useState<AppView>('dashboard');

  const [isScannerActive, setIsScannerActive] = useState(false);
  const [showPackageForm, setShowPackageForm] = useState(false);

  const [formContext, setFormContext] = useState<'scan' | 'manual' | 'edit'>(
    'manual',
  );

  // ... (all useEffects for navigation remain the same) ...
  useEffect(() => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    if (!hash) return;
    switch (hash) {
      case 'route-setup':
        setView('route-setup');
        break;
      case 'packages':
        setView('packages');
        break;
      case 'delivery':
        setView('delivery');
        break;
      case 'settings':
        setView('settings');
        break;
      case 'scanner':
        setIsScannerActive(true);
        break;
      case 'form':
        setShowPackageForm(true);
        setFormContext('manual');
        break;
      default:
        window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handlePopState = (_event: PopStateEvent) => {
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
  }, [isScannerActive, showPackageForm, view]);

  useEffect(() => {
    const currentHash = window.location.hash;
    let newHash = '';
    if (isScannerActive) {
      newHash = '#scanner';
    } else if (showPackageForm) {
      newHash = '#form';
    } else if (view !== 'dashboard') {
      newHash = `#${view}`;
    }

    if (currentHash !== newHash) {
      if (newHash) {
        window.history.pushState(
          { view, isScannerActive, showPackageForm },
          '',
          newHash,
        );
      } else if (currentHash) {
        window.history.go(-1);
      }
    }
  }, [view, isScannerActive, showPackageForm]);

  // ... (all handle... functions remain the same) ...
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleScanSuccess = (_tracking: string) => {
    setIsScannerActive(false);
    setShowPackageForm(true);
    setFormContext('scan');
  };
  const handleOpenScanner = () => {
    setIsScannerActive(true);
    setShowPackageForm(false);
  };
  const handleCloseScanner = () => {
    setIsScannerActive(false);
  };
  const handleOpenManualForm = () => {
    setFormContext('manual');
    setShowPackageForm(true);
    setIsScannerActive(false);
  };
  const handleOpenEditForm = () => {
    setFormContext('edit');
    setShowPackageForm(true);
    setIsScannerActive(false);
  };
  const handleCloseForm = () => {
    setShowPackageForm(false);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-green-100 to-blue-100 flex flex-col items-center justify-start p-4 pt-8">
      <header className="w-full text-center mb-8">
        <h1 className="text-3xl font-bold text-green-800">RuralMail Co-Pilot</h1>
        <p className="text-sm text-gray-600">Your serene delivery assistant</p>
      </header>

      {/* **THE FIX: A new <main> container**
        This container now holds the *single source of truth* for layout:
        - 'w-full' (Mobile-first)
        - 'lg:max-w-5xl' (A consistent, wide-but-not-too-wide limit for desktop)
        - All the "white box" styling is here now.
      */}
      <main className="w-full lg:max-w-5xl bg-white rounded-xl shadow-lg p-6">
        {!isLoggedIn ? (
          // **FIX:** Removed all layout classes (max-w-md, bg-white, etc)
          <div>
            <h2 className="text-xl font-semibold mb-4">Welcome Back</h2>
            <button
              onClick={() => setIsLoggedIn(true)}
              className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition"
            >
              Log In (Placeholder)
            </button>
          </div>
        ) : view === 'dashboard' ? (
          // **FIX:** Removed all layout classes (max-w-md, bg-white, etc)
          <div>
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
            isScannerActive={isScannerActive}
            showPackageForm={showPackageForm}
            formContext={formContext}
            onScanSuccess={handleScanSuccess}
            onOpenScanner={handleOpenScanner}
            onOpenManualForm={handleOpenManualForm}
            onCloseForm={handleCloseForm}
            onCloseScanner={handleCloseScanner}
            onOpenEditForm={handleOpenEditForm}
          />
        ) : (
          <p>Other views coming soon</p>
        )}
      </main>
      {/* End of the new <main> container */}
    </div>
  );
}

export default App;