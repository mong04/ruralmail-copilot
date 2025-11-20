// src/features/package-management/components/Packages.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { type AppDispatch, type RootState } from '../../store';
import {
  addPackage,
  deletePackage,
  // ✅ No longer importing save/clear here
} from './packageSlice';
import { toast } from 'sonner';
import { type Package } from '../../db';
import ScannerView from './components/ScannerView';
import PackageList from './components/PackageList';
import PackageForm from './components/PackageForm';
import { Button } from '../../components/ui/Button';
import { Camera, Keyboard, Mic } from 'lucide-react'; // ✅ Removed Trash2, Save
import { cn } from '../../lib/utils';
import { VoiceEntry } from './components/VoiceEntry';
import { RouteBrain } from './utils/RouteBrain';

const Packages: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const dispatch = useDispatch<AppDispatch>();
  const { packages, loading, error } = useSelector((state: RootState) => state.packages);
  const route = useSelector((state: RootState) => state.route.route);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingPackage, setEditingPackage] = useState<Partial<Package> | null>(null);
  const [newScanData, setNewScanData] = useState<{ tracking: string } | null>(null);

  const [formContext, setFormContext] = useState<'scan' | 'manual' | 'edit'>('manual');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [pendingTranscript, setPendingTranscript] = useState<string | null>(null);


  // ✅ THE FIX: Use useRef to avoid stale closures in the toast callback.
  const pkgToUndoRef = useRef<Package | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  // Read state from URL
  const isScannerActive = searchParams.get('scanner') === 'true';
  const isFormActive = searchParams.get('form') === 'true';

  const filteredPackages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter(
      (pkg) =>
        (pkg.tracking && pkg.tracking.toLowerCase().includes(q)) ||
        (pkg.assignedAddress && pkg.assignedAddress.toLowerCase().includes(q)) ||
        (pkg.notes && pkg.notes.toLowerCase().includes(q))
    );
  }, [packages, searchQuery]);

  // NEW: Called when the Voice AI successfully identifies a stop
  // NEW: Hands-Free Confirmation Handler
  const handleVoiceConfirmation = (pkgData: Partial<Package>) => {
    // 1. Create the full package object immediately
    const newPackage: Package = {
      id: crypto.randomUUID(),
      tracking: '', // Voice packages usually don't have tracking #s read aloud
      size: 'medium', // Default size
      notes: 'Voice Entry', // Mark it so you know later
      assignedStopId: pkgData.assignedStopId,
      assignedStopNumber: pkgData.assignedStopNumber,
      assignedAddress: pkgData.assignedAddress,
      delivered: false,
    };

    // 2. Save directly to Redux (and thus DB)
    dispatch(addPackage(newPackage));
    
    // 3. Give Audio/Visual Feedback
    toast.success(`📦 Added to Stop ${pkgData.assignedStopNumber! + 1}`);
    
    // 4. Do NOT close voice active if you want to do multiple in a row.
    // If you want to close after one, uncomment the next line:
    // setIsVoiceActive(false);
  };

  // NEW: Callback for when the user gives up on voice and wants to type
  const handleManualFallback = (transcript: string) => {
    setIsVoiceActive(false);
    setPendingTranscript(transcript); 
    
    // Switch to Manual Form
    setEditingPackage(null);
    setNewScanData(null);
    setFormContext('manual');
    setSearchParams({ form: 'true' });
  };

  // Close scanner/form if URL changes (e.g., back button)
  useEffect(() => {
    const handlePopState = () => {
      if (isScannerActive) {
        setSearchParams({}, { replace: true });
      } else if (isFormActive) {
        setSearchParams({}, { replace: true });
      } else {
        navigate('/');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isScannerActive, isFormActive, navigate, setSearchParams]);

  const handleLocalScanSuccess = (tracking: string) => {
    setEditingPackage(null);
    setNewScanData({ tracking });
    setFormContext('scan');
    // Close scanner, open form
    setSearchParams({ form: 'true' }, { replace: true });
  };

  const handleStartEdit = (pkg: Package) => {
    setNewScanData(null);
    setEditingPackage(pkg);
    setFormContext('edit');
    setSearchParams({ form: 'true' });
  };

  const handleUndoDelete = () => {
    // ✅ THE FIX: Read from the ref's .current property.
    // This will *always* have the correct, most recent value.
    if (pkgToUndoRef.current) {
      dispatch(addPackage(pkgToUndoRef.current));
      toast.success('Action undone!');
      pkgToUndoRef.current = null; // Clear the ref
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    }
  };

  const handleDeletePackage = (pkg: Package) => {
    dispatch(deletePackage(pkg.id));
    // ✅ THE FIX: Set the ref's .current property.
    pkgToUndoRef.current = pkg;
    toastIdRef.current = toast.error('Package deleted.', {
      action: {
        label: 'Undo',
        onClick: handleUndoDelete, // This callback will now read the .current value
      },
      duration: 5000,
      // Clear the ref on dismiss/autoclose
      onDismiss: () => (pkgToUndoRef.current = null),
      onAutoClose: () => (pkgToUndoRef.current = null),
    });
  };

  const handleSubmitSuccess = () => {
    // --- NEW: LEARNING LOOP ---
    // If we have a pending transcript, it means the user is manually 
    // fixing a failed voice attempt. Let's teach the brain!
    if (pendingTranscript && formContext === 'manual') {
      // Heuristic: We assume the package just added (at the end of the list) 
      // is the correct match for what was said.
      // Note: Since Redux updates might be slightly async, this grabs the 
      // package currently at the end of your local list.
      const lastPkg = packages[packages.length - 1];
      
      if (lastPkg && lastPkg.assignedStopId) {
        const brain = new RouteBrain(route);
        brain.learn(pendingTranscript, lastPkg.assignedStopId);
        // Optional: Visual confirmation that it got smarter
        toast.success(`🧠 Learned: "${pendingTranscript}"`);
      }
    }
    // Clear the transcript so we don't use it again
    setPendingTranscript(null);
    // --------------------------

    // Standard Cleanup
    setEditingPackage(null);
    setNewScanData(null);
    setSearchParams({}); // Close form
    toast.success(formContext === 'edit' ? 'Package updated!' : 'Package added!');
    setFormContext('manual');
  };

  const handleCancelForm = () => {
    setEditingPackage(null);
    setNewScanData(null);
    setSearchParams({}); // Close form
    if (formContext === 'scan') {
      // If we cancelled a scan, go back to scanning
      setSearchParams({ scanner: 'true' }, { replace: true });
    }
    setFormContext('manual');
  };

  const handleScanRequest = () => {
    setSearchParams({ scanner: 'true' }, { replace: true });
  };

  // ✅ REMOVED: handleSave and handleClear. They now live in PackagesActionBar.

  const today = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  if (loading) return <p className="text-foreground">Loading packages...</p>;
  if (error) return <p className="text-danger">Error: {error}</p>;

  if (route.length === 0) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold text-danger">Route Not Found</h2>
        <p className="text-muted">
          You must set up your route before you can add packages.
        </p>
        <Button onClick={() => navigate('/route-setup')}>
          Go to Route Setup
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-foreground">
          Daily Packages - {today}
        </h2>
        <span className="text-lg font-semibold text-muted">{packages.length} total</span>
      </div>

      {/* Action Buttons */}

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Button
          onClick={handleScanRequest}
          variant="primary"
          size="lg"
        >
          <Camera className="mr-2" size={20} /> Scan
        </Button>

        <Button 
          onClick={() => setIsVoiceActive(true)} 
          variant="primary" // Or use a specific color like "brand" if defined
          size="lg"
          className="bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600" // Optional manual styling if variant="brand" fails
        >
          <Mic className="mr-2" size={20} /> Voice
        </Button>

        <Button
          onClick={() => {
            setEditingPackage(null);
            setNewScanData(null);
            setFormContext('manual');
            setSearchParams({ form: 'true' });
          }}
          variant="surface"
          size="lg"
        >
          <Keyboard className="mr-2" size={20} /> Manual
        </Button>
      </div>

      {/* Main List */}
      <div
        className={cn(
          'flex flex-col min-h-0', // min-h-0 is still good for flex children
          isFormActive ? 'hidden' : 'flex'
        )}
      >
        <PackageList
          packages={filteredPackages}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onEdit={handleStartEdit}
          onDelete={handleDeletePackage}
        />
      </div>

      {/* ✅ REMOVED: Global Save/Clear buttons are gone from here */}

      {/* Scanner Modal */}
      {isScannerActive && (
        <ScannerView
          onScanSuccess={handleLocalScanSuccess}
          onClose={() => setSearchParams({})}
        />
      )}

      {/* Package Form Modal */}
      <PackageForm
        show={isFormActive}
        formContext={formContext}
        initialPackage={editingPackage || newScanData}
        onSubmitSuccess={handleSubmitSuccess}
        onCancel={handleCancelForm}
        onScanRequest={handleScanRequest}
      />
      {isVoiceActive && (
        <VoiceEntry
          route={route} // Pass the full route so the Brain can learn
          onPackageConfirmed={handleVoiceConfirmation}
          onClose={() => setIsVoiceActive(false)}
          onManualFallback={handleManualFallback}
        />
      )}
    </div>
  );
};

export default Packages;