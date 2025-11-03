import { useState } from 'react';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <div className="min-h-screen bg-linear-to-br from-green-100 to-blue-100 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <header className="w-full max-w-md text-center mb-8">
        <h1 className="text-3xl font-bold text-green-800">RuralMail Co-Pilot</h1>
        <p className="text-sm text-gray-600">Your serene delivery assistant</p>
      </header>

      {/* Conditional Content: Login Wireframe */}
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
      ) : (
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
          <p>Route Setup | Package Entry | Delivery Mode</p>
          {/* Placeholders for navigation */}
          <div className="flex justify-around mt-4">
            <button className="bg-blue-500 text-white px-4 py-2 rounded-lg">Setup Route</button>
            <button className="bg-green-500 text-white px-4 py-2 rounded-lg">Add Packages</button>
            <button className="bg-purple-500 text-white px-4 py-2 rounded-lg">Start Delivery</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;