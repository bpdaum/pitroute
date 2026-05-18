"use client";

import { useEffect } from "react";
import { APIProvider, Map, useMap, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { EventItem, getOrgColor } from "./EventCard";

interface Props {
    events: EventItem[];
    onSelectEvent: (event: EventItem) => void;
    userCoords?: { lat: number; lng: number } | null;
    selectedEvent?: EventItem | null;
}

function MapController({ selectedEvent }: { selectedEvent?: EventItem | null }) {
    const map = useMap();
    useEffect(() => {
        if (!map || !selectedEvent || !selectedEvent.latitude || !selectedEvent.longitude) return;
        map.panTo({ lat: selectedEvent.latitude, lng: selectedEvent.longitude });
        map.setZoom(9); // ~50 miles zoom level
    }, [map, selectedEvent]);
    return null;
}

export function EventMap({ events, onSelectEvent, userCoords, selectedEvent }: Props) {
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

    // We must provide an API key. For safety, it should come from env, but we'll accept NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

    const center = userCoords ? userCoords : { lat: 37.5, lng: -95 };
    const zoom = userCoords ? 6 : 4;

    if (!apiKey) {
        return (
            <div className="h-full p-4 flex items-center justify-center bg-smoke rounded-xl border border-ash text-[#A0A0A0] font-sans">
                <p>Please configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to view the map.</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full">
            <div className="h-full w-full overflow-hidden bg-smoke">
                <APIProvider apiKey={apiKey}>
                    <Map
                        defaultCenter={center}
                        defaultZoom={zoom}
                        mapId="pitroute-map"
                        disableDefaultUI={true}
                        zoomControl={true}
                    >
                        <MapController selectedEvent={selectedEvent} />

                        {/* User location pin */}
                        {userCoords && (
                            <AdvancedMarker position={userCoords} zIndex={100}>
                                <div className="text-2xl drop-shadow-md">📍</div>
                            </AdvancedMarker>
                        )}

                        {/* Event markers */}
                        {mappable.map(event => {
                            const isSelected = selectedEvent?.id === event.id;
                            const color = getOrgColor(event.organization.name);
                            return (
                                <AdvancedMarker
                                    key={event.id}
                                    position={{ lat: event.latitude!, lng: event.longitude! }}
                                    zIndex={isSelected ? 50 : 10}
                                    onClick={() => onSelectEvent(event)}
                                >
                                    <Pin
                                        background={color}
                                        borderColor={isSelected ? "#ffffff" : color}
                                        glyphColor={isSelected ? "#ffffff" : "transparent"}
                                        scale={isSelected ? 1.2 : 0.8}
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
