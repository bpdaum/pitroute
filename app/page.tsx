"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { EventItem, EventCard } from "./components/EventCard";
import { EventCalendar } from "./components/EventCalendar";
import { AuthWidget } from "./components/AuthWidget";
import { SavedTrips } from "./components/SavedTrips";
import { useSession } from "next-auth/react";

import { EventMap } from "./components/EventMap";
import { Logo } from "./components/Logo";
import { BlackoutDates } from "./components/BlackoutDates";

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type Tab = "list" | "map" | "calendar" | "saved";

const ALL_TABS: { id: Tab; icon: string; label: string, requireAuth?: boolean }[] = [
  { id: "list", icon: "☰", label: "Discover Events" },
  { id: "map", icon: "🗺", label: "Map" },
  { id: "calendar", icon: "📅", label: "Calendar" },
  { id: "saved", icon: "⭐", label: "Saved Trips", requireAuth: true },
];

const ORGANIZATIONS = ["KCBS", "MBN", "SCA", "FBA", "IBCA", "CBA"];
const PURSE_TIERS = [
  { label: "Any Prize", value: 0 },
  { label: "$1,000+", value: 1000 },
  { label: "$5,000+", value: 5000 },
  { label: "$10,000+", value: 10000 },
];

interface RouteStop {
  event: EventItem & { latitude: number; longitude: number };
  driveFromPrevMiles: number;
  driveFromPrevHours: number;
  dayOfTrip: number;
}

export default function Home() {
  const [allEvents, setAllEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("list");
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [routePurse, setRoutePurse] = useState(0);
  const [isGeneratingPath, setIsGeneratingPath] = useState(false);
  const [routeError, setRouteError] = useState("");

  // Global Location State
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number, label?: string } | null>(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [maxDistance, setMaxDistance] = useState<number>(750); // default miles
  const [geoLoading, setGeoLoading] = useState(false);

  // Autocomplete State
  const [suggestions, setSuggestions] = useState<{ lat: number, lng: number, displayName: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);

  // Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [minPurse, setMinPurse] = useState<number>(0);
  const [blackoutDates, setBlackoutDates] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch("/api/events")
      .then(r => r.json())
      .then(d => { setAllEvents(d.events); setLoading(false); });
  }, []);

  // Debounce autocomplete fetch
  useEffect(() => {
    if (!locationQuery.trim() || locationQuery.length < 3) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(locationQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
        }
      } catch (e) { }
    }, 300);
    return () => clearTimeout(timeout);
  }, [locationQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function geocodeLocation(query: string) {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("Location not found");
    return res.json() as Promise<{ lat: number; lng: number; displayName: string }>;
  }

  function handleGeolocate() {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: "Your location" };
        setUserCoords(coords);
        setLocationQuery("Your location");
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
      }
    );
  }

  async function handleLocationSearch() {
    if (!locationQuery.trim()) return;
    setGeoLoading(true);
    try {
      const geo = await geocodeLocation(locationQuery);
      setUserCoords({ lat: geo.lat, lng: geo.lng, label: locationQuery });
    } catch {
      // Silently fail on UI for now
    }
    setGeoLoading(false);
  }

  function toggleEventSelection(id: string) {
    setSelectedEventIds(prev =>
      prev.includes(id) ? prev.filter(eId => eId !== id) : [...prev, id]
    );
  }

  function toggleOrg(org: string) {
    setSelectedOrgs(prev =>
      prev.includes(org) ? prev.filter(o => o !== org) : [...prev, org]
    );
  }

  async function generateRoute() {
    if (!userCoords || selectedEventIds.length === 0) return;
    setIsGeneratingPath(true);
    setRouteError("");
    try {
      const queryParams = new URLSearchParams({
        lat: userCoords.lat.toString(),
        lng: userCoords.lng.toString(),
        maxDistance: maxDistance.toString(),
      });

      // Add all selected required events to the query
      selectedEventIds.forEach(id => queryParams.append('requiredEventIds', id));

      const res = await fetch(`/api/recommend?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Could not route between selected events.");

      const data = await res.json();
      setRouteStops(data.stops);
      setRoutePurse(data.totalPurse);
      setActiveTab("map"); // Navigate to a view where we can render the timeline later
    } catch (e: any) {
      setRouteError(e.message || "Failed to generate route.");
    }
    setIsGeneratingPath(false);
  }

  // Apply filters
  const filteredEvents = useMemo(() => {
    return allEvents.filter(event => {
      // 1. Distance Match
      if (userCoords && event.latitude && event.longitude) {
        const dist = haversine(userCoords.lat, userCoords.lng, event.latitude, event.longitude);
        if (dist > maxDistance) return false;
      }

      // 2. Text Search Match
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = event.name.toLowerCase().includes(query);
        const locMatch = event.locationAddress?.toLowerCase().includes(query) || false;
        if (!nameMatch && !locMatch) return false;
      }

      // 3. Organization Match
      if (selectedOrgs.length > 0 && !selectedOrgs.includes(event.organization.name)) {
        return false;
      }

      // 4. Minimum Prize Match
      if (minPurse > 0) {
        if (!event.purseAmount || event.purseAmount < minPurse) {
          return false;
        }
      }

      // 5. Blackout Dates
      const eventDateStr = event.date.split("T")[0]; // YYYY-MM-DD
      if (blackoutDates.includes(eventDateStr)) {
        return false;
      }

      // 6. Explicit Date Filtering
      const eTime = new Date(eventDateStr).getTime();
      if (startDate && eTime < new Date(startDate).getTime()) return false;
      if (endDate && eTime > new Date(endDate).getTime()) return false;

      return true;
    });
  }, [allEvents, searchQuery, selectedOrgs, minPurse, userCoords, maxDistance, blackoutDates, startDate, endDate]);

  if (!mounted) return <div className="bg-zinc-950 min-h-screen" />;

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] overflow-hidden bg-zinc-950 relative">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex w-[320px] shrink-0 flex-col bg-zinc-900 border-r border-zinc-800 overflow-y-auto">
        <div className="px-5 pt-6 pb-4 border-b border-zinc-800">
          <Logo className="h-10" />
          <p className="text-[10px] text-zinc-600 mt-2 uppercase tracking-widest">BBQ Competition Finder</p>
        </div>



        <nav className="p-3 space-y-1">
          {ALL_TABS.filter(tab => !tab.requireAuth || session?.user).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${activeTab === tab.id
                ? "bg-orange-500 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Global Filters Section */}
        <div className="flex-1 p-4 border-t border-zinc-800 space-y-5 fade-in">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Refine List</h3>

          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search event names…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          {/* Organizations */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Organizations</p>
            <div className="flex flex-wrap gap-1.5">
              {ORGANIZATIONS.map(org => {
                const isActive = selectedOrgs.includes(org);
                return (
                  <button
                    key={org}
                    onClick={() => toggleOrg(org)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wider transition-colors ${isActive
                      ? "bg-zinc-700 text-white"
                      : "bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                      }`}
                  >
                    {org}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Purse */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Minimum Prize</p>
            <select
              value={minPurse}
              onChange={e => setMinPurse(Number(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
            >
              {PURSE_TIERS.map(tier => (
                <option key={tier.value} value={tier.value}>{tier.label}</option>
              ))}
            </select>
          </div>

        </div>

        <div className="p-4 border-t border-zinc-800 shrink-0">
          {loading ? (
            <p className="text-[10px] text-zinc-700 animate-pulse">Loading events…</p>
          ) : (
            <div>
              <p className="text-[10px] text-zinc-500">
                <span className="text-white font-bold">{filteredEvents.length}</span> matches found
              </p>
            </div>
          )}
        </div>
        <AuthWidget />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="px-5 py-2.5 border-b border-zinc-800 bg-zinc-950 shrink-0 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300">
            {ALL_TABS.find(t => t.id === activeTab)?.label}
          </h2>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden relative">
          <div className="flex-1 overflow-hidden bg-zinc-950 relative min-h-[60vh] md:min-h-0">
            {activeTab === "map" && (
              <div className="absolute inset-0">
                <EventMap
                  events={filteredEvents}
                  onSelectEvent={setSelectedEvent}
                  routeStops={routeStops as any}
                  userCoords={userCoords}
                  totalPurse={routePurse}
                />
              </div>
            )}
            {activeTab === "calendar" && (
              <EventCalendar events={filteredEvents} onSelectEvent={setSelectedEvent} />
            )}
            {activeTab === "list" && (
              <div className="h-full overflow-y-auto content-start pb-32 flex flex-col">
                {/* Global Location Setter */}
                <div className="p-6 border-b border-zinc-800 bg-zinc-900 shadow-xl shrink-0 z-20 relative">
                  <div className="max-w-xl mx-auto w-full">
                    <p className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-3 flex items-center gap-2">
                      <span>📍</span> Where are you starting from?
                    </p>
                    <div className="relative">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={locationQuery}
                          onChange={e => {
                            setLocationQuery(e.target.value);
                            setShowSuggestions(true);
                          }}
                          onFocus={() => setShowSuggestions(true)}
                          onKeyDown={e => e.key === "Enter" && handleLocationSearch()}
                          placeholder="City, state, or zip…"
                          className="flex-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors shadow-inner"
                        />
                        <button
                          onClick={handleGeolocate}
                          disabled={geoLoading}
                          title="Use my location"
                          className="bg-zinc-950 shrink-0 border border-zinc-800 hover:border-orange-500 text-zinc-400 hover:text-orange-400 rounded-lg px-4 transition-all"
                        >
                          {geoLoading ? "…" : "📍"}
                        </button>
                      </div>

                      {/* Autocomplete Dropdown */}
                      {showSuggestions && suggestions.length > 0 && (
                        <div ref={suggestionRef} className="absolute z-50 w-full mt-2 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden left-0 text-left">
                          {suggestions.map((s, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setLocationQuery(s.displayName);
                                setUserCoords({ lat: s.lat, lng: s.lng, label: s.displayName });
                                setShowSuggestions(false);
                              }}
                              className="w-full text-left px-5 py-3 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors border-b border-zinc-700/50 last:border-0 truncate"
                            >
                              {s.displayName}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-4 bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/50">
                      <label className="text-xs font-semibold text-zinc-500 shrink-0 uppercase tracking-widest">Search Radius</label>
                      <input
                        type="range"
                        min="50" max="2500" step="50"
                        value={maxDistance}
                        onChange={(e) => setMaxDistance(parseInt(e.target.value))}
                        className="flex-1 accent-orange-500"
                      />
                      <span className="text-sm font-bold text-orange-400 w-16 text-right">{maxDistance} mi</span>
                    </div>

                    {/* Date Filters Row */}
                    <div className="flex flex-col sm:flex-row gap-4 mt-4 items-stretch">
                      {/* Dates */}
                      <div className="flex-1 w-full bg-zinc-950/40 p-4 rounded-lg border border-zinc-800/50 flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Date Range</label>
                          {(startDate || endDate) && (
                            <button
                              onClick={() => { setStartDate(""); setEndDate(""); }}
                              className="text-[10px] text-orange-400 hover:text-orange-300 font-bold uppercase tracking-wider"
                            >
                              CLEAR
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors color-scheme-dark shadow-inner"
                            placeholder="Start"
                          />
                          <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors color-scheme-dark shadow-inner"
                            placeholder="End"
                          />
                        </div>
                      </div>

                      {/* Blackout Dates */}
                      <div className="flex-1 w-full bg-zinc-950/40 p-4 rounded-lg border border-zinc-800/50">
                        <BlackoutDates
                          blackoutDates={blackoutDates}
                          setBlackoutDates={setBlackoutDates}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 flex-1">

                  {userCoords && filteredEvents.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-sm text-zinc-500">
                      No events match your selected filters. Try increasing your radius.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      {filteredEvents.map(e => (
                        <EventCard
                          key={e.id}
                          event={e}
                          isSelected={selectedEventIds.includes(e.id)}
                          onToggleSelect={toggleEventSelection}
                          onClick={() => setSelectedEvent(e)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeTab === "saved" && (
              <SavedTrips onLoadRoute={(routeData) => {
                setRouteStops(routeData.stops);
                setRoutePurse(routeData.totalPurse || 0);
                if (routeData.stops?.length > 0) {
                  const firstStop = routeData.stops[0];
                  setUserCoords({ lat: firstStop.event.latitude, lng: firstStop.event.longitude });
                }
              }} />
            )}
          </div>

          {selectedEvent && (
            <div className="absolute inset-0 md:relative md:inset-auto md:w-80 shrink-0 border-t md:border-t-0 md:border-l border-zinc-800 bg-zinc-900 overflow-y-auto fade-in shadow-2xl z-30">
              <div className="sticky top-0 flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900 z-10">
                <span className="text-sm font-semibold text-zinc-300">Event Details</span>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-zinc-500 hover:text-white w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-800 transition-all text-lg"
                >×</button>
              </div>
              <div className="p-4">
                <EventCard
                  event={selectedEvent}
                  isSelected={selectedEventIds.includes(selectedEvent.id)}
                  onToggleSelect={toggleEventSelection}
                />
              </div>
            </div>
          )}
        </div>

        {/* Floating Route Generator Bar */}
        {selectedEventIds.length > 0 && (
          <div className="absolute bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-40 fade-in w-11/12 max-w-md">
            <div className="bg-zinc-900 border border-orange-500/50 shadow-2xl shadow-orange-900/20 rounded-2xl p-3 flex items-center justify-between backdrop-blur-md">
              <div className="pl-3">
                <p className="text-white font-bold text-sm">Trip Builder active</p>
                <p className="text-orange-400 text-xs font-semibold">{selectedEventIds.length} event{selectedEventIds.length !== 1 ? 's' : ''} selected</p>
              </div>
              <button
                onClick={generateRoute}
                disabled={isGeneratingPath}
                className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all shadow-md disabled:opacity-50"
              >
                {isGeneratingPath ? "Routing..." : "Build Route 🗺"}
              </button>
            </div>
            {routeError && <p className="text-red-400 text-xs mt-2 text-center bg-zinc-950 p-2 rounded-lg">{routeError}</p>}
          </div>
        )}

      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden flex items-center justify-around bg-zinc-900 border-t border-zinc-800 shrink-0 pb-safe z-50 relative">
        {ALL_TABS.filter(tab => !tab.requireAuth || session?.user).map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-3 transition-colors ${isActive ? "text-orange-400" : "text-zinc-500 hover:text-zinc-300"
                }`}
            >
              <span className="text-xl leading-none mb-1">{tab.icon}</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
