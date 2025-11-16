// src/features/delivery-hud/Delivery.tsx
import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchWeatherAlerts,
  updatePosition,
  // toggleVoice,
  advanceStop,
} from './hudSlice';
import { markPackagesDelivered } from '../package-management/packageSlice';
import DeliveryMap from './components/DeliveryMap';
import DeliveryHUDPanel from './components/DeliveryHUDPanel';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MapControls } from './components/MapControls';

const Delivery: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const routeState = useAppSelector((state) => state.route);
  const packageState = useAppSelector((state) => state.packages);
  const hud = useAppSelector((state) => state.hud);
  const settings = useAppSelector((state) => state.settings);

  const route = routeState.route; // full Stop[]
  const packages = packageState.packages ?? []; // Package[]
  const {
    currentStop,
    weatherAlerts,
    position,
    voiceEnabled,
    mapStyle,
    cameraMode,
  } = hud;

  // Active stops: only those with packages
  const activeStops = (route ?? []).filter((stop, idx) =>
    packages.some(
      (pkg) =>
        !pkg.delivered && // ✅ Only count stops with *undelivered* packages
        ((pkg.assignedStopId && pkg.assignedStopId === stop.id) ||
          (typeof pkg.assignedStopNumber === 'number' &&
            pkg.assignedStopNumber === idx))
    )
  );

  // Poll weather every 15 minutes
  useEffect(() => {
    dispatch(fetchWeatherAlerts()); // Fetch weather immediately
    const interval = setInterval(() => {
      if (position) {
        dispatch(fetchWeatherAlerts());
      }
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [dispatch, position]);

  // Watch geolocation
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watcher = navigator.geolocation.watchPosition(
        (pos) => {
          dispatch(
            updatePosition({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            })
          );
        },
        (err) => console.error('Geolocation error:', err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watcher);
    }
  }, [dispatch]);

  // New navigation handler
  const handleNavigate = () => {
    const stop = activeStops[currentStop];
    if (!stop) {
      toast.error('No stop to navigate to.');
      return;
    }

    const { lat, lng } = stop;
    const navApp = settings.preferredNavApp || 'in-app';

    let url: string;

    switch (navApp) {
      case 'google':
        url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        break;
      case 'apple':
        url = `http://maps.apple.com/?daddr=${lat},${lng}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        break;
      case 'waze':
        url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
        window.open(url, '_blank', 'noopener,noreferrer');
        break;
      case 'in-app':
      default:
        toast.info('In-app navigation selected (coming soon!)');
      // In the future, we would trigger the Mapbox Directions API here.
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <div className="grow relative">
        <DeliveryMap
          route={activeStops} // filtered stops only
          fullRoute={route} // full route still passed for resolving
          packages={packages}
          currentStop={currentStop} // index into activeStops now
          voiceEnabled={voiceEnabled}
          position={position}
          mapStyle={mapStyle} // ✅ PASS PROP
          cameraMode={cameraMode} // ✅ PASS PROP
        />
        <MapControls />
      </div>

      <DeliveryHUDPanel
        currentStop={currentStop}
        route={activeStops} // HUD only sees active stops
        fullRoute={route} // ✅ Pass full route
        packages={packages}
        weatherAlerts={weatherAlerts}
        onAdvanceStop={() => {
          const stopId = activeStops[currentStop]?.id;
          if (stopId) {
            dispatch(markPackagesDelivered({ stopId }));
          }
          dispatch(advanceStop()); // increments index through activeStops
        }}
        onNavigate={handleNavigate} // ✅ Pass the handler
        onExit={() => navigate('/')}
      />

      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 h-11 px-4 rounded-xl bg-brand text-brand-foreground 
                  hover:bg-brand/90 focus:ring-2 focus:ring-brand shadow-md z-40"
      >
        ← Dashboard
      </button>
    </div>
  );
};

export default Delivery;