import { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './AppRouter';
import { useTheme } from './hooks/useTheme';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  useTheme(); // Apply theme based on Redux store

  useEffect(() => {
    const storedLogin = localStorage.getItem('isLoggedIn');
    if (storedLogin === 'true') setIsLoggedIn(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('isLoggedIn', isLoggedIn.toString());
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    // ... (Login screen remains unchanged)
    return ('');
  }

  return <RouterProvider router={router} />;
};

export default App;