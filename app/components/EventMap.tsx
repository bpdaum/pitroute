"use client";

import { useEffect, useState, useRef } from "react";
import { APIProvider, Map, useMap, useMapsLibrary, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { EventItem, getOrgColor, OrgBadge } from "./EventCard";

interface RouteStop {
    event: EventItem & { latitude: number; longitude: number };
    driveFromPrevMiles?: number;
    driveFromPrevHours?: number;
}

interface Props {
    events: EventItem[];
    onSelectEvent: (event: EventItem) => void;
    routeStops?: RouteStop[];
    userCoords?: { lat: number; lng: number } | null;
    totalPurse?: number;
    onPlanCook?: (event: EventItem) => void;
}

interface RouteMeta {
    totalSeconds: number;
    totalMeters: number;
}

function Directions({ routeStops, userCoords, onRouteCalculated }: { routeStops?: RouteStop[], userCoords?: { lat: number; lng: number } | null, onRouteCalculated: (meta: RouteMeta) => void }) {
    const map = useMap();
    const routesLibrary = useMapsLibrary('routes');
    const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
    const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
    const polylinesRef = useRef<google.maps.Polyline[]>([]);

    // A vivid palette of colors to cycle through for each leg of the trip
    const LEG_COLORS = ["#EC4899", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#14B8A6"];

    useEffect(() => {
        if (!routesLibrary || !map) return;
        setDirectionsService(new routesLibrary.DirectionsService());
        // Configure renderer to NOT show default markers OR the default single-color line
        setDirectionsRenderer(new routesLibrary.DirectionsRenderer({
            map,
            suppressMarkers: true,
            suppressPolylines: true, // We will draw our own multi-colored lines
        }));
    }, [routesLibrary, map]);

    useEffect(() => {
        if (!directionsService || !directionsRenderer || !userCoords || !routeStops || routeStops.length === 0) {
            if (directionsRenderer) directionsRenderer.setMap(null);
            return;
        }

        const waypoints = routeStops.map(stop => ({
            location: new google.maps.LatLng(stop.event.latitude, stop.event.longitude),
            stopover: true
        }));

        directionsService.route({
            origin: userCoords,
            destination: userCoords, // Round trip
            waypoints: waypoints,
            travelMode: google.maps.TravelMode.DRIVING,
            optimizeWaypoints: false, // We've already optimized the order!
        }).then(response => {
            directionsRenderer.setMap(map);
            directionsRenderer.setDirections(response);

            // Clear any previously painted polylines before drawing new ones
            polylinesRef.current.forEach(poly => poly.setMap(null));
            polylinesRef.current = [];

            // Extract sequence data and draw custom multi-colored legs
            if (response.routes && response.routes.length > 0) {
                const route = response.routes[0];
                let totalSeconds = 0;
                let totalMeters = 0;

                route.legs.forEach((leg, index) => {
                    // Accumulate meta info
                    totalSeconds += leg.duration?.value || 0;
                    totalMeters += leg.distance?.value || 0;

                    // Extract all coordinates in this specific leg
                    const legPath: google.maps.LatLng[] = [];
                    leg.steps.forEach(step => {
                        step.path.forEach(point => legPath.push(point));
                    });

                    // Determine repeating color for the leg
                    const color = LEG_COLORS[index % LEG_COLORS.length];

                    // Draw the custom leg
                    const polyline = new google.maps.Polyline({
                        path: legPath,
                        strokeColor: color,
                        strokeWeight: 5,
                        strokeOpacity: 0.9,
                        map: map
                    });

                    polylinesRef.current.push(polyline);
                });

                onRouteCalculated({ totalSeconds, totalMeters });
            }

        }).catch(e => {
            console.error("Directions request failed", e);
        });

        // Cleanup function for when component unmounts or inputs change
        return () => {
            polylinesRef.current.forEach(poly => poly.setMap(null));
        };

    }, [directionsService, directionsRenderer, userCoords, routeStops, onRouteCalculated, map]);

    return null;
}

export function EventMap({ events, onSelectEvent, routeStops, userCoords, totalPurse, onPlanCook }: Props) {
    const [routeMeta, setRouteMeta] = useState<RouteMeta | null>(null);
    const rawMappable = events.filter(e => e.latitude && e.longitude);

    // Group identical coordinates to offset markers so they don't overlap completely
    const groupedByLocation: Record<string, typeof rawMappable> = {};
    rawMappable.forEach(e => {
        const key = `${e.latitude},${e.longitude}`;
        if (!groupedByLocation[key]) groupedByLocation[key] = [];
        groupedByLocation[key].push(e);
    });

    const mappable: typeof rawMappable = [];
    Object.values(groupedByLocation).forEach((eventsAtLoc) => {
        if (eventsAtLoc.length === 1) {
            mappable.push(eventsAtLoc[0]);
        } else {
            const total = eventsAtLoc.length;
            const RADIUS_DEG = 0.00015; // ~50 feet offset
            eventsAtLoc.forEach((e, i) => {
                const angle = (Math.PI * 2 * i) / total;
                mappable.push({
                    ...e,
                    latitude: e.latitude! + Math.cos(angle) * RADIUS_DEG,
                    longitude: e.longitude! + Math.sin(angle) * RADIUS_DEG,
                });
            });
        }
    });
    const routeEventIds = new Set(routeStops?.map(s => s.event.id) ?? []);

    // We must provide an API key. For safety, it should come from env, but we'll accept NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

    const center = userCoords ? userCoords : { lat: 37.5, lng: -95 };
    const zoom = userCoords ? 6 : 4;

    if (!apiKey) {
        return (
            <div className="h-full p-4 flex items-center justify-center bg-zinc-900 rounded-xl border border-zinc-800 text-zinc-500">
                <p>Please configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to view the map.</p>
            </div>
        );
    }

    return (
        <div className="h-full p-4">
            <div className="h-full w-full rounded-xl overflow-hidden border border-zinc-800">
                <APIProvider apiKey={apiKey}>
                    <Map
                        defaultCenter={center}
                        defaultZoom={zoom}
                        mapId="pitroute-map"
                        disableDefaultUI={true}
                        zoomControl={true}
                    >
                        <Directions routeStops={routeStops} userCoords={userCoords} onRouteCalculated={setRouteMeta} />

                        {/* Floating overlay for route data */}
                        {routeStops && routeStops.length > 0 && routeMeta && (
                            <div className="absolute top-4 left-4 z-10 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-xl p-4 shadow-xl text-xs w-64">
                                <h3 className="uppercase tracking-widest text-[10px] text-zinc-500 font-bold mb-3">Trip Overview</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center bg-zinc-950 p-2 rounded-lg border border-zinc-800/60">
                                        <span className="text-zinc-400">Total Stops</span>
                                        <span className="text-white font-bold">{routeStops.length}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-zinc-950 p-2 rounded-lg border border-zinc-800/60">
                                        <span className="text-zinc-400">Total Distance</span>
                                        <span className="text-white font-bold">{Math.round(routeMeta.totalMeters * 0.000621371).toLocaleString()} mi</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-zinc-950 p-2 rounded-lg border border-zinc-800/60">
                                        <span className="text-zinc-400">Total Driving</span>
                                        <span className="text-orange-400 font-bold">
                                            {Math.floor(routeMeta.totalSeconds / 3600)}h {Math.round((routeMeta.totalSeconds % 3600) / 60)}m
                                        </span>
                                    </div>
                                    {totalPurse !== undefined && totalPurse > 0 && (
                                        <div className="flex justify-between items-center bg-zinc-950 p-2 rounded-lg border border-zinc-800/60 mt-2">
                                            <span className="text-zinc-400">Total Purse</span>
                                            <span className="text-emerald-400 font-bold">
                                                ${totalPurse.toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <h3 className="uppercase tracking-widest text-[10px] text-zinc-500 font-bold mb-3 mt-4 border-t border-zinc-800 pt-3">Trip Stops</h3>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                    {routeStops.map((stop, i) => (
                                         <div key={stop.event.id} className="flex justify-between items-center p-2 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-zinc-700 cursor-pointer" onClick={() => onSelectEvent(stop.event)}>
                                            <span className="text-white text-[11px] truncate max-w-[140px] pr-2" title={stop.event.name}>{stop.event.name}</span>
                                            {onPlanCook && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); onPlanCook(stop.event); }}
                                                    className="text-orange-400 text-[10px] uppercase tracking-widest hover:text-orange-300 font-bold px-2 py-1 bg-orange-500/10 rounded-md shrink-0"
                                                >
                                                    Plan
                                                </button>
                                            )}
                                         </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* User location pin */}
                        {userCoords && (
                            <AdvancedMarker position={userCoords} zIndex={100}>
                                <div className="text-2xl drop-shadow-md">📍</div>
                            </AdvancedMarker>
                        )}

                        {/* Event markers */}
                        {mappable.map(event => {
                            const isOnRoute = routeEventIds.has(event.id);
                            const color = getOrgColor(event.organization.name);
                            // To attach a popup, we usually manage an InfoWindow, but for simplicity
                            // we'll trigger the onSelectEvent (which opens the right sidebar) instead
                            // of a map popup to keep UI consistent and clean.
                            return (
                                <AdvancedMarker
                                    key={event.id}
                                    position={{ lat: event.latitude!, lng: event.longitude! }}
                                    zIndex={isOnRoute ? 50 : 10}
                                    onClick={() => onSelectEvent(event)}
                                >
                                    <Pin
                                        background={color}
                                        borderColor={isOnRoute ? "#ffffff" : color}
                                        glyphColor={isOnRoute ? "#ffffff" : "transparent"}
                                        scale={isOnRoute ? 1.2 : 0.8}
                                    />
                                </AdvancedMarker>
                            );
                        })}
                    </Map>
                </APIProvider>
            </div>
        </div>
    );
}
