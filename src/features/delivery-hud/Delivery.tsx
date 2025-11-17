// src/features/delivery-hud/Delivery.tsx
import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchForecast,
  fetchSevereAlerts,
  updatePosition,
  advanceStop,
  dismissBriefing,
  selectWeatherBriefingData,
  selectLookAheadData,
  selectDynamicHudAlert,
} from './hudSlice';
import { markPackagesDelivered } from '../package-management/packageSlice';
import DeliveryMap from './components/DeliveryMap';
import DeliveryHUDPanel from './components/DeliveryHUDPanel';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MapControls } from './components/MapControls';
import { LookAheadWidget } from './components/LookAheadWidget';
import { RouteWeatherBriefing } from './components/RouteWeatherBriefing';

const Delivery: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const routeState = useAppSelector((state) => state.route);
  const packageState = useAppSelector((state) => state.packages);
  const hud = useAppSelector((state) => state.hud);
  const settings = useAppSelector((state) => state.settings);

  // New Weather Data Selectors
  const briefingData = useAppSelector(selectWeatherBriefingData);
  const lookAheadData = useAppSelector(selectLookAheadData);
  const hudAlertData = useAppSelector(selectDynamicHudAlert);

  const route = routeState.route; // full Stop[]
  const packages = packageState.packages ?? []; // Package[]
  const {
    currentStop,
    position,
    voiceEnabled,
    mapStyle,
    cameraMode,
    status,  // Use status instead of loading
  } = hud;

  // Active stops: only those with packages
  const activeStops = (route ?? []).filter((stop, idx) =>
    packages.some(
      (pkg) =>
        !pkg.delivered &&
        ((pkg.assignedStopId && pkg.assignedStopId === stop.id) ||
          (typeof pkg.assignedStopNumber === 'number' &&
            pkg.assignedStopNumber === idx))
    )
  );


  // Watch geolocation
  useEffect(() => {
    if ('geolocation' in navigator) {
      // We only need to get the position once to fetch weather.
      // watchPosition is better for continuous tracking on the map.
      const watcher = navigator.geolocation.watchPosition( 
        (pos) => {
          const newPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          dispatch(updatePosition(newPosition));

          // Fetch weather only if we don't have it and are not currently loading it.
          // We only want to fetch if the status is 'idle'.
          if (status === 'idle') {
            dispatch(fetchForecast(newPosition));
            dispatch(fetchSevereAlerts(newPosition));
          }
        },
        (err) => {
          console.error('Geolocation error:', err);
          toast.error("Geolocation failed. Weather features disabled.", {
            description: "Please enable location permissions in your browser.",
          });
        },
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watcher);
    } else { 
      toast.error("Geolocation is not supported by this browser.", {
        description: "Weather features will be disabled.",
      });
    }
  }, [dispatch, status]); // Dependency is now on status

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
    }
  };

  return (
    <div className="z-30 h-screen w-screen flex flex-col overflow-hidden">
      <div className="grow relative">
        <DeliveryMap
          route={activeStops}
          fullRoute={route}
          packages={packages}
          currentStop={currentStop}
          voiceEnabled={voiceEnabled}
          position={position}
          mapStyle={mapStyle}
          cameraMode={cameraMode}
        >
          <MapControls />
          <LookAheadWidget lookAheadData={lookAheadData} status={status} />
        </DeliveryMap>
      </div>

      <DeliveryHUDPanel
        currentStop={currentStop}
        route={activeStops}
        fullRoute={route}
        packages={packages}
        hudAlertData={hudAlertData} // Pass new data down
        onAdvanceStop={() => {
          const stopId = activeStops[currentStop]?.id;
          if (stopId) {
            dispatch(markPackagesDelivered({ stopId }));
          }
          dispatch(advanceStop());
        }}
        onNavigate={handleNavigate}
        onExit={() => navigate('/')}
      />

      {/* This is correct and will now work */}
      <RouteWeatherBriefing 
        briefingData={briefingData}
        onDismiss={() => dispatch(dismissBriefing())}
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