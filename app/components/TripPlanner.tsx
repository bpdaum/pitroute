"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
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
    totalPurse: number;
}



function formatHours(h: number) {
    if (h < 1) return `${Math.round(h * 60)}m`;
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

interface Props {
    onRouteGenerated: (stops: RecommendedStop[], purse: number) => void;
    onSelectEvent: (e: EventItem) => void;
    onUserCoordsChange: (coords: { lat: number; lng: number } | null) => void;
}

export function TripPlanner({ onRouteGenerated, onSelectEvent, onUserCoordsChange }: Props) {
    const [locationQuery, setLocationQuery] = useState("");
    const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; label: string } | null>(null);
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        return d.toISOString().split("T")[0];
    });
    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        return d.toISOString().split("T")[0];
    });
    const [maxDistance, setMaxDistance] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);
    const [result, setResult] = useState<TripResult | null>(null);
    const [error, setError] = useState("");
    const { data: session } = useSession();
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

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
            let url = `/api/recommend?lat=${coords.lat}&lng=${coords.lng}&startDate=${startDate}&endDate=${endDate}`;
            if (maxDistance) {
                url += `&maxDistance=${maxDistance}`;
            }
            const res = await fetch(url);
            const data: TripResult = await res.json();
            setResult(data);
            onRouteGenerated(data.stops, data.totalPurse);
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

    const todayString = useMemo(() => {
        return new Date().toISOString().split("T")[0];
    }, []);

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
                            When are you travelling?
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={startDate}
                                min={todayString}
                                onChange={e => setStartDate(e.target.value)}
                                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors"
                            />
                            <span className="flex items-center text-zinc-600 font-bold">→</span>
                            <input
                                type="date"
                                value={endDate}
                                min={startDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Max Travel Distance */}
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5 text-left">
                            Max Travel Distance (One-Way)
                        </label>
                        <div className="flex bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus-within:border-orange-500 transition-colors items-center">
                            <input
                                type="number"
                                value={maxDistance}
                                onChange={e => setMaxDistance(e.target.value)}
                                placeholder="Auto-calculate"
                                className="bg-transparent w-full text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
                                min="1"
                            />
                            <span className="text-zinc-500 text-xs ml-2">Miles</span>
                        </div>
                    </div>

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
    const { stops, totalMiles, totalDriveHours, returnMiles, returnHours, totalPurse } = result;

    async function handleSaveTrip() {
        if (!session?.user) return;
        setIsSaving(true);
        try {
            const res = await fetch("/api/trips", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: `BBQ Trip from ${userCoords?.label}`,
                    routeData: result,
                    totalPurse
                })
            });
            if (res.ok) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            }
        } catch {
            console.error("Failed to save trip");
        } finally {
            setIsSaving(false);
        }
    }

    // ─── ITINERARY TIMELINE CALCULATIONS ──────────────────────────────────────
    const processedStops = stops.reduce((acc, stop, i) => {
        const eventDate = new Date(stop.event.date);

        const idealArrival = new Date(eventDate);
        idealArrival.setDate(idealArrival.getDate() - 1);
        idealArrival.setHours(15, 0, 0, 0);

        const departureTime = new Date(eventDate);
        departureTime.setHours(17, 0, 0, 0);

        const driveTotalMs = stop.driveFromPrevHours * 60 * 60 * 1000;
        let absoluteArrival: Date;
        let driveStartTime: Date;

        if (i === 0) {
            absoluteArrival = idealArrival;
            driveStartTime = new Date(absoluteArrival.getTime() - driveTotalMs);
        } else {
            const prevDeparture = acc[i - 1].absoluteDeparture;
            const earliestActualArrival = new Date(prevDeparture.getTime() + driveTotalMs);

            if (earliestActualArrival.getTime() > idealArrival.getTime()) {
                absoluteArrival = earliestActualArrival;
                driveStartTime = prevDeparture;
            } else {
                absoluteArrival = idealArrival;
                driveStartTime = new Date(absoluteArrival.getTime() - driveTotalMs);
            }
        }

        const stayDurationHours = (departureTime.getTime() - absoluteArrival.getTime()) / (1000 * 60 * 60);

        acc.push({
            ...stop,
            absoluteArrival,
            absoluteDeparture: departureTime,
            driveStartTime,
            stayDurationHours: Math.round(stayDurationHours)
        });

        return acc;
    }, [] as (RecommendedStop & { absoluteArrival: Date; absoluteDeparture: Date; driveStartTime: Date; stayDurationHours: number; })[]);

    // Calculate final return timeline
    let finalReturnArrivalStr = "";
    if (processedStops.length > 0) {
        const finalStop = processedStops[processedStops.length - 1];
        const returnDriveMs = returnHours * 60 * 60 * 1000;
        const returnArrival = new Date(finalStop.absoluteDeparture.getTime() + returnDriveMs);
        finalReturnArrivalStr = returnArrival.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Trip summary header */}
            <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-950 shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <p className="text-xs text-zinc-500">
                            Trip from <span className="text-zinc-300 font-medium">{userCoords?.label}</span>
                            {" "}· {result.tripDays} days
                            {stops.length > 0 && <> · first event {new Date(stops[0].arrivalDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {session?.user && stops.length > 0 && (
                            <button
                                onClick={handleSaveTrip}
                                disabled={isSaving || saveSuccess}
                                className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-all ${saveSuccess ? "bg-emerald-500/20 text-emerald-400" : "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                                    }`}
                            >
                                {saveSuccess ? "✓ Saved" : isSaving ? "Saving..." : "Save Route"}
                            </button>
                        )}
                        <button
                            onClick={() => { setResult(null); onRouteGenerated([], 0); onUserCoordsChange(null); }}
                            className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                        >
                            ← New trip
                        </button>
                    </div>
                </div>
                {stops.length > 0 ? (
                    <div className="flex gap-4 flex-wrap mt-2">
                        {totalPurse > 0 && (
                            <>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xl font-bebas tracking-wider text-emerald-400">
                                        ${totalPurse.toLocaleString()}
                                    </span>
                                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider leading-tight">
                                        potential<br />winnings
                                    </span>
                                </div>
                                <div className="w-px bg-zinc-800 lg:block hidden" />
                            </>
                        )}
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
                            onClick={() => { setResult(null); onRouteGenerated([], 0); }}
                            className="text-orange-400 text-sm hover:underline"
                        >
                            Try different dates →
                        </button>
                    </div>
                ) : (
                    <div className="space-y-0">
                        {/* Start node */}
                        <StartNode
                            label={userCoords?.label ?? "Start"}
                            departureTime={processedStops.length > 0 ? processedStops[0].driveStartTime : undefined}
                        />

                        {processedStops.map((stop, i) => (
                            <div key={stop.event.id}>
                                {/* Drive connector */}
                                <DriveConnector
                                    miles={stop.driveFromPrevMiles}
                                    hours={stop.driveFromPrevHours}
                                    departureTime={stop.driveStartTime}
                                />

                                {/* Event stop */}
                                <StopCard
                                    stop={stop}
                                    index={i + 1}
                                    arrivalTime={stop.absoluteArrival}
                                    departureTime={stop.absoluteDeparture}
                                    stayHours={stop.stayDurationHours}
                                    onClick={() => onSelectEvent(stop.event as unknown as EventItem)}
                                />
                            </div>
                        ))}

                        {/* Return home */}
                        <DriveConnector
                            miles={returnMiles}
                            hours={returnHours}
                            isReturn
                            departureTime={processedStops.length > 0 ? processedStops[processedStops.length - 1].absoluteDeparture : undefined}
                        />
                        <EndNode label={userCoords?.label ?? "Home"} arrivalTimeStr={finalReturnArrivalStr} />
                    </div>
                )}
            </div>
        </div >
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function StartNode({ label, departureTime }: { label: string, departureTime?: Date }) {
    return (
        <div className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-zinc-700 border-2 border-zinc-500 flex items-center justify-center text-lg shrink-0">
                📍
            </div>
            <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">
                    {departureTime ? `Depart ${departureTime.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : "Starting from"}
                </p>
                <p className="text-sm font-semibold text-zinc-200">{label}</p>
            </div>
        </div>
    );
}

function EndNode({ label, arrivalTimeStr }: { label: string, arrivalTimeStr?: string }) {
    return (
        <div className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-zinc-700 border-2 border-zinc-500 flex items-center justify-center text-lg shrink-0">
                🏠
            </div>
            <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">
                    {arrivalTimeStr ? `Arrive ${arrivalTimeStr}` : "Return to"}
                </p>
                <p className="text-sm font-semibold text-zinc-200">{label}</p>
            </div>
        </div>
    );
}

function DriveConnector({ miles, hours, isReturn, departureTime }: { miles: number; hours: number; isReturn?: boolean; departureTime?: Date }) {
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

function formatTime(date: Date) {
    return date.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
}

function StopCard({ stop, index, arrivalTime, departureTime, stayHours, onClick }: { stop: RecommendedStop; index: number; arrivalTime: Date; departureTime: Date; stayHours: number; onClick: () => void }) {
    const color = getOrgColor(stop.event.organization.name);
    const dateStr = new Date(stop.event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });

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

            {/* Card & Timeline Container */}
            <div className="flex flex-col flex-1 mb-0">
                {/* Main Card */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 group-hover:border-zinc-600 group-hover:bg-zinc-800 transition-all p-4 z-10 relative">
                    <div className="flex items-start justify-between gap-2">
                        <OrgBadge name={stop.event.organization.name} />
                        <span className="text-[10px] text-zinc-600 shrink-0 uppercase tracking-widest font-semibold">{dateStr}</span>
                    </div>
                    <p className="text-sm font-semibold text-zinc-100 mt-1.5 leading-tight">{stop.event.name}</p>
                    {stop.event.locationAddress && (
                        <p className="text-xs text-zinc-500 mt-1 truncate">📍 {stop.event.locationAddress}</p>
                    )}
                    {stop.event.purseAmount && (
                        <p className="text-xs text-emerald-400 font-bold mt-1">💰 ${stop.event.purseAmount.toLocaleString()} purse</p>
                    )}
                </div>

                {/* Timeline attached right below card */}
                <div className="flex flex-col pl-4 mt-2">
                    <div className="flex items-start gap-3">
                        {/* Timeline tree graphic */}
                        <div className="flex flex-col items-center mt-1 w-2 border-l-2 border-dashed border-zinc-700 h-full relative ml-2">
                            <div className="absolute -top-1 -left-[5px] w-2 h-2 rounded-full bg-emerald-500"></div>
                            <div className="absolute -bottom-1 -left-[5px] w-2 h-2 rounded-full bg-orange-500"></div>
                        </div>
                        {/* Timeline Details */}
                        <div className="py-1 pb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-emerald-500 text-[10px] uppercase tracking-widest font-bold w-12 text-right">Arrive</span>
                                <span className="text-xs text-zinc-300 font-medium">{formatTime(arrivalTime)}</span>
                                <span className="text-[10px] text-zinc-600">· Set up camp & meat inspection</span>
                            </div>

                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold w-12 text-right">Cook</span>
                                <span className="text-xs text-zinc-400">Overnight cook ({stayHours}h stay)</span>
                            </div>

                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-orange-500 text-[10px] uppercase tracking-widest font-bold w-12 text-right">Depart</span>
                                <span className="text-xs text-zinc-300 font-medium">{formatTime(departureTime)}</span>
                                <span className="text-[10px] text-zinc-600">· Wrap up & head out</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
