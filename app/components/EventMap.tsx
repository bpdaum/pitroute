"use client";

import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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

// Simple home pin icon
const homeIcon = L.divIcon({
    html: `<div style="font-size:22px;line-height:1;">📍</div>`,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 24],
});

export function EventMap({ events, onSelectEvent, routeStops, userCoords }: Props) {
    const mappable = events.filter(e => e.latitude && e.longitude);

    // Build route polyline coords: user → stops in order
    const routeCoords: [number, number][] = [];
    if (routeStops && routeStops.length > 0 && userCoords) {
        routeCoords.push([userCoords.lat, userCoords.lng]);
        routeStops.forEach(s => routeCoords.push([s.event.latitude, s.event.longitude]));
        routeCoords.push([userCoords.lat, userCoords.lng]); // return
    }

    // Highlighted event IDs (those in the route)
    const routeEventIds = new Set(routeStops?.map(s => s.event.id) ?? []);

    return (
        <div className="h-full p-4">
            <MapContainer
                center={userCoords ? [userCoords.lat, userCoords.lng] : [37.5, -95]}
                zoom={userCoords ? 6 : 4}
                style={{ height: "100%", width: "100%", borderRadius: "12px" }}
                className="z-0"
                key={userCoords ? `${userCoords.lat}-${userCoords.lng}` : "default"}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Route polyline */}
                {routeCoords.length > 1 && (
                    <Polyline
                        positions={routeCoords}
                        pathOptions={{ color: "#FF5C00", weight: 3, opacity: 0.8, dashArray: "8 4" }}
                    />
                )}

                {/* User location pin */}
                {userCoords && (
                    <Marker position={[userCoords.lat, userCoords.lng]} icon={homeIcon} />
                )}

                {/* Event markers */}
                {mappable.map(event => {
                    const isOnRoute = routeEventIds.has(event.id);
                    const color = getOrgColor(event.organization.name);
                    return (
                        <CircleMarker
                            key={event.id}
                            center={[event.latitude!, event.longitude!]}
                            radius={isOnRoute ? 11 : 7}
                            pathOptions={{
                                fillColor: color,
                                fillOpacity: isOnRoute ? 1 : 0.5,
                                color: isOnRoute ? "#fff" : color,
                                weight: isOnRoute ? 2.5 : 1,
                            }}
                            eventHandlers={{ click: () => onSelectEvent(event) }}
                        >
                            <Popup>
                                <div className="text-xs space-y-1">
                                    <OrgBadge name={event.organization.name} />
                                    <p className="font-bold text-white mt-1">{event.name}</p>
                                    <p className="text-zinc-400">
                                        {new Date(event.date).toLocaleDateString("en-US", {
                                            weekday: "short", month: "short", day: "numeric", year: "numeric",
                                        })}
                                    </p>
                                    {event.locationAddress && <p className="text-zinc-500">{event.locationAddress}</p>}
                                    {event.purseAmount && <p className="text-emerald-400 font-bold">${event.purseAmount.toLocaleString()}</p>}
                                    {event.detailsUrl && (
                                        <a href={event.detailsUrl} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">
                                            View details →
                                        </a>
                                    )}
                                </div>
                            </Popup>
                        </CircleMarker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
