import { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './components/routes/Routes';

/**
 * Main App component handling authentication and routing.
 * Uses placeholder login; extend for real auth in future iterations.
 */
const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    // Persist login state (e.g., from localStorage for offline PWA)
    const storedLogin = localStorage.getItem('isLoggedIn');
    if (storedLogin === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('isLoggedIn', isLoggedIn.toString());
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-linear-to-br from-green-100 to-blue-100 flex flex-col items-center justify-center p-4">
        <header className="w-full max-w-md text-center mb-8">
          <h1 className="text-3xl font-bold text-green-800">RuralMail Co-Pilot</h1>
          <p className="text-sm text-gray-600">Your serene delivery assistant</p>
        </header>
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome Back</h2>
          <button
            onClick={() => setIsLoggedIn(true)}
            className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition focus:ring-2 focus:ring-green-500"
            aria-label="Log In"
          >
            Log In (Placeholder)
          </button>
        </div>
      </div>
    );
  }

  return <RouterProvider router={router} />;
};

export default App;