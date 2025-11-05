import React, { useState, type ChangeEvent, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { type AppDispatch, type RootState } from '../store';
import { addStop, clearRouteMemory, loadRouteFromDB, saveRouteToDB, geocodeStop } from '../store/routeSlice';
import Papa from 'papaparse';
import { type Stop } from '../db';
import { toast } from "sonner";

interface CsvRow {
  address?: string;
  address_line2?: string;
  lat?: string;
  lng?: string;
  notes?: string;
}

const RouteSetup: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { route, loading, error } = useSelector((state: RootState) => state.route);
  const settings = useSelector((state: RootState) => state.settings); // Get defaults
  const [newStop, setNewStop] = useState<Partial<Stop>>({
    address_line1: '',
    address_line2: '',
    city: settings.defaultCity,
    state: settings.defaultState,
    zip: settings.defaultZip,
    lat: 0,
    lng: 0,
    notes: '',
  });
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    dispatch(loadRouteFromDB());  // Load on mount
  }, [dispatch]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewStop((prev) => ({ ...prev, [name]: name === 'lat' || name === 'lng' ? parseFloat(value) : value }));
  };

  // New handleGeocode
  const handleGeocode = async () => {
    if (!newStop.address_line1) return toast.error('Enter at least address line 1');
    const result = await dispatch(geocodeStop(newStop));
    if (geocodeStop.fulfilled.match(result)) {
      setNewStop({ ...newStop, ...result.payload });
      toast.success('Geocoded successfully!');
    }
  };

  const handleAddStop = () => {
    if (newStop.address_line1 && !isNaN(newStop.lat!) && !isNaN(newStop.lng!)) {
      dispatch(addStop(newStop as Stop));
      setNewStop({
        address_line1: '',
        address_line2: '',
        city: settings.defaultCity,
        state: settings.defaultState,
        zip: settings.defaultZip,
        lat: 0,
        lng: 0,
        notes: '',
      });
    } else {
      toast.error('Missing required fields or coords - geocode or enter manually');
    }
  };

  const handleSave = () => {
    dispatch(saveRouteToDB(route));
  };

  const handleClear = () => {
    dispatch(clearRouteMemory());
  };

  const handleCSVUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportStatus('Importing...');  // Show loading
      Papa.parse<CsvRow>(file, {
        header: true,
        complete: (results) => {
          const importedStops: Stop[] = results.data
            .map((row) => ({
              address_line1: row.address?.trim() || '',  // Map 'address' from CSV to 'address_line1'
              address_line2: row.address_line2?.trim() || '',  // Map 'address_line2' if present, else empty
              lat: parseFloat(row.lat ?? 'NaN'),
              lng: parseFloat(row.lng ?? 'NaN'),
              notes: row.notes?.trim() || '',
              city: settings.defaultCity,
              state: settings.defaultState,
              zip: settings.defaultZip,
            }))
            .filter((stop) => stop.address_line1 && !isNaN(stop.lat) && !isNaN(stop.lng));  // Stricter filter

          if (importedStops.length > 0) {
            importedStops.forEach((stop) => dispatch(addStop(stop)));
            setImportStatus(`Imported ${importedStops.length} stops successfully!`);
          } else {
            setImportStatus('No valid stops found in CSV. Check format.');
          }
          console.log('Imported stops:', importedStops);  // Debug log
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
      <button onClick={onBack} className="mb-4 text-blue-500">Back to Dashboard</button>

      {/* Manual Entry */}
      <div className="mb-6">
        <h3 className="text-lg mb-2">Add Stop Manually</h3>
        <input
          type="text"
          name="address_line1"
          value={newStop.address_line1}
          onChange={handleInputChange}
          placeholder="Address Line 1"
          className="w-full mb-2 p-2 border rounded"
        />
        <input
          type="text"
          name="address_line2"
          value={newStop.address_line2}
          onChange={handleInputChange}
          placeholder="Address Line 2 (optional)"
          className="w-full mb-2 p-2 border rounded"
        />
        <input
          type="text"
          name="city"
          value={newStop.city}
          onChange={handleInputChange}
          placeholder="City"
          className="w-full mb-2 p-2 border rounded"
        />
        <input
          type="text"
          name="state"
          value={newStop.state}
          onChange={handleInputChange}
          placeholder="State"
          className="w-full mb-2 p-2 border rounded"
        />
        <input
          type="text"
          name="zip"
          value={newStop.zip}
          onChange={handleInputChange}
          placeholder="Zip"
          className="w-full mb-2 p-2 border rounded"
        />
        <button onClick={handleGeocode} className="bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600 mb-2">
          Geocode Address
        </button>
        <input
          type="number"
          name="lat"
          value={newStop.lat}
          onChange={handleInputChange}
          placeholder="Latitude"
          className="w-full mb-2 p-2 border rounded"
        />
        <input
          type="number"
          name="lng"
          value={newStop.lng}
          onChange={handleInputChange}
          placeholder="Longitude"
          className="w-full mb-2 p-2 border rounded"
        />
        <input
          type="text"
          name="notes"
          value={newStop.notes}
          onChange={handleInputChange}
          placeholder="Notes (optional)"
          className="w-full mb-2 p-2 border rounded"
        />
        <button onClick={handleAddStop} className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600">
          Add Stop
        </button>
      </div>

      {/* CSV Import */}
      <div className="mb-6">
        <h3 className="text-lg mb-2">Import from CSV</h3>
        <label className="w-full bg-blue-100 text-blue-800 py-2 px-4 rounded-lg cursor-pointer hover:bg-blue-200 transition text-center block">
          Choose CSV File
          <input
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="hidden"  // Hide default input, use label as button
          />
        </label>
        <p className="text-sm text-gray-500 mt-2">CSV format: address,address_line2,lat,lng,notes (headers required; address_line2 optional)</p>
        {importStatus && <p className="mt-2 text-green-600">{importStatus}</p>}  {/* Feedback */}
      </div>

      {/* Current Route */}
      <div className="mb-6">
        <h3 className="text-lg mb-2">Current Route ({route.length} stops)</h3>
        <ul key={route.length} className="list-disc pl-5 max-h-60 overflow-y-auto">  {/* Added key and scroll */}
          {route.map((stop, index) => (
            <li key={index}>
              {stop.address_line1}{stop.address_line2 ? `, ${stop.address_line2}` : ''} ({stop.lat}, {stop.lng}) {stop.notes && `- ${stop.notes}`}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-between">
        <button onClick={handleClear} className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600">
          Clear Route
        </button>
        <button onClick={handleSave} className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
          Save Route
        </button>
      </div>
    </div>
  );
};

export default RouteSetup;