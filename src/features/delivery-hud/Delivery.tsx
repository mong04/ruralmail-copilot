// src/features/delivery-hud/Delivery.tsx
import React, { useCallback, useEffect, useRef } from 'react';
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
  selectDynamicHudAlert
} from './hudSlice';
import { type Stop } from '../../db';
import { showNotification } from '../notification/notificationSlice';
import { markPackagesDelivered } from '../package-management/packageSlice';
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
    isNavigating,
    navigationData,
    navigationStepIndex,
  } = hud;

  // A ref to store a stop that has just been geocoded and is ready for navigation.
  const pendingNavigationTarget = useRef<Stop | null>(null);

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

  // Ref to prevent re-checking on every render
  const lastCheckedPosition = useRef<{ lat: number; lng: number } | null>(null);

  // Effect to check for navigation step advancement
  useEffect(() => {
    if (!isNavigating || !position || !navigationData) return;

    // Avoid re-calculating if position hasn't changed
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

    // Ensure the next step and its location exist before calculating distance.
    if (!currentStep || !nextStep || !nextStep.location) return; // End of the route or invalid next step

    const userPoint: [number, number] = [position.lng, position.lat];
    const nextManeuverPoint = nextStep.location;

    // Calculate distance in meters
    const distanceToNextManeuver = distance(userPoint, nextManeuverPoint, { units: 'meters' });

    // If user is within 20 meters of the next turn, advance the step
    if (distanceToNextManeuver < 20) {
      dispatch(advanceNavigationStep());
    }
  }, [position, isNavigating, navigationData, navigationStepIndex, dispatch]);

  // Watch geolocation
  useEffect(() => {
    if ('geolocation' in navigator) {
      // We only need to get the position once to fetch weather.
      // watchPosition is better for continuous tracking on the map.
      const watcher = navigator.geolocation.watchPosition( 
        (pos) => {
          const { latitude, longitude, heading } = pos.coords;
          const newPosition: { lat: number; lng: number; heading?: number } = {
            lat: latitude,
            lng: longitude,
          };

          // Only include heading if it's a valid number provided by the device
          if (typeof heading === 'number' && !isNaN(heading)) {
            newPosition.heading = heading;
          }
          dispatch(updatePosition(newPosition));

          // Fetch weather only if we don't have it and are not currently loading it.
          // We only want to fetch if the status is 'idle'.
          if (status === 'idle') {
            dispatch(fetchForecast(newPosition));
            dispatch(fetchSevereAlerts(newPosition));
          }
        },
        () => { // Removed 'err' as it was unused
          dispatch(showNotification({
            type: 'error',
            message: 'Geolocation failed',
            description: 'Please enable location permissions to use navigation and weather features.',
          }));
        },
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watcher);
    } else {
      dispatch(showNotification({
        type: 'error',
        message: 'Geolocation Not Supported',
        description: 'Your browser does not support geolocation.',
      }));
    }
  }, [dispatch, status]); // Dependency is now on status

  // Wrap handleNavigate in useCallback to stabilize its reference for use in effects.
  const handleNavigate = useCallback((stopToNavigate?: Stop) => {
    // Use the provided stop, or fall back to the current active stop from state.
    const stop = stopToNavigate || activeStops[currentStop];

    if (!stop) {
      dispatch(showNotification({
        type: 'warning',
        message: 'No Stop Selected',
        description: 'There is no active stop to navigate to.',
      }));
      return;
    }

    // If the stop doesn't have coordinates, geocode it first.
    if (!stop.lat || !stop.lng) {
      pendingNavigationTarget.current = stop; // Set this stop as our pending target
      dispatch(showNotification({ type: 'info', message: `Geocoding ${stop.address_line1}...`}));
      dispatch(geocodeStop(stop)).then(action => {
        if (geocodeStop.fulfilled.match(action)) {
          // Update the stop in the main route state
          const stopIndex = route.findIndex(s => s.id === action.payload.id);
          if (stopIndex !== -1) {
            dispatch(updateStop({ index: stopIndex, stop: action.payload }));
          }
        }
      });
    } else {
      // The stop already has coordinates, so we can navigate immediately.
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
          // Only pass the 'end' parameter. The thunk gets the start position from state.
          dispatch(fetchDirections({ end: { location: [lng, lat] } }));
          break;
      }
    }
  }, [activeStops, currentStop, dispatch, route, settings.preferredNavApp]);

  // This effect runs after a stop has been successfully geocoded.
  // If the geocoded stop matches our pending navigation target, we proceed with navigation.
  useEffect(() => {
    if (pendingNavigationTarget.current && routeState.loading === false) {
      const freshlyGeocodedStop = route.find(s => s.id === pendingNavigationTarget.current?.id);
      if (freshlyGeocodedStop && freshlyGeocodedStop.lat && freshlyGeocodedStop.lng) {
        // The stop now has coordinates, proceed with navigation.
        handleNavigate(freshlyGeocodedStop); 
      }
    }
  }, [route, routeState.loading, handleNavigate]);

  return (
    <div className="z-30 h-screen w-screen flex flex-col overflow-hidden">
      {/* Our new, non-obtrusive notification banner */}
      <HudBanner />

      <div className="grow relative">
        <DeliveryMap
          route={activeStops}
          fullRoute={route}
          packages={packages}
          currentStopIndex={currentStop}
          voiceEnabled={voiceEnabled}
          position={position}
          mapStyle={mapStyle}
          cameraMode={cameraMode}
        >
          {/* Absolutely position the NavigationPanel at the top-center. */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
            <NavigationPanel />
          </div>
          
          {/* 
            Absolutely position the LookAheadWidget in the top-right.
            When navigating, it moves down to avoid the NavigationPanel.
            The transition-all and duration classes ensure a smooth animation.
          */}
          <div className={`absolute right-4 z-10 pointer-events-auto transition-all duration-300 ease-in-out ${isNavigating ? 'top-24' : 'top-20'}`}>
            <LookAheadWidget lookAheadData={lookAheadData} status={status} />
          </div>

          {/* Absolutely position MapControls in the bottom-right, above the HUD panel. */}
          <div className="absolute bottom-4 right-4 z-10 pointer-events-auto">
            <MapControls />
          </div>
        </DeliveryMap>
      </div>

      <DeliveryHUDPanel
        currentStop={currentStop}
        route={activeStops}
        fullRoute={route}
        packages={packages}
        isNavigating={isNavigating}
        hudAlertData={hudAlertData} // Pass new data down
        onAdvanceStop={() => dispatch(advanceStop())}
        onMarkDelivered={() => {
          // This handler is specifically for the "Delivered" button.
          const stopId = activeStops[currentStop]?.id;
          if (stopId) {
            // If navigating while marking delivered, exit navigation.
            if (isNavigating) {
              dispatch(exitNavigation());
            }
            // Show success and mark packages as delivered.
            dispatch(showNotification({
              type: 'success',
              message: 'Packages marked as delivered!',
            }));
            dispatch(markPackagesDelivered({ stopId }));
          }
          // Finally, advance to the next stop.
          dispatch(advanceStop());
        }}
        onNavigate={() => handleNavigate()}
        onExit={() => navigate('/')}
        onStopNavigation={() => dispatch(exitNavigation())}
      />

      <RouteWeatherBriefing 
        briefingData={briefingData}
        onDismiss={() => dispatch(dismissBriefing())}
      />

    </div>
  );
};

export default Delivery;