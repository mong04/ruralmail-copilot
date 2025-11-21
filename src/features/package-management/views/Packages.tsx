import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { type AppDispatch, type RootState } from '../../../store';
import { addPackage, deletePackage } from '../store/packageSlice';
import { toast } from 'sonner';
import { type Package } from '../../../db';

// Components
import ScannerView from '../components/scanner/ScannerView';
import PackageList from '../components/list/PackageList';
import PackageForm from '../components/form/PackageForm';
import { PackagesActionBar } from './../components/actions/PackagesActionBar';
import { VoiceEntry } from '../components/form/VoiceEntry';
import { Button } from '../../../components/ui/Button';

// Icons & Utils
import { Camera, Keyboard, Mic } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { RouteBrain } from '../utils/RouteBrain';

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

  const pkgToUndoRef = useRef<Package | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  const isScannerActive = searchParams.get('scanner') === 'true';
  const isFormActive = searchParams.get('form') === 'true';

  const filteredPackages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter((pkg) =>
      (pkg.tracking && pkg.tracking.toLowerCase().includes(q)) ||
      (pkg.assignedAddress && pkg.assignedAddress.toLowerCase().includes(q)) ||
      (pkg.notes && pkg.notes.toLowerCase().includes(q))
    );
  }, [packages, searchQuery]);

  // Effects
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

  // Handlers
  const handleLocalScanSuccess = (tracking: string) => {
    setEditingPackage(null);
    setNewScanData({ tracking });
    setFormContext('scan');
    setSearchParams({ form: 'true' }, { replace: true });
  };

  const handleStartEdit = (pkg: Package) => {
    setNewScanData(null);
    setEditingPackage(pkg);
    setFormContext('edit');
    setSearchParams({ form: 'true' });
  };

  const handleUndoDelete = () => {
    if (pkgToUndoRef.current) {
      dispatch(addPackage(pkgToUndoRef.current));
      toast.success('Action undone!');
      pkgToUndoRef.current = null;
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    }
  };

  const handleDeletePackage = (pkg: Package) => {
    dispatch(deletePackage(pkg.id));
    pkgToUndoRef.current = pkg;
    toastIdRef.current = toast.error('Package deleted.', {
      action: {
        label: 'Undo',
        onClick: handleUndoDelete,
      },
      duration: 5000,
      onDismiss: () => (pkgToUndoRef.current = null),
      onAutoClose: () => (pkgToUndoRef.current = null),
    });
  };

  const handleSubmitSuccess = () => {
    if (pendingTranscript && formContext === 'manual') {
      const lastPkg = packages[packages.length - 1];
      if (lastPkg && lastPkg.assignedStopId) {
         const brain = new RouteBrain(route);
         brain.learn(pendingTranscript, lastPkg.assignedStopId);
         toast.success(`🧠 Learned alias: "${pendingTranscript}"`);
      }
    }
    setPendingTranscript(null);
    setEditingPackage(null);
    setNewScanData(null);
    setSearchParams({});
    toast.success(formContext === 'edit' ? 'Package updated!' : 'Package added!');
    setFormContext('manual');
  };

  const handleCancelForm = () => {
    setEditingPackage(null);
    setNewScanData(null);
    setSearchParams({});
    if (formContext === 'scan') {
      setSearchParams({ scanner: 'true' }, { replace: true });
    }
    setFormContext('manual');
  };

  const handleScanRequest = () => {
    setSearchParams({ scanner: 'true' }, { replace: true });
  };

  const handleVoiceConfirmation = (pkgData: Partial<Package>) => {
    const newPackage: Package = {
      id: crypto.randomUUID(),
      tracking: '',
      size: 'medium',
      notes: 'Voice Entry',
      assignedStopId: pkgData.assignedStopId,
      assignedStopNumber: pkgData.assignedStopNumber,
      assignedAddress: pkgData.assignedAddress,
      delivered: false,
    };

    dispatch(addPackage(newPackage));
    toast.success(`📦 Added to Stop ${pkgData.assignedStopNumber! + 1}`);
  };

  const handleManualFallback = (transcript: string) => {
    setIsVoiceActive(false);
    setPendingTranscript(transcript);
    setEditingPackage(null);
    setNewScanData(null);
    setFormContext('manual');
    setSearchParams({ form: 'true' });
  };

  const handleAddAtStop = (stopData: Partial<Package>) => {
    // 1. Pre-fill the location data
    setEditingPackage(stopData); 
    // 2. Clear any previous scan data to avoid confusion
    setNewScanData(null);
    // 3. Set context to MANUAL (Important: this tells the form "Create New", not "Update")
    setFormContext('manual');
    // 4. Open Form
    setSearchParams({ form: 'true' });
  };

  if (loading) return <div className="p-6 text-center animate-pulse text-foreground">Loading manifest...</div>;
  if (error) return <div className="p-6 text-center text-danger">Error: {error}</div>;

  if (route.length === 0) {
    return (
      <div className="text-center space-y-4 p-6">
        <h2 className="text-xl font-semibold text-danger">Route Not Found</h2>
        <p className="text-muted">You must set up your route before you can add packages.</p>
        <Button onClick={() => navigate('/route-setup')}>Go to Route Setup</Button>
      </div>
    );
  }

  return (
    // Removed pb-32 from here to fix "Dead Space"
    <div className="flex flex-col min-h-screen bg-background relative">
      
      {/* 1. Sticky Top Header */}
      <div className="z-30">
        <PackagesActionBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      </div>
      {/* 2. Main List - Removed flex-1 so it doesn't force height */}
      <div className={cn("w-full", isFormActive ? 'hidden' : 'block')}>
        <PackageList
          packages={filteredPackages}
          searchQuery={searchQuery}
          onEdit={handleStartEdit}
          onDelete={handleDeletePackage}
          onAddAtStop={handleAddAtStop}
        />
      </div>

      {/* 3. Floating Gradient - Fixed so it doesn't affect layout flow */}
      <div className="fixed bottom-0 left-0 right-0 h-40 bg-linear-to-t from-background via-background/90 to-transparent pointer-events-none z-10" />

      {/* 4. FAB Cluster */}
      <div className="fixed bottom-24 left-0 right-0 px-4 z-30 pointer-events-none">
        <div className="max-w-md mx-auto flex justify-between items-end pointer-events-auto">
            
            <Button
               onClick={() => {
                  setEditingPackage(null);
                  setNewScanData(null);
                  setFormContext('manual');
                  setSearchParams({ form: 'true' });
               }}
               variant="surface"
               className="w-14 h-14 rounded-full shadow-xl p-0 border border-white/10 bg-surface/80 backdrop-blur-md"
            >
               <Keyboard size={24} />
            </Button>

            <button
               onClick={() => setIsVoiceActive(true)}
               className="relative -top-2 bg-brand text-brand-foreground w-20 h-20 rounded-full shadow-2xl shadow-brand/40 flex items-center justify-center transform transition active:scale-95 hover:scale-105 border-4 border-background"
            >
               <Mic size={40} />
               <div className="absolute inset-0 rounded-full border border-white/20 animate-ping opacity-20 pointer-events-none" />
            </button>

            <Button
               onClick={() => setSearchParams({ scanner: 'true' }, { replace: true })}
               variant="surface"
               className="w-14 h-14 rounded-full shadow-xl p-0 border border-white/10 bg-surface/80 backdrop-blur-md"
            >
               <Camera size={24} />
            </Button>
        </div>
      </div>

      {/* Overlays */}
      {isScannerActive && <ScannerView onScanSuccess={handleLocalScanSuccess} onClose={() => setSearchParams({})} />}
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
            route={route} 
            onPackageConfirmed={handleVoiceConfirmation}
            onClose={() => setIsVoiceActive(false)}
            onManualFallback={handleManualFallback}
         />
      )}
    </div>
  );
};

export default Packages;