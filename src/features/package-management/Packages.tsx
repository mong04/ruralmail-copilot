// src/features/package-management/components/Packages.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { type AppDispatch, type RootState } from '../../store';
import { addPackage, deletePackage, savePackagesToDB, clearPackagesFromDB } from './packageSlice';
import { toast } from 'sonner';
import { type Package } from '../../db';
import ScannerView from './components/ScannerView';
import PackageList from './components/PackageList';
import PackageForm from './components/PackageForm';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Camera, Keyboard, Trash2, Save } from 'lucide-react';

const Packages: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();

  const dispatch = useDispatch<AppDispatch>();
  const { packages, loading, error } = useSelector((state: RootState) => state.packages);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [newScanData, setNewScanData] = useState<{ tracking: string } | null>(null);

  const [pkgToUndo, setPkgToUndo] = useState<Package | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  const [isScannerActive, setIsScannerActive] = useState(false);
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [formContext, setFormContext] = useState<'scan' | 'manual' | 'edit'>('manual');

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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setIsScannerActive(params.get('scanner') === 'true');
    setShowPackageForm(params.get('form') === 'true');
  }, [location.search]);

  useEffect(() => {
    const handlePopState = () => {
      if (isScannerActive) {
        setIsScannerActive(false);
        setSearchParams({});
      } else if (showPackageForm) {
        setShowPackageForm(false);
        setSearchParams({});
      } else {
        navigate('/');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isScannerActive, showPackageForm, navigate, setSearchParams]);

  const handleLocalScanSuccess = (tracking: string) => {
    setEditingPackage(null);
    setNewScanData({ tracking });
    setIsScannerActive(false);
    setShowPackageForm(true);
    setFormContext('scan');
    setSearchParams({ form: 'true' });
  };

  const handleStartEdit = (pkg: Package) => {
    setNewScanData(null);
    setEditingPackage(pkg);
    setFormContext('edit');
    setShowPackageForm(true);
    setIsScannerActive(false);
    setSearchParams({ form: 'true' });
  };

  const handleUndoDelete = () => {
    if (pkgToUndo) {
      dispatch(addPackage(pkgToUndo));
      toast.success('Action undone!');
      setPkgToUndo(null);
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    }
  };

  const handleDeletePackage = (pkg: Package) => {
    dispatch(deletePackage(pkg.id));
    setPkgToUndo(pkg);
    toastIdRef.current = toast.success('Package deleted.', {
      action: {
        label: 'Undo',
        onClick: handleUndoDelete,
      },
      onDismiss: () => {
        setPkgToUndo(null);
        toastIdRef.current = null;
      },
      onAutoClose: () => {
        setPkgToUndo(null);
        toastIdRef.current = null;
      },
    });
  };

  const handleSubmitSuccess = () => {
    setEditingPackage(null);
    setNewScanData(null);
    setShowPackageForm(false);
    setSearchParams({});
    toast.success(formContext === 'edit' ? 'Package updated!' : 'Package added!');
  };

  const handleCancelForm = () => {
    setEditingPackage(null);
    setNewScanData(null);
    setShowPackageForm(false);
    setSearchParams({});
    if (formContext === 'scan') {
      setIsScannerActive(true);
      setSearchParams({ scanner: 'true' });
    }
  };

  const handleSave = () => {
    dispatch(savePackagesToDB(packages));
    toast.success('Packages saved!');
  };

  const handleClear = () => {
    if (window.confirm('Clear all packages? This cannot be undone.')) {
      dispatch(clearPackagesFromDB());
      toast.success('All packages cleared.');
    }
  };

  if (loading) return <p className="text-foreground">Loading packages...</p>;
  if (error) return <p className="text-danger">Error: {error}</p>;

  return (
    <Card className="p-6 space-y-6 md:max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold text-foreground">Manage Packages</h2>
      <button onClick={() => navigate('/')} className="text-brand hover:underline" aria-label="Back to Dashboard">
        Back to Dashboard
      </button>

      {isScannerActive && (
        <ScannerView
          onScanSuccess={handleLocalScanSuccess}
          onClose={() => {
            setIsScannerActive(false);
            setSearchParams({});
          }}
        />
      )}

      {!showPackageForm && (
        <div className="flex flex-col md:flex-row justify-between mb-2 gap-3">
          <Button
            onClick={() => {
              setIsScannerActive(true);
              setShowPackageForm(false);
              setSearchParams({ scanner: 'true' });
            }}
            variant="primary"
          >
            <Camera className="mr-2" size={16} /> Scan Package
          </Button>

          <Button
            onClick={() => {
              setFormContext('manual');
              setShowPackageForm(true);
              setIsScannerActive(false);
              setSearchParams({ form: 'true' });
            }}
            variant="surface"
          >
            <Keyboard className="mr-2" size={16} /> Add Manual Package
          </Button>
        </div>
      )}

      {showPackageForm && (
        <PackageForm show={showPackageForm} formContext={formContext} initialPackage={editingPackage || newScanData} onSubmitSuccess={handleSubmitSuccess} onCancel={handleCancelForm} />
      )}

      {!showPackageForm && (
        <PackageList
          packages={filteredPackages}
          allPackages={packages}
          totalCount={packages.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onEdit={handleStartEdit}
          onDelete={handleDeletePackage}
        />
      )}

      <div className="flex gap-3 pt-2 flex-col md:flex-row">
        <Button onClick={handleClear} variant="danger" className="flex-1">
          <Trash2 className="mr-2" size={16} /> Clear All
        </Button>
        <Button onClick={handleSave} disabled={packages.length === 0} variant="primary" className="flex-1">
          <Save className="mr-2" size={16} /> Save Packages
        </Button>
      </div>
    </Card>
  );
};

export default Packages;