// src/App.tsx
import React, { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '../src/AppRouter';
import { useTheme } from '../src/hooks/useTheme';
import ThemeController from './components/theme/ThemeController';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  // Keeps light/dark/cyberpunk class on <html> (your existing hook)
  useTheme();

  useEffect(() => {
    const stored = localStorage.getItem('isLoggedIn');
    if (stored === 'true') setIsLoggedIn(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('isLoggedIn', String(isLoggedIn));
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="w-full max-w-md space-y-6 px-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">RuralMail Co‑Pilot</h1>
            <p className="text-sm text-muted-foreground">
              Your intelligent rural delivery companion
            </p>
          </div>
          <div className="bg-surface rounded-xl shadow-lg border border-border p-6">
            <h2 className="text-xl font-semibold mb-4 text-center">Welcome back</h2>
            <button
              onClick={() => setIsLoggedIn(true)}
              className="w-full h-11 rounded-xl bg-brand text-brand-foreground font-semibold hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 transition"
              aria-label="Log In"
            >
              Log in (Demo)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ThemeController now wraps the entire app
  return (
    <ThemeController>
      <RouterProvider router={router} />
    </ThemeController>
  );
};

export default App;