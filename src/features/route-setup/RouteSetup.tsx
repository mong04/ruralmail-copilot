import React, { useState } from 'react';
import AddressForm from './components/AddressForm';
import AddressList from './components/AddressList';
import { useDispatch, useSelector } from 'react-redux';
import { type RootState } from '../../store';
import { addStop, updateStop, removeStop, reorderStops, saveRouteToDB } from './routeSlice';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const RouteSetup: React.FC = () => {
  const dispatch = useDispatch();
  const route = useSelector((state: RootState) => state.route.route);
  const settings = useSelector((state: RootState) => state.settings);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleSubmit = (stop: any) => {
    if (editingIndex === null) {
      dispatch(addStop(stop));
    } else {
      dispatch(updateStop({ index: editingIndex, stop }));
      setEditingIndex(null);
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
