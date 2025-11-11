import React, { useState } from 'react';
import AddressForm from './components/AddressForm';
import AddressList from './components/AddressList';

/**
 * RouteSetup component orchestrates adding and reviewing stops.
 * Keeps form logic modular and provides a clean, accessible workflow.
 */
const RouteSetup: React.FC = () => {
  const [addresses, setAddresses] = useState<string[]>([]);

  const handleAddAddress = (newAddress: string) => {
    if (!newAddress.trim()) return;
    setAddresses((prev) => [...prev, newAddress.trim()]);
  };

  const handleRemoveAddress = (index: number) => {
    setAddresses((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Setup Route</h2>

      <AddressForm onAdd={handleAddAddress} />

      <AddressList
        addresses={addresses}
        onRemove={handleRemoveAddress}
      />

      {addresses.length > 0 && (
        <div className="mt-6 flex justify-end">
          <button
            className="bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 
              focus:ring-2 focus:ring-green-500 transition"
            aria-label="Confirm Route"
            onClick={() => alert('Route confirmed!')}
          >
            Confirm Route
          </button>
        </div>
      )}
    </div>
  );
};

export default RouteSetup;
