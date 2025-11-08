// components/RouteSetup.tsx (REFACTORED)
import React, { useState, type ChangeEvent, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { type AppDispatch, type RootState } from '../store';
import {
  addStop,
  updateStop, // NEW
  removeStop, // NEW
  reorderStops, // NEW
  clearRouteMemory,
  loadRouteFromDB,
  saveRouteToDB,
} from '../store/routeSlice';
import Papa from 'papaparse';
import { type Stop } from '../db';
import { toast } from 'sonner';

// Import the new components
import AddressForm from './AddressForm';
import AddressList from './AddressList';

interface CsvRow {
  address_line1?: string;
  address_line2?: string;
  lat?: string;
  lng?: string;
  notes?: string;
}

const RouteSetup: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { route, loading, error } = useSelector(
    (state: RootState) => state.route
  );
  const settings = useSelector((state: RootState) => state.settings);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // NEW: State to manage which stop is being edited
  // null = no form, 'new' = adding, number = editing
  const [editingIndex, setEditingIndex] = useState<number | 'new' | null>(null);

  useEffect(() => {
    dispatch(loadRouteFromDB()); // Load on mount
  }, [dispatch]);

  // --- New Handlers for Child Components ---

  const handleAddStop = (stop: Stop) => {
    dispatch(addStop(stop));
    toast.success('Stop added!');
    // setEditingIndex(null); // Close form
  };

  const handleUpdateStop = (stop: Stop) => {
    if (typeof editingIndex === 'number') {
      dispatch(updateStop({ index: editingIndex, stop }));
      toast.success('Stop updated!');
      setEditingIndex(null); // Close form
    }
  };

  const handleRemoveStop = (index: number) => {
    // Simple confirm
    if (window.confirm('Are you sure you want to remove this stop?')) {
      dispatch(removeStop(index));
      toast.success('Stop removed.');
    }
  };

  const handleReorderStops = (startIndex: number, endIndex: number) => {
    dispatch(reorderStops({ startIndex, endIndex }));
  };

  // --- Database Actions ---

  const handleSave = () => {
    dispatch(saveRouteToDB(route));
    toast.success('Route saved!');
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear the entire route?')) {
      dispatch(clearRouteMemory());
      toast.success('Route cleared.');
    }
  };

  // --- CSV Import (Moved) ---
  const handleCSVUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportStatus('Importing...');
      Papa.parse<CsvRow>(file, {
        header: true,
        complete: (results) => {
          const importedStops: Stop[] = results.data
            .map((row) => ({
              address_line1: row.address_line1?.trim() || '',
              address_line2: row.address_line2?.trim() || '',
              lat: parseFloat(row.lat ?? 'NaN'),
              lng: parseFloat(row.lng ?? 'NaN'),
              notes: row.notes?.trim() || '',
              city: settings.defaultCity,
              state: settings.defaultState,
              zip: settings.defaultZip,
            }))
            .filter(
              (stop) =>
                stop.address_line1 && !isNaN(stop.lat) && !isNaN(stop.lng)
            );

          if (importedStops.length > 0) {
            importedStops.forEach((stop) => dispatch(addStop(stop)));
            setImportStatus(
              `Imported ${importedStops.length} stops successfully!`
            );
          } else {
            setImportStatus('No valid stops found in CSV. Check format.');
          }
        },
        error: (err) => {
          console.error('CSV parse error:', err);
          setImportStatus(`Error importing: ${err.message}`);
        },
      });
    }
  };

  if (loading) return <p className="text-center">Loading route...</p>;
  if (error) return <p className="text-red-500 text-center">{error}</p>;

  return (
    <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Set Up Your Fixed Route</h2>
      <button onClick={onBack} className="mb-4 text-blue-500">
        Back to Dashboard
      </button>

      {/* --- Main Action Button --- */}
      {!editingIndex && (
        <button
          onClick={() => setEditingIndex('new')}
          className="w-full bg-blue-500 text-white py-3 px-4 rounded hover:bg-blue-600 text-lg font-semibold"
        >
          Add New Stop
        </button>
      )}

      {/* --- Conditional Address Form --- */}
      {editingIndex === 'new' && (
        <AddressForm
          defaultLocation={settings}
          onSubmit={handleAddStop}
          onCancel={() => setEditingIndex(null)}
        />
      )}
      {typeof editingIndex === 'number' && (
        <AddressForm
          defaultLocation={settings}
          initialData={route[editingIndex]}
          onSubmit={handleUpdateStop}
          onCancel={() => setEditingIndex(null)}
        />
      )}

      {/* --- Current Route List --- */}
      <div className="mb-6 mt-6">
        <h3 className="text-lg mb-2">Current Route ({route.length} stops)</h3>
        <AddressList
          addresses={route}
          onEdit={setEditingIndex}
          onRemove={handleRemoveStop}
          onReorder={handleReorderStops}
        />
      </div>

      {/* --- CSV Import (De-emphasized) --- */}
      <details className="mb-6 border rounded-lg p-3">
        <summary className="cursor-pointer font-medium text-gray-700">
          Import from CSV
        </summary>
        <div className="mt-4">
          <label className="w-full bg-blue-100 text-blue-800 py-2 px-4 rounded-lg cursor-pointer hover:bg-blue-200 transition text-center block">
            Choose CSV File
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
            />
          </label>
          <p className="text-sm text-gray-500 mt-2">
            Headers: address_line1,address_line2,lat,lng,notes
          </p>
          {importStatus && <p className="mt-2 text-green-600">{importStatus}</p>}
        </div>
      </details>

      {/* --- Save/Clear Actions --- */}
      <div className="flex justify-between">
        <button
          onClick={handleClear}
          className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
        >
          Clear Route
        </button>
        <button
          onClick={handleSave}
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Save Route
        </button>
      </div>
    </div>
  );
};

export default RouteSetup;