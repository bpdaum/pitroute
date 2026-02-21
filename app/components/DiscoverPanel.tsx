"use client";

import { useState, useCallback } from "react";
import { EventItem, EventCard, getOrgColor, OrgBadge } from "./EventCard";

// Haversine distance in miles between two lat/lng points
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 3958.8; // Earth radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Average highway speed: 60 mph
const MPH = 60;

const TRAVEL_OPTIONS = [
    { label: "Day trip", hours: 4, desc: "~4 hrs one-way" },
    { label: "Weekend", hours: 8, desc: "~8 hrs one-way" },
    { label: "Long weekend", hours: 12, desc: "~12 hrs one-way" },
    { label: "Week", hours: 24, desc: "~24 hrs one-way" },
    { label: "Any distance", hours: 999, desc: "Show all events" },
];

interface EventWithDistance extends EventItem {
    distanceMiles: number;
}

interface Props {
    allEvents: EventItem[];
    onSelectEvent: (e: EventItem) => void;
}

export function DiscoverPanel({ allEvents, onSelectEvent }: Props) {
    const [locationQuery, setLocationQuery] = useState("");
    const [travelIdx, setTravelIdx] = useState(1); // default: Weekend
    const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; label: string } | null>(null);
    const [results, setResults] = useState<EventWithDistance[]>([]);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState("");
    const [orgFilter, setOrgFilter] = useState<string[]>([]);

    const travelOption = TRAVEL_OPTIONS[travelIdx];
    const maxMiles = travelOption.hours * MPH;

    async function geolocateMe() {
        setSearching(true);
        setError("");
        navigator.geolocation.getCurrentPosition(
            async pos => {
                const { latitude: lat, longitude: lng } = pos.coords;
                setUserCoords({ lat, lng, label: "Your location" });
                computeResults(lat, lng);
                setSearching(false);
            },
            () => {
                setError("Could not get your location. Enter a city or zip code instead.");
                setSearching(false);
            }
        );
    }

    async function searchLocation() {
        if (!locationQuery.trim()) return;
        setSearching(true);
        setError("");
        try {
            const res = await fetch(`/api/geocode?q=${encodeURIComponent(locationQuery)}`);
            if (!res.ok) throw new Error("Location not found");
            const data = await res.json();
            setUserCoords({ lat: data.lat, lng: data.lng, label: locationQuery });
            computeResults(data.lat, data.lng);
        } catch {
            setError("Couldn't find that location. Try a city name or zip code.");
        }
        setSearching(false);
    }

    const computeResults = useCallback(
        (lat: number, lng: number) => {
            const now = new Date();
            const withDist: EventWithDistance[] = allEvents
                .filter(e => e.latitude && e.longitude && new Date(e.date) >= now)
                .map(e => ({
                    ...e,
                    distanceMiles: haversine(lat, lng, e.latitude!, e.longitude!),
                }))
                .filter(e => e.distanceMiles <= maxMiles)
                .sort((a, b) => a.distanceMiles - b.distanceMiles);
            setResults(withDist);
        },
        [allEvents, maxMiles]
    );

    // When travel range changes, recompute if we already have a location
    function handleTravelChange(idx: number) {
        setTravelIdx(idx);
        if (userCoords) {
            const opt = TRAVEL_OPTIONS[idx];
            const miles = opt.hours * MPH;
            const now = new Date();
            const withDist: EventWithDistance[] = allEvents
                .filter(e => e.latitude && e.longitude && new Date(e.date) >= now)
                .map(e => ({
                    ...e,
                    distanceMiles: haversine(userCoords.lat, userCoords.lng, e.latitude!, e.longitude!),
                }))
                .filter(e => e.distanceMiles <= miles)
                .sort((a, b) => a.distanceMiles - b.distanceMiles);
            setResults(withDist);
        }
    }

    const displayedResults = orgFilter.length > 0
        ? results.filter(e => orgFilter.includes(e.organization.name))
        : results;

    const orgsInResults = [...new Set(results.map(e => e.organization.name))];

    // ---- Render ----

    if (!userCoords) {
        // Hero / input state
        return (
            <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
                {/* Flame emoji hero */}
                <div className="text-6xl mb-4 select-none">🔥</div>
                <h2 className="text-3xl font-bebas tracking-widest text-white mb-2">Find Your Next Cook</h2>
                <p className="text-zinc-400 text-sm max-w-sm mb-10">
                    Tell us where you are and how far you can travel — we'll show you every BBQ competition within reach.
                </p>

                {/* Location input */}
                <div className="w-full max-w-md space-y-3">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={locationQuery}
                            onChange={e => setLocationQuery(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && searchLocation()}
                            placeholder="City, state, or zip code…"
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
                        />
                        <button
                            onClick={searchLocation}
                            disabled={searching || !locationQuery.trim()}
                            className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-semibold rounded-xl px-5 py-3 text-sm transition-colors"
                        >
                            {searching ? "…" : "Go"}
                        </button>
                    </div>

                    <button
                        onClick={geolocateMe}
                        disabled={searching}
                        className="w-full flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors py-2"
                    >
                        <span>📍</span> Use my current location
                    </button>

                    {error && <p className="text-red-400 text-xs">{error}</p>}

                    {/* Travel time teaser */}
                    <div className="pt-6">
                        <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3">How far can you travel?</p>
                        <div className="flex gap-2 flex-wrap justify-center">
                            {TRAVEL_OPTIONS.map((opt, i) => (
                                <button
                                    key={opt.label}
                                    onClick={() => setTravelIdx(i)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${i === travelIdx
                                            ? "bg-orange-500 border-orange-500 text-white"
                                            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Results state
    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Results header / re-search bar */}
            <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-950 shrink-0">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex gap-2 flex-1 min-w-0">
                        <input
                            type="text"
                            value={locationQuery}
                            onChange={e => setLocationQuery(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && searchLocation()}
                            placeholder="Change location…"
                            className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-orange-500 transition-colors"
                        />
                        <button
                            onClick={searchLocation}
                            disabled={searching}
                            className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold rounded-lg px-4 py-1.5 transition-colors"
                        >
                            {searching ? "…" : "Update"}
                        </button>
                        <button
                            onClick={() => { setUserCoords(null); setResults([]); setOrgFilter([]); }}
                            className="text-zinc-500 hover:text-zinc-300 text-sm px-2 transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Travel toggle */}
                    <div className="flex gap-1 p-0.5 bg-zinc-900 rounded-lg shrink-0">
                        {TRAVEL_OPTIONS.map((opt, i) => (
                            <button
                                key={opt.label}
                                onClick={() => handleTravelChange(i)}
                                title={opt.desc}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${i === travelIdx
                                        ? "bg-orange-500 text-white"
                                        : "text-zinc-500 hover:text-white"
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-zinc-600">
                        <span className="text-orange-400 font-bold">{displayedResults.length}</span> competitions within{" "}
                        {maxMiles >= 9999 ? "any distance" : `${maxMiles.toLocaleString()} miles`} of{" "}
                        <span className="text-zinc-400">{userCoords.label}</span>
                    </p>
                    {/* Org filter pills */}
                    {orgsInResults.length > 1 && (
                        <div className="flex gap-1">
                            {orgsInResults.map(org => {
                                const active = orgFilter.includes(org) || orgFilter.length === 0;
                                const color = getOrgColor(org);
                                return (
                                    <button
                                        key={org}
                                        onClick={() => {
                                            setOrgFilter(prev =>
                                                prev.includes(org) ? prev.filter(o => o !== org) : [...prev, org]
                                            );
                                        }}
                                        className="px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all"
                                        style={{
                                            borderColor: color + (active ? "99" : "33"),
                                            color: active ? color : color + "55",
                                            background: active ? color + "22" : "transparent",
                                        }}
                                    >
                                        {org}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Event list */}
            <div className="flex-1 overflow-y-auto p-4">
                {displayedResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <p className="text-4xl mb-3">🏕️</p>
                        <p className="text-zinc-400 text-sm">No events found within this range.</p>
                        <button
                            onClick={() => handleTravelChange(TRAVEL_OPTIONS.length - 1)}
                            className="mt-3 text-orange-400 text-sm hover:underline"
                        >
                            Show all distances →
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {displayedResults.map(event => (
                            <div key={event.id} onClick={() => onSelectEvent(event)} className="cursor-pointer">
                                <div className="fade-in rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800 transition-all p-4 flex gap-4">
                                    {/* Distance badge */}
                                    <div className="shrink-0 flex flex-col items-center justify-center w-14 text-center">
                                        <span className="text-lg font-bold text-white leading-none">
                                            {Math.round(event.distanceMiles)}
                                        </span>
                                        <span className="text-[9px] text-zinc-600 uppercase tracking-wider">miles</span>
                                    </div>
                                    <div className="w-px bg-zinc-800 shrink-0" />
                                    {/* Event info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <OrgBadge name={event.organization.name} />
                                            {event.purseAmount && (
                                                <span className="text-xs font-bold text-emerald-400">
                                                    ${event.purseAmount.toLocaleString()}
                                                </span>
                                            )}
                                            <span className="ml-auto text-xs text-zinc-500 shrink-0">
                                                {new Date(event.date).toLocaleDateString("en-US", {
                                                    weekday: "short", month: "short", day: "numeric"
                                                })}
                                            </span>
                                        </div>
                                        <p className="text-sm font-semibold text-zinc-100 truncate">{event.name}</p>
                                        {event.locationAddress && (
                                            <p className="text-xs text-zinc-500 mt-0.5 truncate">📍 {event.locationAddress}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
