"use client";

import { useEffect, useState, useMemo } from "react";
import { APIProvider, Map, useMap, useMapsLibrary, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { EventItem, getOrgColor, OrgBadge } from "./EventCard";

interface RouteStop {
    event: { latitude: number; longitude: number; id: string };
}

interface Props {
    events: EventItem[];
    onSelectEvent: (event: EventItem) => void;
    routeStops?: RouteStop[];
    userCoords?: { lat: number; lng: number } | null;
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

    useEffect(() => {
        if (!routesLibrary || !map) return;
        setDirectionsService(new routesLibrary.DirectionsService());
        // Configure renderer to NOT show default markers since we draw our own
        setDirectionsRenderer(new routesLibrary.DirectionsRenderer({
            map,
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: "#FF5C00",
                strokeWeight: 4,
                strokeOpacity: 0.8
            }
        }));
    }, [routesLibrary, map]);

    useEffect(() => {
        if (!directionsService || !directionsRenderer || !userCoords || !routeStops || routeStops.length === 0) {
            if (directionsRenderer) directionsRenderer.setDirections(null);
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
            directionsRenderer.setDirections(response);

            // Extract total time and distance
            if (response.routes && response.routes.length > 0) {
                const route = response.routes[0];
                let totalSeconds = 0;
                let totalMeters = 0;
                route.legs.forEach(leg => {
                    totalSeconds += leg.duration?.value || 0;
                    totalMeters += leg.distance?.value || 0;
                });
                onRouteCalculated({ totalSeconds, totalMeters });
            }

        }).catch(e => {
            console.error("Directions request failed", e);
        });

    }, [directionsService, directionsRenderer, userCoords, routeStops, onRouteCalculated]);

    return null;
}

export function EventMap({ events, onSelectEvent, routeStops, userCoords }: Props) {
    const [routeMeta, setRouteMeta] = useState<RouteMeta | null>(null);
    const mappable = events.filter(e => e.latitude && e.longitude);
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
