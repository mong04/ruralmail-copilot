// components/AddressForm.tsx (FINAL WITH LINTER FIX)
import React, { useState, useEffect, useRef, useCallback } from 'react'; // <-- 1. Import useCallback
import { type Stop, type SettingsData } from '../db';
import { AddressAutofill } from '@mapbox/search-js-react';
// We only need this one type from 'core'
import type { AddressAutofillRetrieveResponse } from '@mapbox/search-js-core';
import { toast } from 'sonner';

// Get token from Vite environment
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface AddressFormProps {
  initialData?: Stop;
  defaultLocation: SettingsData;
  onSubmit: (stop: Stop) => void;
  onCancel: () => void;
}

const AddressForm: React.FC<AddressFormProps> = ({
  initialData,
  defaultLocation,
  onSubmit,
  onCancel,
}) => {
  const addressInputRef = useRef<HTMLInputElement>(null);
  const [autofillKey, setAutofillKey] = useState(0);
  const [justSubmitted, setJustSubmitted] = useState(false);

  // --- 2. WRAP getInitialState IN useCallback ---
  // This memoizes the function, so it only changes if 'defaultLocation' changes.
  const getInitialState = useCallback(() => ({
    address_line1: '',
    address_line2: '',
    city: defaultLocation.defaultCity || '',
    state: defaultLocation.defaultState || '',
    zip: defaultLocation.defaultZip || '',
    notes: '',
    lat: 0,
    lng: 0,
  }), [defaultLocation]); // <-- Add its dependency

  // Form state
  const [stop, setStop] = useState<Partial<Stop>>(getInitialState());

  // --- 3. ADD getInitialState to THE DEPENDENCY ARRAY ---
  useEffect(() => {
    if (initialData) {
      setStop(initialData);
    } else {
      setStop(getInitialState());
    }
  }, [initialData, getInitialState]); // <-- Linter is now happy

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setStop((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stop.address_line1) {
      return toast.error('Address Line 1 is required');
    }
    if (!stop.lat || !stop.lng) {
      return toast.error(
        'Address is not geocoded. Select a valid address from the suggestions.'
      );
    }
    onSubmit(stop as Stop);

    if (!initialData) {
      setStop(getInitialState());
      setAutofillKey(k => k + 1); 
      setJustSubmitted(true);
    }
  };
  
  useEffect(() => {
    if (justSubmitted) {
      addressInputRef.current?.focus(); 
      setJustSubmitted(false);
    }
  }, [justSubmitted, autofillKey]);

  const handleRetrieve = (res: AddressAutofillRetrieveResponse) => {
    const feature = res.features[0];
    if (feature) {
      const coords = feature.geometry.coordinates;
      const props = feature.properties;

      // 'props.context' is an array. We must search it.
      const city =
        props.context?.find((c) => c.id.startsWith('place.'))?.text || '';
      const state =
        props.context?.find((c) => c.id.startsWith('region.'))?.text || '';
      const postcode =
        props.context?.find((c) => c.id.startsWith('postcode.'))?.text || '';

      setStop((prev) => ({
        ...prev,
        address_line1: props.address || '',
        city: city,
        state: state,
        zip: postcode,
        lat: coords[1], // Latitude
        lng: coords[0], // Longitude
      }));
      toast.success('Address geocoded!');
    }
  };

  const handleIntercept = (value: string): string => {
    if (value.length <= 4) {
      return ''; // Returning empty string prevents the API call
    }
    return value;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="my-4 p-4 border rounded-lg shadow"
    >
      <h3 className="text-lg font-semibold mb-3">
        {initialData ? 'Edit Stop' : 'Add New Stop'}
      </h3>
      
      <div className="mb-3">
        <label className="block text-sm mb-1">Address Line 1</label>
        <AddressAutofill
          key={autofillKey}
          accessToken={MAPBOX_TOKEN}
          onRetrieve={handleRetrieve}
          interceptSearch={handleIntercept}
          browserAutofillEnabled={false}
          options={{ 
            country: 'US',
            limit: 5,
          }}
        >
          <input
            ref={addressInputRef}
            name="address_line1"
            value={stop.address_line1}
            onChange={handleChange}
            placeholder="Start typing your address..."
            className="w-full p-2 border rounded"
            autoComplete="address-line1"
            required
          />
        </AddressAutofill>
      </div>

      {/* ... (rest of your form fields) ... */}
      <div className="mb-3">
        <label className="block text-sm mb-1">Apt / Unit (Optional)</label>
        <input
          type="text"
          name="address_line2"
          value={stop.address_line2 || ''}
          onChange={handleChange}
          placeholder="Apt B, Unit 104, etc."
          className="w-full p-2 border rounded"
          autoComplete="address-line2"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <label className="block text-sm mb-1">City</label>
          <input
            type="text"
            name="city"
            value={stop.city || ''}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            autoComplete="address-level2"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">State</label>
          <input
            type="text"
            name="state"
            value={stop.state || ''}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            autoComplete="address-level1"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Zip</label>
          <input
            type="text"
            name="zip"
            value={stop.zip || ''}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            autoComplete="postal-code"
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-sm mb-1">Notes (Optional)</label>
        <input
          type="text"
          name="notes"
          value={stop.notes || ''}
          onChange={handleChange}
          placeholder="Gate code, dog warning, etc."
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="py-2 px-4 rounded text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
        >
          {initialData ? 'Save Changes' : 'Add Stop'}
        </button>
      </div>
    </form>
  );
};

export default AddressForm;