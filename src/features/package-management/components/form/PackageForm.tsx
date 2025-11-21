import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { type AppDispatch, type RootState } from '../../../../store';
import { addPackage, updatePackage } from '../../store/packageSlice';
import { toast } from 'sonner';
import { type Package } from '../../../../db';
import { motion, AnimatePresence, type PanInfo, useDragControls } from 'framer-motion';
import AddressInput, { type AddressMatch } from './AddressInput';
import TrackingInput from './TrackingInput';
import SizeSelect from './SizeSelect';
import NotesInput from './NotesInput';
import ActionButtons from '../actions/Actionbuttons';

function generateUUID(): string {
  return window.crypto?.randomUUID?.() || Date.now().toString();
}

interface PackageFormProps {
  show: boolean;
  formContext: 'scan' | 'manual' | 'edit';
  initialPackage: Partial<Package> | null;
  onSubmitSuccess: () => void;
  onCancel: () => void;
}

const PackageForm: React.FC<PackageFormProps> = ({
  show,
  formContext,
  initialPackage,
  onSubmitSuccess,
  onCancel,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const route = useSelector((state: RootState) => state.route.route);
  const controls = useDragControls();

  const [pkg, setPkg] = useState<Partial<Package>>({ tracking: '', size: 'medium', notes: '' });
  const [address, setAddress] = useState<string>('');
  const [match, setMatch] = useState<AddressMatch | null>(null);

  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [show]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onCancel();
    }
  };

  useEffect(() => {
      if (show) {
          setPkg({
              tracking: initialPackage?.tracking || '',
              size: (initialPackage as Package)?.size || 'medium',
              notes: (initialPackage as Package)?.notes || '',
          });
           const initStopNumber = initialPackage?.assignedStopNumber;
           const initAddr = initialPackage?.assignedAddress;

           if (typeof initStopNumber === 'number' && initAddr) {
               const matchingStop = route[initStopNumber];
               setMatch({
                   stopId: matchingStop?.id,
                   stopNumber: initStopNumber,
                   address: initAddr
               });
               setAddress(initAddr);
           } else {
               setMatch(null);
               setAddress(initialPackage?.assignedAddress || '');
           }
      }
  }, [show, initialPackage, route]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPkg((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
      const trimmedTracking = pkg.tracking?.trim();
      const trimmedAddress = address.trim();

      if (!trimmedTracking && !trimmedAddress) {
        toast.error('Must provide a tracking # or an address');
        return;
      }

      const finalPackage: Package = {
        id: (initialPackage as Package)?.id || generateUUID(),
        tracking: trimmedTracking || '',
        size: pkg.size || 'medium',
        notes: pkg.notes?.trim() || '',
        assignedStopId: match?.stopId,
        assignedStopNumber: match?.stopNumber,
        assignedAddress: match?.address || trimmedAddress,
      };

      if (formContext === 'edit') {
        dispatch(updatePackage(finalPackage));
      } else {
        dispatch(addPackage(finalPackage));
      }
      onSubmitSuccess();
  };

  const isSubmitDisabled = !pkg.tracking?.trim() && !address.trim();

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            dragListener={false}
            dragControls={controls}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh]"
            style={{ touchAction: 'none' }} 
          >
            <div 
                className="w-full flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing touch-none"
                onPointerDown={(e) => controls.start(e)} 
            >
               <div className="w-16 h-1.5 bg-border/60 rounded-full pointer-events-none" />
            </div>

            <div 
                className="flex-1 overflow-y-auto px-6 pt-2 pb-6 space-y-6"
                onPointerDownCapture={(e) => e.stopPropagation()} 
            >
               <div className="text-center mb-2">
                  <h2 className="text-lg font-bold text-foreground">
                    {formContext === 'edit' ? 'Edit Package' : 'New Package'}
                  </h2>
               </div>

               <AddressInput
                 address={address}
                 setAddress={setAddress}
                 formContext={formContext}
                 match={match}
                 onMatchChange={(m) => { setMatch(m); if(m) setAddress(m.address); }}
               />

               <TrackingInput
                 pkg={pkg}
                 formContext={formContext}
                 handleInputChange={handleInputChange}
               />

               <SizeSelect pkg={pkg} setPkg={setPkg} />

               <NotesInput pkg={pkg} handleInputChange={handleInputChange} setPkg={setPkg} />
            </div>

            <div className="p-4 border-t border-border bg-surface/95 backdrop-blur pb-8">
               <ActionButtons
                 formContext={formContext}
                 onCancel={onCancel}
                 onSubmit={handleSubmit}
                 disabled={isSubmitDisabled}
               />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PackageForm;