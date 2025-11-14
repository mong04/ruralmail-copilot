// src/features/delivery-hud/Delivery.tsx
import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store";
import { fetchWeatherAlerts, updatePosition, toggleVoice, advanceStop } from "./hudSlice";
import { markPackagesDelivered } from "../package-management/packageSlice";
import DeliveryMap from "./components/DeliveryMap";
import DeliveryHUDPanel from "./components/DeliveryHUDPanel";
import VoiceToggleButton from "../../components/ui/VoiceToggleButton";
import { useNavigate } from "react-router-dom";

const Delivery: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const routeState = useAppSelector((state) => state.route);
  const packageState = useAppSelector((state) => state.packages);
  const hud = useAppSelector((state) => state.hud);

  const route = routeState.route;                // full Stop[]
  const packages = packageState.packages ?? [];  // Package[]
  const { currentStop, weatherAlerts, position, voiceEnabled } = hud;

  // Active stops: only those with packages
  const activeStops = (route ?? []).filter((stop, idx) =>
    packages.some(
      (pkg) =>
        (pkg.assignedStopId && pkg.assignedStopId === stop.id) ||
        (typeof pkg.assignedStopNumber === "number" && pkg.assignedStopNumber === idx)
    )
  );

  // Poll weather every 15 minutes
  useEffect(() => {
    if (position) {
      dispatch(fetchWeatherAlerts());
      const interval = setInterval(() => {
        dispatch(fetchWeatherAlerts());
      }, 15 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [dispatch, position]);

  // Watch geolocation
  useEffect(() => {
    if ("geolocation" in navigator) {
      const watcher = navigator.geolocation.watchPosition(
        (pos) => {
          dispatch(updatePosition({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }));
        },
        (err) => console.error("Geolocation error:", err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watcher);
    }
  }, [dispatch]);

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      <DeliveryMap
        route={activeStops}          // filtered stops only
        fullRoute={route}            // full route still passed for resolving
        packages={packages}
        currentStop={currentStop}    // index into activeStops now
        voiceEnabled={voiceEnabled}
      />

      <VoiceToggleButton
        enabled={voiceEnabled}
        onToggle={(enabled) => dispatch(toggleVoice(enabled))}
      />

      <DeliveryHUDPanel
        currentStop={currentStop}
        route={activeStops}          // HUD only sees active stops
        packages={packages}
        weatherAlerts={weatherAlerts}
        onAdvanceStop={() => {
          const stopId = activeStops[currentStop]?.id;
          if (stopId) {
            dispatch(markPackagesDelivered({ stopId }));
          }
          dispatch(advanceStop());   // increments index through activeStops
        }}
        onExit={() => navigate('/')}
      />

      <button
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 h-11 px-4 rounded-xl bg-brand text-brand-foreground 
                  hover:bg-brand/90 focus:ring-2 focus:ring-brand shadow-md"
      >
        ← Dashboard
      </button>
    </div>
  );
};

export default Delivery;
