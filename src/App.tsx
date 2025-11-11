// src/App.tsx
import { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './AppRouter';
import { Toaster } from 'sonner';

/**
 * Main App component handling authentication and routing.
 * Uses a simple localStorage-based login; extend with real auth (e.g., Firebase) in future.
 */
const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  // Load persisted login state
  useEffect(() => {
    const storedLogin = localStorage.getItem('isLoggedIn');
    if (storedLogin === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  // Persist login state changes
  useEffect(() => {
    localStorage.setItem('isLoggedIn', isLoggedIn.toString());
  }, [isLoggedIn]);

  // Simple auth gate with improved UX
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex flex-col items-center justify-center p-4">
        <header role="banner" className="w-full max-w-md text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-800">RuralMail Co-Pilot</h1>
          <p className="text-md text-secondary-600 mt-2">Your intelligent rural delivery companion</p>
        </header>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-6 text-center">Welcome Back</h2>
          <button
            onClick={() => setIsLoggedIn(true)}
            className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 font-medium"
            aria-label="Log In"
          >
            Log In (Demo)
          </button>
        </div>
      </div>
    );
  }

  // Authenticated view with Toaster for notifications
  return (
    <>
      <Toaster position="top-center" richColors />
      <RouterProvider router={router} />
    </>
  );
};

export default App;