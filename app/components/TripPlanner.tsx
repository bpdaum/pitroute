"use client";

import { useState } from "react";
import { getOrgColor, OrgBadge } from "./EventCard";
import type { EventItem } from "./EventCard";

interface RecommendedStop {
    event: EventItem & { latitude: number; longitude: number };
    driveFromPrevMiles: number;
    driveFromPrevHours: number;
    dayOfTrip: number;
    arrivalDate: string;
}

interface TripResult {
    stops: RecommendedStop[];
    totalMiles: number;
    totalDriveHours: number;
    returnMiles: number;
    returnHours: number;
    tripDays: number;
    maxOneWayMiles: number;
    totalReachableCount: number;
}

const TRIP_PRESETS = [
    { label: "Day Trip", days: 1, icon: "☀️", desc: "1 day" },
    { label: "Weekend", days: 3, icon: "⚡", desc: "3 days" },
    { label: "Long Weekend", days: 5, icon: "🔥", desc: "5 days" },
    { label: "Full Week", days: 7, icon: "💪", desc: "7 days" },
    { label: "Two Weeks", days: 14, icon: "🏆", desc: "14 days" },
];

function formatHours(h: number) {
    if (h < 1) return `${Math.round(h * 60)}m`;
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

interface Props {
    onRouteGenerated: (stops: RecommendedStop[]) => void;
    onSelectEvent: (e: EventItem) => void;
    onUserCoordsChange: (coords: { lat: number; lng: number } | null) => void;
}

export function TripPlanner({ onRouteGenerated, onSelectEvent, onUserCoordsChange }: Props) {
    const [locationQuery, setLocationQuery] = useState("");
    const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; label: string } | null>(null);
    const [tripDayIdx, setTripDayIdx] = useState(1); // default: Weekend
    const [loading, setLoading] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);
    const [result, setResult] = useState<TripResult | null>(null);
    const [error, setError] = useState("");

    const tripPreset = TRIP_PRESETS[tripDayIdx];

    async function geocodeLocation(query: string) {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("Location not found");
        return res.json() as Promise<{ lat: number; lng: number; displayName: string }>;
    }

    async function handleGeolocate() {
        setGeoLoading(true);
        setError("");
        navigator.geolocation.getCurrentPosition(
            pos => {
                const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: "Your location" };
                setUserCoords(coords);
                onUserCoordsChange(coords);
                setGeoLoading(false);
            },
            () => {
                setError("Could not get location. Try entering a city or zip code.");
                setGeoLoading(false);
            }
        );
    }

    async function handleLocationSearch() {
        if (!locationQuery.trim()) return;
        setGeoLoading(true);
        setError("");
        try {
            const geo = await geocodeLocation(locationQuery);
            setUserCoords({ lat: geo.lat, lng: geo.lng, label: locationQuery });
        } catch {
            setError("Couldn't find that location. Try a city name or zip code.");
        }
        setGeoLoading(false);
    }

    async function planTrip(coords = userCoords) {
        if (!coords) return;
        setLoading(true);
        setError("");
        setResult(null);
        try {
            const url = `/api/recommend?lat=${coords.lat}&lng=${coords.lng}&days=${tripPreset.days}`;
            const res = await fetch(url);
            const data: TripResult = await res.json();
            setResult(data);
            onRouteGenerated(data.stops);
        } catch {
            setError("Failed to generate route. Please try again.");
        }
        setLoading(false);
    }

    async function handleSearchAndPlan() {
        setGeoLoading(true);
        setError("");
        try {
            const geo = await geocodeLocation(locationQuery);
            const coords = { lat: geo.lat, lng: geo.lng, label: locationQuery };
            setUserCoords(coords);
            onUserCoordsChange(coords);
            setGeoLoading(false);
            await planTrip(coords);
        } catch {
            setError("Couldn't find that location.");
            setGeoLoading(false);
        }
    }

    // ─── HERO (no result yet) ─────────────────────────────────────────────────
    if (!result) {
        return (
            <div className="flex flex-col items-center justify-center h-full px-8 py-12 text-center max-w-lg mx-auto">
                <div className="text-7xl mb-5 select-none animate-bounce">🔥</div>
                <h2 className="text-4xl font-bebas tracking-widest text-white mb-2">Plan Your BBQ Trip</h2>
                <p className="text-zinc-400 text-sm mb-10 max-w-sm">
                    Tell us where you&apos;re starting from and how much time you have — we&apos;ll build your perfect competition route.
                </p>

                <div className="w-full space-y-4">
                    {/* Location row */}
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5 text-left">
                            Starting location
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={locationQuery}
                                onChange={e => setLocationQuery(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleSearchAndPlan()}
                                placeholder="City, state, or zip code…"
                                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
                            />
                            <button
                                onClick={handleGeolocate}
                                disabled={geoLoading}
                                title="Use my location"
                                className="bg-zinc-800 border border-zinc-700 hover:border-orange-500 text-zinc-400 hover:text-orange-400 rounded-xl px-3.5 transition-all"
                            >
                                {geoLoading ? "…" : "📍"}
                            </button>
                        </div>
                        {userCoords && (
                            <p className="text-[11px] text-emerald-500 mt-1 text-left">✓ {userCoords.label}</p>
                        )}
                    </div>

                    {/* Trip length */}
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5 text-left">
                            How long can you go?
                        </label>
                        <div className="grid grid-cols-5 gap-1.5">
                            {TRIP_PRESETS.map((p, i) => (
                                <button
                                    key={p.label}
                                    onClick={() => setTripDayIdx(i)}
                                    className={`flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl border text-xs font-medium transition-all ${i === tripDayIdx
                                        ? "bg-orange-500 border-orange-500 text-white"
                                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
                                        }`}
                                >
                                    <span className="text-base">{p.icon}</span>
                                    <span className="leading-tight text-center" style={{ fontSize: "10px" }}>{p.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Start date removed — API now auto-finds next available */}

                    {error && <p className="text-red-400 text-xs text-left">{error}</p>}

                    {/* CTA */}
                    <button
                        onClick={handleSearchAndPlan}
                        disabled={loading || geoLoading || !locationQuery.trim()}
                        className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-bold rounded-xl py-3.5 text-base tracking-wide transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <span className="animate-pulse">Building your route…</span>
                        ) : (
                            <><span>🗺</span> Build My Route</>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // ─── ITINERARY RESULT ─────────────────────────────────────────────────────
    const { stops, totalMiles, totalDriveHours, returnMiles, returnHours } = result;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Trip summary header */}
            <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-950 shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <p className="text-xs text-zinc-500">
                            Trip from <span className="text-zinc-300 font-medium">{userCoords?.label}</span>
                            {" "}· {tripPreset.label}
                            {stops.length > 0 && <> · first event {new Date(stops[0].arrivalDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>}
                        </p>
                    </div>
                    <button
                        onClick={() => { setResult(null); onRouteGenerated([]); onUserCoordsChange(null); }}
                        className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                    >
                        ← New trip
                    </button>
                </div>
                {stops.length > 0 ? (
                    <div className="flex gap-4 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xl font-bebas tracking-wider text-white">{stops.length}</span>
                            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">stops this trip</span>
                        </div>
                        <div className="w-px bg-zinc-800" />
                        <div className="flex items-center gap-1.5">
                            <span className="text-xl font-bebas tracking-wider text-white">{totalMiles.toLocaleString()}</span>
                            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">total miles</span>
                        </div>
                        <div className="w-px bg-zinc-800" />
                        <div className="flex items-center gap-1.5">
                            <span className="text-xl font-bebas tracking-wider text-white">{formatHours(totalDriveHours)}</span>
                            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">driving</span>
                        </div>
                        {result.totalReachableCount > stops.length && (
                            <>
                                <div className="w-px bg-zinc-800" />
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xl font-bebas tracking-wider text-orange-400">{result.totalReachableCount}</span>
                                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider">events within {result.maxOneWayMiles}mi (6 mo)</span>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-zinc-500">No competitions found in this window. Try a longer trip or different start date.</p>
                )}
            </div>

            {/* Itinerary */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
                {stops.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <p className="text-4xl mb-3">🏕️</p>
                        <p className="text-zinc-400 text-sm mb-4">No competitions found within this timeframe.</p>
                        <button
                            onClick={() => { setResult(null); onRouteGenerated([]); }}
                            className="text-orange-400 text-sm hover:underline"
                        >
                            Try different dates →
                        </button>
                    </div>
                ) : (
                    <div className="space-y-0">
                        {/* Start node */}
                        <StartNode label={userCoords?.label ?? "Start"} />

                        {stops.map((stop, i) => (
                            <div key={stop.event.id}>
                                {/* Drive connector */}
                                <DriveConnector miles={stop.driveFromPrevMiles} hours={stop.driveFromPrevHours} />

                                {/* Event stop */}
                                <StopCard
                                    stop={stop}
                                    index={i + 1}
                                    onClick={() => onSelectEvent(stop.event as unknown as EventItem)}
                                />
                            </div>
                        ))}

                        {/* Return home */}
                        <DriveConnector miles={returnMiles} hours={returnHours} isReturn />
                        <EndNode label={userCoords?.label ?? "Home"} />
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function StartNode({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-zinc-700 border-2 border-zinc-500 flex items-center justify-center text-lg shrink-0">
                📍
            </div>
            <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Starting from</p>
                <p className="text-sm font-semibold text-zinc-200">{label}</p>
            </div>
        </div>
    );
}

function EndNode({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-zinc-700 border-2 border-zinc-500 flex items-center justify-center text-lg shrink-0">
                🏠
            </div>
            <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Return to</p>
                <p className="text-sm font-semibold text-zinc-200">{label}</p>
            </div>
        </div>
    );
}

function DriveConnector({ miles, hours, isReturn }: { miles: number; hours: number; isReturn?: boolean }) {
    return (
        <div className="flex items-center gap-3 my-1">
            {/* Vertical line */}
            <div className="w-10 flex justify-center">
                <div className="w-0.5 h-8 bg-zinc-700 relative">
                    <div
                        className="absolute inset-0 bg-gradient-to-b from-orange-500/50 to-orange-500/10"
                        style={{ opacity: isReturn ? 0.4 : 1 }}
                    />
                </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-600">
                <span className="text-zinc-500">🚗</span>
                <span>{miles.toLocaleString()} mi</span>
                <span>·</span>
                <span>{formatHours(hours)}</span>
                {isReturn && <span className="text-zinc-700">(return)</span>}
            </div>
        </div>
    );
}

function StopCard({ stop, index, onClick }: { stop: RecommendedStop; index: number; onClick: () => void }) {
    const color = getOrgColor(stop.event.organization.name);
    const date = new Date(stop.arrivalDate);
    const dateStr = date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

    return (
        <div
            onClick={onClick}
            className="flex items-start gap-3 cursor-pointer group"
        >
            {/* Index bubble */}
            <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border-2 transition-transform group-hover:scale-105"
                style={{ background: color + "22", borderColor: color, color }}
            >
                {index}
            </div>

            {/* Card */}
            <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 group-hover:border-zinc-600 group-hover:bg-zinc-800 transition-all p-4 mb-0">
                <div className="flex items-start justify-between gap-2">
                    <OrgBadge name={stop.event.organization.name} />
                    <span className="text-[10px] text-zinc-600 shrink-0">{dateStr}</span>
                </div>
                <p className="text-sm font-semibold text-zinc-100 mt-1.5 leading-tight">{stop.event.name}</p>
                {stop.event.locationAddress && (
                    <p className="text-xs text-zinc-500 mt-1 truncate">📍 {stop.event.locationAddress}</p>
                )}
                {stop.event.purseAmount && (
                    <p className="text-xs text-emerald-400 font-bold mt-1">💰 ${stop.event.purseAmount.toLocaleString()} purse</p>
                )}
                {stop.event.detailsUrl && (
                    <a
                        href={stop.event.detailsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="mt-2 inline-block text-xs text-orange-400 hover:text-orange-300 transition-colors"
                    >
                        View details →
                    </a>
                )}
            </div>
        </div>
    );
}
