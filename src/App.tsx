import React, { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '../src/AppRouter'; // Using alias
import { useTheme } from '../src/hooks/useTheme'; // Using alias// Using alias
import ThemeController from './components/theme/ThemeControler';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  
  // Basic CSS Class switching (light/dark/cyberpunk class on html tag)
  useTheme(); 

  useEffect(() => {
    const storedLogin = localStorage.getItem('isLoggedIn');
    if (storedLogin === 'true') setIsLoggedIn(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('isLoggedIn', isLoggedIn.toString());
  }, [isLoggedIn]);

  if (!isLoggedIn) {
     <div className="min-h-screen grid place-items-center">
        <div className="w-full max-w-md space-y-6 px-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">RuralMail Co‑Pilot</h1>
            <p className="text-sm text-muted">Your intelligent rural delivery companion</p>
          </div>
          <div className="bg-surface rounded-xl shadow-lg border border-border p-6">
            <h2 className="text-xl font-semibold mb-4 text-center">Welcome back</h2>
            <button
              onClick={() => setIsLoggedIn(true)}
              className="w-full h-11 rounded-xl bg-brand text-brand-foreground font-semibold hover:bg-brand/90 focus:ring-2 focus:ring-brand focus:ring-offset-2 transition"
              aria-label="Log In"
            >
              Log in (Demo)
            </button>
          </div>
        </div>
      </div>
     return ('');
  }

  return (
    <>
      {/* The ThemeController sits alongside the Router. 
          It watches for events emitted by components inside the Router. */}
      <ThemeController />
      <RouterProvider router={router} />
    </>
  );
};

export default App;