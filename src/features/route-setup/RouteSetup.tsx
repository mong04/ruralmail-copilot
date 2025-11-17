import React, { useState } from 'react';
import AddressForm from './components/AddressForm';
import AddressList from './components/AddressList';
import { useAppDispatch, useAppSelector } from '../../store';
import { addStop, updateStop, removeStop, reorderStops, saveRouteToDB, geocodeStop } from './routeSlice';
import { type Stop } from '../../db';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const RouteSetup: React.FC = () => {
  const dispatch = useAppDispatch();
  const route = useAppSelector((state) => state.route.route);
  const settings = useAppSelector((state) => state.settings);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleSubmit = async (stop: Partial<Stop>) => {
    // If stop doesn't have lat/lng, geocode it first.
    if (!stop.lat || !stop.lng) {
      const resultAction = await dispatch(geocodeStop(stop));
      if (geocodeStop.fulfilled.match(resultAction)) {
        const geocodedStop = resultAction.payload;
        if (editingIndex === null) {
          dispatch(addStop(geocodedStop));
        } else {
          dispatch(updateStop({ index: editingIndex, stop: geocodedStop }));
          setEditingIndex(null);
        }
      }
      // If geocoding fails, the thunk will show a toast error, so we don't need to do anything here.
    } else {
      // It already has lat/lng, so just add/update it.
      if (editingIndex === null) {
        dispatch(addStop(stop as Stop));
      } else {
        dispatch(updateStop({ index: editingIndex, stop: stop as Stop }));
        setEditingIndex(null);
      }
    }
  };

  const onEdit = (index: number) => setEditingIndex(index);
  const onRemove = (index: number) => dispatch(removeStop(index));
  const onReorder = (startIndex: number, endIndex: number) => dispatch(reorderStops({ startIndex, endIndex }));
  const onSave = () => dispatch(saveRouteToDB(route));

  return (
    <Card className="p-6 space-y-6">
      <h2 className="text-xl font-semibold">Setup Route</h2>

      <AddressForm
        initialData={editingIndex !== null ? route[editingIndex] : undefined}
        defaultLocation={settings}
        onSubmit={handleSubmit}
        onCancel={() => setEditingIndex(null)}
      />

      <AddressList addresses={route} onReorder={onReorder} onEdit={onEdit} onRemove={onRemove} />

      {route.length > 0 && (
        <div className="flex justify-end gap-3">
          <Button variant="surface" onClick={onSave} aria-label="Save Route">Save Route</Button>
          <Button variant="primary" aria-label="Confirm Route">Confirm Route</Button>
        </div>
      )}
    </Card>
  );
};

export default RouteSetup;
