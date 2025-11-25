// src/features/delivery-hud/Delivery.tsx
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchForecast,
  fetchSevereAlerts,
  fetchDirections,
  updatePosition,
  advanceStop,
  advanceNavigationStep,
  exitNavigation,
  dismissBriefing,
  selectWeatherBriefingData,
  selectLookAheadData,
  selectDynamicHudAlert,
  setCurrentStop
} from './hudSlice';
import { type Stop, type Package } from '../../db';
import { showNotification } from '../notification/notificationSlice';
import { markPackagesDelivered } from '../package-management/store/packageSlice';
import DeliveryMap from './components/DeliveryMap';
import DeliveryHUDPanel from './components/DeliveryHUDPanel';
import { useNavigate } from 'react-router-dom';
import { MapControls } from './components/MapControls';
import { LookAheadWidget } from './components/LookAheadWidget';
import { RouteWeatherBriefing } from './components/RouteWeatherBriefing';
import NavigationPanel from './components/NavigationPanel';
import distance from '@turf/distance';
import { HudBanner } from '../notification/HudBanner';
import { geocodeStop, updateStop } from '../route-setup/routeSlice';
import { triggerThemeFx } from '../../lib/theme-fx';

// Fix 3: Stable constant for empty packages to satisfy useMemo dependency rules
const EMPTY_PACKAGES: Package[] = [];

const Delivery: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // State Selectors
  const routeState = useAppSelector((state) => state.route);
  const packageState = useAppSelector((state) => state.packages);
  const hud = useAppSelector((state) => state.hud);
  const settings = useAppSelector((state) => state.settings);
  // Fix 2: Removed unused 'theme' variable

  // Data Selectors
  const briefingData = useAppSelector(selectWeatherBriefingData);
  const lookAheadData = useAppSelector(selectLookAheadData);
  const hudAlertData = useAppSelector(selectDynamicHudAlert);

  const route = routeState.route; 
  // Fix 3: Use stable constant
  const packages = packageState.packages ?? EMPTY_PACKAGES;
  
  const {
    currentStop,
    position,
    voiceEnabled,
    mapStyle,
    cameraMode,
    status,
    isNavigating,
    navigationData,
    navigationStepIndex,
  } = hud;

  const pendingNavigationTarget = useRef<Stop | null>(null);

  // Active stops logic
  const activeStops = useMemo(() => (route ?? []).filter((stop, idx) =>
    packages.some(
      (pkg) =>
        !pkg.delivered &&
        ((pkg.assignedStopId && pkg.assignedStopId === stop.id) ||
          (typeof pkg.assignedStopNumber === 'number' &&
            pkg.assignedStopNumber === idx))
    )
  ), [route, packages]);

  const lastCheckedPosition = useRef<{ lat: number; lng: number } | null>(null);
  const deliveryMapRef = useRef<{ recenterOnCurrent: () => void } | null>(null);

  // --- Effects ---
  useEffect(() => {
    if (activeStops.length > 0) {
      dispatch(setCurrentStop(0));
    }
  }, [activeStops.length, dispatch]);

  useEffect(() => {
    if (!isNavigating || !position || !navigationData) return;

    if (
      lastCheckedPosition.current &&
      lastCheckedPosition.current.lat === position.lat &&
      lastCheckedPosition.current.lng === position.lng
    ) {
      return;
    }
    lastCheckedPosition.current = position;

    const currentStep = navigationData.steps[navigationStepIndex];
    const nextStep = navigationData.steps[navigationStepIndex + 1];

    if (!currentStep || !nextStep || !nextStep.location) return;

    const userPoint: [number, number] = [position.lng, position.lat];
    const nextManeuverPoint: [number, number] = nextStep.location;
    const distanceToNextManeuver = distance(userPoint, nextManeuverPoint, { units: 'meters' });

    if (distanceToNextManeuver < 20) {
      dispatch(advanceNavigationStep());
    }
  }, [position, isNavigating, navigationData, navigationStepIndex, dispatch]);

  // Geolocation & Weather
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watcher = navigator.geolocation.watchPosition( 
        (pos) => {
          const { latitude, longitude, heading } = pos.coords;
          const newPosition: { lat: number; lng: number; heading?: number } = { lat: latitude, lng: longitude };
          if (typeof heading === 'number' && !isNaN(heading)) {
            newPosition.heading = heading;
          }
          dispatch(updatePosition(newPosition));
          if (status === 'idle') {
            dispatch(fetchForecast(newPosition));
            dispatch(fetchSevereAlerts(newPosition));
          }
        },
        () => {
          dispatch(showNotification({
            type: 'error',
            message: 'Geolocation failed',
            description: 'Please enable location permissions.',
          }));
        },
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watcher);
    }
  }, [dispatch, status]);

  // Navigation Handler
  const handleNavigate = useCallback((stopToNavigate?: Stop) => {
    const stop = stopToNavigate || activeStops[currentStop];
    if (!stop) {
      dispatch(showNotification({ type: 'warning', message: 'No Stop Selected', description: 'No active stop to navigate to.' }));
      return;
    }

    if (!stop.lat || !stop.lng) {
      pendingNavigationTarget.current = stop;
      dispatch(showNotification({ type: 'info', message: `Geocoding ${stop.address_line1}...`}));
      dispatch(geocodeStop(stop)).then(action => {
        if (geocodeStop.fulfilled.match(action)) {
          const stopIndex = route.findIndex(s => s.id === action.payload.id);
          if (stopIndex !== -1) dispatch(updateStop({ index: stopIndex, stop: action.payload }));
        }
      });
    } else {
      const { lat, lng } = stop;
      const navApp = settings.preferredNavApp || 'in-app';

      if (navApp === 'in-app') {
        dispatch(fetchDirections({ end: { location: [lng, lat] } }));
        triggerThemeFx('navigation-start');
      } else {
        // External Maps Logic
        let url = '';
        if (navApp === 'google') url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        else if (navApp === 'apple') url = `http://maps.apple.com/?daddr=${lat},${lng}`;
        else if (navApp === 'waze') url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }
  }, [activeStops, currentStop, dispatch, route, settings.preferredNavApp]);

  useEffect(() => {
    if (pendingNavigationTarget.current && routeState.loading === false) {
      const freshlyGeocodedStop = route.find(s => s.id === pendingNavigationTarget.current?.id);
      if (freshlyGeocodedStop && freshlyGeocodedStop.lat && freshlyGeocodedStop.lng) {
        handleNavigate(freshlyGeocodedStop); 
      }
    }
  }, [route, routeState.loading, handleNavigate]);

  return (
    <div className="z-30 h-screen w-screen flex flex-col overflow-hidden bg-black">
      {/* Fix 1: Removed unused CyberpunkOverlay import and usage.
          ThemeController handles the overlay globally. */}
      <HudBanner />

      <div className="grow relative">
        <DeliveryMap
          ref={deliveryMapRef}
          route={activeStops}
          fullRoute={route}
          packages={packages}
          currentStopIndex={currentStop}
          voiceEnabled={voiceEnabled}
          position={position}
          mapStyle={mapStyle}
          cameraMode={cameraMode}
        >
          {/* HUD LAYOUT */}
          
          {/* Top Center: Turn-by-Turn */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-auto w-full max-w-md px-4">
             <NavigationPanel />
          </div>
          
          {/* Top Right: Next Stop Preview */}
          <div className={`absolute right-4 z-10 pointer-events-auto transition-all duration-300 ease-in-out ${isNavigating ? 'top-24' : 'top-20'}`}>
            <LookAheadWidget lookAheadData={lookAheadData} status={status} />
          </div>

          {/* Bottom Right: Map Controls */}
          <div className="absolute bottom-32 right-4 z-10 pointer-events-auto">
             <MapControls 
               onRecenter={() => deliveryMapRef.current?.recenterOnCurrent()} 
               isMapOffCenter={hud.isMapOffCenter}  
             />
          </div>
        </DeliveryMap>
      </div>

      {/* Bottom Panel: The Tactical Deck */}
      <DeliveryHUDPanel
        currentStop={currentStop}
        route={activeStops}
        fullRoute={route}
        packages={packages}
        isNavigating={isNavigating}
        hudAlertData={hudAlertData}
        onAdvanceStop={() => dispatch(advanceStop())}
        onMarkDelivered={() => {
          const currentStopObj = activeStops[currentStop];
          if (!currentStopObj?.id) return;
          
          // Trigger FX
          const btn = document.activeElement as HTMLElement;
          triggerThemeFx('package-delivered', btn);

          dispatch(markPackagesDelivered({ stopId: currentStopObj.id }));
          
          // Auto-Advance Logic
          const nextActiveIndex = activeStops.slice(currentStop + 1).findIndex(stop =>
            packages.some(
              p => !p.delivered && (p.assignedStopId === stop.id || (!p.assignedStopId && typeof p.assignedStopNumber === 'number' && route[p.assignedStopNumber]?.id === stop.id))
            )
          );

          const jumps = nextActiveIndex !== -1 ? nextActiveIndex + 1 : activeStops.length - currentStop - 1;
          for (let i = 0; i < jumps; i++) dispatch(advanceStop());

          if (isNavigating) {
            dispatch(exitNavigation());
            triggerThemeFx('navigation-end');
          }
        }}
        onNavigate={() => handleNavigate()}
        onExit={() => navigate('/')}
        onStopNavigation={() => {
            dispatch(exitNavigation());
            triggerThemeFx('navigation-end');
        }}
      />

      <RouteWeatherBriefing 
        briefingData={briefingData}
        onDismiss={() => dispatch(dismissBriefing())}
      />
    </div>
  );
};

export default Delivery;