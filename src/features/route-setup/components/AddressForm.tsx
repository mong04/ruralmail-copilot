import React, { useState, useEffect, useRef, useCallback } from 'react';
import { type Stop, type SettingsData } from '../../../db';
import { AddressAutofill } from '@mapbox/search-js-react';
import type { AddressAutofillRetrieveResponse } from '@mapbox/search-js-core';
import { toast } from 'sonner';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface AddressFormProps {
  initialData?: Stop;
  defaultLocation: SettingsData;
  onSubmit: (stop: Partial<Stop>) => void;
  onCancel: () => void;
}

const AddressForm: React.FC<AddressFormProps> = ({ initialData, defaultLocation, onSubmit, onCancel }) => {
  const addressInputRef = useRef<HTMLInputElement>(null);
  const [autofillKey, setAutofillKey] = useState(0);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const getInitialState = useCallback(
    () => ({
      address_line1: '',
      address_line2: '',
      city: defaultLocation.defaultCity || '',
      state: defaultLocation.defaultState || '',
      zip: defaultLocation.defaultZip || '',
      notes: '',
      lat: 0,
      lng: 0,
    }),
    [defaultLocation]
  );

  const [stop, setStop] = useState<Partial<Stop>>(getInitialState());

  useEffect(() => {
    if (initialData) setStop(initialData);
    else setStop(getInitialState());
  }, [initialData, getInitialState]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setStop((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stop.address_line1) return toast.error('Address Line 1 is required');
    // The check for lat/lng is removed. Geocoding will be handled by the parent.
    onSubmit(stop);

    if (!initialData) {
      setStop(getInitialState());
      setAutofillKey((k) => k + 1);
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

      const city = props.context?.find((c) => c.id.startsWith('place.'))?.text || '';
      const state = props.context?.find((c) => c.id.startsWith('region.'))?.text || '';
      const postcode = props.context?.find((c) => c.id.startsWith('postcode.'))?.text || '';

      setStop((prev) => ({
        ...prev,
        address_line1: props.address || '',
        city,
        state,
        zip: postcode,
        lat: coords[1],
        lng: coords[0],
      }));
      toast.success('Address geocoded!');
    }
  };

  const handleIntercept = (value: string): string => {
    if (value.length <= 4) return '';
    return value;
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border border-border rounded-xl bg-surface shadow-sm space-y-4">
      <h3 className="text-lg font-semibold">{initialData ? 'Edit Stop' : 'Add New Stop'}</h3>

      <div>
        <label className="block text-sm mb-1">Address Line 1</label>
        <AddressAutofill
          key={autofillKey}
          accessToken={MAPBOX_TOKEN}
          onRetrieve={handleRetrieve}
          interceptSearch={handleIntercept}
          browserAutofillEnabled={false}
          options={{ country: 'US', limit: 5 }}
        >
          <input
            ref={addressInputRef}
            name="address_line1"
            value={stop.address_line1 || ''}
            onChange={handleChange}
            placeholder="Start typing your address..."
            className="w-full h-11 px-3 border rounded-lg bg-surface-muted"
            autoComplete="address-line1"
            required
          />
        </AddressAutofill>
      </div>

      <div>
        <label className="block text-sm mb-1">Apt / Unit (Optional)</label>
        <input
          type="text"
          name="address_line2"
          value={stop.address_line2 || ''}
          onChange={handleChange}
          className="w-full h-11 px-3 border rounded-lg bg-surface-muted"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-sm mb-1">City</label>
          <input
            type="text"
            name="city"
            value={stop.city || ''}
            onChange={handleChange}
            className="w-full h-11 px-3 border rounded-lg bg-surface-muted"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">State</label>
          <input
            type="text"
            name="state"
            value={stop.state || ''}
            onChange={handleChange}
            className="w-full h-11 px-3 border rounded-lg bg-surface-muted"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Zip</label>
          <input
            type="text"
            name="zip"
            value={stop.zip || ''}
            onChange={handleChange}
            className="w-full h-11 px-3 border rounded-lg bg-surface-muted"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1">Notes (Optional)</label>
        <input
          type="text"
          name="notes"
          value={stop.notes || ''}
          onChange={handleChange}
          placeholder="Gate code, dog warning, etc."
          className="w-full h-11 px-3 border rounded-lg bg-surface-muted"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="h-11 px-4 rounded-xl bg-accent text-foreground hover:bg-accent/80">
          Cancel
        </button>
        <button type="submit" className="h-11 px-4 rounded-xl bg-brand text-brand-foreground hover:bg-brand/90">
          {initialData ? 'Save Changes' : 'Add Stop'}
        </button>
      </div>
    </form>
  );
};

export default AddressForm;
