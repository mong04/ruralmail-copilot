import React, { useState } from 'react';
import AddressForm from './components/AddressForm';
import AddressList from './components/AddressList';
import { useAppDispatch, useAppSelector } from '../../store';
import { addStop, updateStop, removeStop, reorderStops, saveRouteToDB, geocodeStop } from './routeSlice';
import { type Stop } from '../../db';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import Portal from '../../components/ui/Portal';

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
    <div className="flex flex-col h-full">
      {/* Sticky Header: Full-width with centered content */}
      <div className="flex-none z-10 bg-background/95 backdrop-blur border-b border-border px-6 pt-6 pb-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Route Setup</h2>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-6 py-6 space-y-8 max-w-2xl mx-auto w-full pb-40">
        <Card className="p-6">
          <AddressForm
            initialData={editingIndex !== null ? route[editingIndex] : undefined}
            defaultLocation={settings}
            onSubmit={handleSubmit}
            onCancel={() => setEditingIndex(null)}
            />
        </Card>
        <Card>
          <AddressList addresses={route} onReorder={onReorder} onEdit={onEdit} onRemove={onRemove} />
        </Card>
        </div>
      </div>

      {route.length > 0 && (
        <Portal>
          <div className="pointer-events-none fixed inset-0 z-50 flex flex-col justify-end">
            <div
              className="absolute left-0 right-0 h-40 bg-linear-to-t from-background via-background/80 to-transparent z-0"
              style={{ bottom: 'calc(var(--bottom-nav-height) + 8px)' }}
            />
            <div className="relative z-10 fab-offset px-6 w-full max-w-md mx-auto">
              <div className="flex items-end justify-end gap-4 pointer-events-auto">
                <Button onClick={onSave} size="lg" className="w-full btn-glow">
                  Save Route
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
};

export default RouteSetup;
