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
import { CookPlannerDashboard } from "./components/CookPlannerDashboard";
import Link from "next/link";

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

// Fixed: Moving inner component outside to prevent focus loss
interface FilterPanelProps {
  locationQuery: string;
  setLocationQuery: (v: string) => void;
  setShowSuggestions: (v: boolean) => void;
  handleLocationSearch: () => void;
  handleGeolocate: () => void;
  geoLoading: boolean;
  showSuggestions: boolean;
  suggestions: any[];
  suggestionRef: React.RefObject<HTMLDivElement | null>;
  setUserCoords: (v: { lat: number; lng: number, label?: string } | null) => void;
  userCoords: { lat: number; lng: number, label?: string } | null;
  maxDistance: number;
  setMaxDistance: (v: number) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  blackoutDates: string[];
  setBlackoutDates: React.Dispatch<React.SetStateAction<string[]>>;
  selectedOrgs: string[];
  toggleOrg: (v: string) => void;
  minPurse: number;
  setMinPurse: (v: number) => void;
}

const ORGANIZATIONS = ["KCBS", "MBN", "SCA", "FBA", "IBCA", "CBA", "LSBS", "Outlaw BBQ", "CTBA", "BCA"];
const PURSE_TIERS = [
  { label: "Any Prize", value: 0 },
  { label: "$1,000+", value: 1000 },
  { label: "$5,000+", value: 5000 },
  { label: "$10,000+", value: 10000 },
];

function FilterPanelContents(props: FilterPanelProps) {
  return (
    <div className="space-y-5">
      {/* Location Search */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Starting Location</p>
        <div className="relative">
          <div className="flex gap-1.5">
            <input
              type="text"
              value={props.locationQuery}
              onChange={e => {
                props.setLocationQuery(e.target.value);
                props.setShowSuggestions(true);
              }}
              onFocus={() => props.setShowSuggestions(true)}
              onKeyDown={e => e.key === "Enter" && props.handleLocationSearch()}
              placeholder="City, zip…"
              className="flex-1 min-w-0 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
            <button
              onClick={props.handleGeolocate}
              disabled={props.geoLoading}
              className="bg-zinc-950 shrink-0 border border-zinc-800 hover:border-orange-500 text-zinc-500 hover:text-orange-400 rounded-lg px-2 text-xs transition-colors"
            >
              {props.geoLoading ? "…" : "📍"}
            </button>
          </div>

          {props.showSuggestions && props.suggestions.length > 0 && (
            <div ref={props.suggestionRef} className="absolute z-50 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden left-0 text-left">
              {props.suggestions.slice(0, 5).map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    props.setLocationQuery(s.displayName);
                    props.setUserCoords({ lat: s.lat, lng: s.lng, label: s.displayName });
                    props.setShowSuggestions(false);
                  }}
                  className="w-full text-left px-3 py-2 text-[11px] text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors border-b border-zinc-700/50 last:border-0 truncate"
                >
                  {s.displayName}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Radius Slider */}
      {props.userCoords && (
        <div className="fade-in">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600">Search Radius</p>
            <span className="text-[10px] font-bold text-orange-500">{props.maxDistance} mi</span>
          </div>
          <input
            type="range"
            min="50" max="2500" step="50"
            value={props.maxDistance}
            onChange={(e) => props.setMaxDistance(parseInt(e.target.value))}
            className="w-full accent-orange-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      )}

      {/* Search */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Search Events</p>
        <input
          type="text"
          placeholder="Event name…"
          value={props.searchQuery}
          onChange={e => props.setSearchQuery(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
        />
      </div>

      {/* Date Range */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600">Date Range</p>
          {(props.startDate || props.endDate) && (
            <button onClick={() => { props.setStartDate(""); props.setEndDate(""); }} className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">
              Clear
            </button>
          )}
        </div>
        <div className="flex gap-1.5 items-center">
          <input
            type="date"
            value={props.startDate}
            onChange={e => props.setStartDate(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors color-scheme-dark"
          />
          <span className="text-zinc-600 text-xs">–</span>
          <input
            type="date"
            value={props.endDate}
            onChange={e => props.setEndDate(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors color-scheme-dark"
          />
        </div>
      </div>

      {/* Blackout Dates */}
      <div>
        <BlackoutDates blackoutDates={props.blackoutDates} setBlackoutDates={props.setBlackoutDates} />
      </div>

      {/* Organizations */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Organizations</p>
        <div className="flex flex-wrap gap-1.5">
          {ORGANIZATIONS.map(org => {
            const isActive = props.selectedOrgs.includes(org);
            return (
              <button
                key={org}
                onClick={() => props.toggleOrg(org)}
                className={`px-2 py-0.5 rounded-md text-[9px] font-semibold tracking-wider transition-colors ${isActive
                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
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
          value={props.minPurse}
          onChange={e => props.setMinPurse(Number(e.target.value))}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
        >
          {PURSE_TIERS.map(tier => (
            <option key={tier.value} value={tier.value}>{tier.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

type Tab = "list" | "map" | "calendar" | "saved";

const ALL_TABS: { id: Tab; icon: string; label: string, requireAuth?: boolean }[] = [
  { id: "list", icon: "☰", label: "Discover Events" },
  { id: "map", icon: "🗺", label: "Map" },
  { id: "calendar", icon: "📅", label: "Calendar" },
  { id: "saved", icon: "⭐", label: "Saved Trips", requireAuth: true },
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
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [routePurse, setRoutePurse] = useState(0);
  const [planningEvent, setPlanningEvent] = useState<EventItem | null>(null);

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
      const data = await geocodeLocation(locationQuery);
      setUserCoords({ lat: data.lat, lng: data.lng, label: data.displayName });
      setLocationQuery(data.displayName);
      setShowSuggestions(false);
    } catch (e) {
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
    if (!userCoords) {
      setRouteError("Please set a Starting Location in the filters first.");
      return;
    }
    if (selectedEventIds.length === 0) {
      setRouteError("Please select at least one event.");
      return;
    }

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

      if (!data.stops || data.stops.length === 0) {
        throw new Error("No physically viable route found between these events given your constraints.");
      }

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

  // Filters UI component call
  const renderFilters = () => (
    <FilterPanelContents
      locationQuery={locationQuery}
      setLocationQuery={setLocationQuery}
      setShowSuggestions={setShowSuggestions}
      handleLocationSearch={handleLocationSearch}
      handleGeolocate={handleGeolocate}
      geoLoading={geoLoading}
      showSuggestions={showSuggestions}
      suggestions={suggestions}
      suggestionRef={suggestionRef}
      setUserCoords={setUserCoords}
      userCoords={userCoords}
      maxDistance={maxDistance}
      setMaxDistance={setMaxDistance}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      startDate={startDate}
      setStartDate={setStartDate}
      endDate={endDate}
      setEndDate={setEndDate}
      blackoutDates={blackoutDates}
      setBlackoutDates={setBlackoutDates}
      selectedOrgs={selectedOrgs}
      toggleOrg={toggleOrg}
      minPurse={minPurse}
      setMinPurse={setMinPurse}
    />
  );

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
          {session?.user && (
            <Link
              href="/packages"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <span className="text-base leading-none">📖</span>
              <span>Recipe Book</span>
            </Link>
          )}
        </nav>

        {/* Global Filters Section */}
        <div className="flex-1 p-4 border-t border-zinc-800 fade-in">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-5">Refine List</h3>
          {renderFilters()}
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

      {/* Mobile Filter Drawer */}
      {showMobileFilters && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)} />
          {/* Panel */}
          <div className="relative mt-auto bg-zinc-900 border-t border-zinc-800 rounded-t-2xl max-h-[85dvh] overflow-y-auto">
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between z-10">
              <span className="text-sm font-semibold text-white">Filters</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-orange-400 font-bold">{filteredEvents.length} results</span>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="text-zinc-400 hover:text-white w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-800 text-lg"
                >×</button>
              </div>
            </div>
            <div className="p-4">
              {renderFilters()}
            </div>
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="px-5 py-2.5 border-b border-zinc-800 bg-zinc-950 shrink-0 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300">
            {ALL_TABS.find(t => t.id === activeTab)?.label}
          </h2>
          {/* Mobile filter button */}
          {(activeTab === "list" || activeTab === "calendar" || activeTab === "map") && (
            <button
              onClick={() => { setShowMobileFilters(true); setSelectedEvent(null); }}
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold hover:border-orange-500 hover:text-orange-400 transition-colors"
            >
              <span>⚙️</span>
              <span>Filters</span>
              {(selectedOrgs.length > 0 || searchQuery || startDate || endDate || blackoutDates.length > 0 || userCoords) && (
                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
              )}
            </button>
          )}
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
                  onPlanCook={setPlanningEvent}
                />
              </div>
            )}
            {activeTab === "calendar" && (
              <EventCalendar events={filteredEvents} onSelectEvent={setSelectedEvent} />
            )}
            {activeTab === "list" && (
              <div className="h-full overflow-y-auto content-start pb-32">
                <div className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filteredEvents.length === 0 ? (
                      <div className="col-span-full py-12 text-center text-sm text-zinc-500">
                        No events match your selected filters. Try adjusting your radius or dates.
                      </div>
                    ) : (
                      filteredEvents.map(e => (
                        <EventCard
                          key={e.id}
                          event={e}
                          isSelected={selectedEventIds.includes(e.id)}
                          onClick={() => setSelectedEvent(e)}
                        />
                      ))
                    )}
                  </div>
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
            <div className="fixed bottom-24 md:bottom-4 left-4 lg:left-72 right-4 z-[60] animate-in slide-in-from-bottom flex justify-center pointer-events-none">
              <div className="bg-zinc-900 border border-zinc-800 shadow-[0_0_30px_rgba(0,0,0,0.5)] rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 max-w-3xl w-full pointer-events-auto">
                <div className="flex-1 w-full flex items-center justify-between md:justify-start gap-4">
                  <div className="truncate pr-4">
                    <h3 className="text-white font-bold tracking-wider text-sm truncate">{selectedEvent.name}</h3>
                    <p className="text-zinc-400 text-xs mt-0.5 truncate">
                      {new Date(selectedEvent.date).toLocaleDateString()} • {selectedEvent.locationAddress || 'Address TBA'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="md:hidden text-zinc-500 hover:text-white shrink-0 p-2"
                  >✕</button>
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                    {session?.user ? (
                      <button
                        onClick={() => { setPlanningEvent(selectedEvent); setSelectedEvent(null); }}
                        className="flex-1 md:flex-none bg-orange-600 hover:bg-orange-500 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                      >
                        <span>📓</span>
                        <span>Plan Cook</span>
                      </button>
                    ) : (
                      <div className="flex-1 md:flex-none bg-zinc-800 border border-zinc-700 px-4 py-3 rounded-xl text-center text-xs text-zinc-400">
                        Sign in to Plan
                      </div>
                    )}
                    <button
                      onClick={() => toggleEventSelection(selectedEvent.id)}
                      className={`flex-1 md:flex-none px-5 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm whitespace-nowrap border ${
                        selectedEventIds.includes(selectedEvent.id)
                          ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                      }`}
                    >
                      <span>🗺</span>
                      <span className="hidden md:inline">{selectedEventIds.includes(selectedEvent.id) ? "Remove Route" : "Add to Route"}</span>
                      <span className="md:hidden">{selectedEventIds.includes(selectedEvent.id) ? "Remove" : "Add"}</span>
                    </button>
                    
                    <button
                        onClick={() => setSelectedEvent(null)}
                        className="hidden md:flex text-zinc-500 hover:text-white bg-zinc-950 border border-zinc-800 hover:border-zinc-700 w-12 h-12 items-center justify-center rounded-xl transition-all ml-1 shrink-0"
                    >✕</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cook Planner Overlay */}
        {planningEvent && (
          <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col">
            <CookPlannerDashboard event={planningEvent} onBack={() => setPlanningEvent(null)} />
          </div>
        )}

        {/* Floating Route Generator Bar */}
        {selectedEventIds.length > 0 && (
          <div className="absolute bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-40 fade-in w-11/12 max-w-md">
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
      <nav className="md:hidden flex items-center justify-around bg-zinc-900 border-t border-zinc-800 shrink-0 pb-[max(env(safe-area-inset-bottom),12px)] z-50 relative">
        {ALL_TABS.filter(tab => !tab.requireAuth || session?.user).map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 pt-3 pb-1 transition-colors ${isActive ? "text-orange-400" : "text-zinc-500 hover:text-zinc-300"
                }`}
            >
              <span className="text-xl leading-none mb-1">{tab.icon}</span>
              <span className="text-[9px] uppercase font-semibold tracking-wider text-center px-1">
                {tab.id === 'list' ? 'Events' : tab.id === 'saved' ? 'Saved' : tab.label}
              </span>
            </button>
          );
        })}
        {session?.user && (
            <Link
              href="/packages"
              className="flex flex-col items-center justify-center flex-1 pt-3 pb-1 transition-colors text-zinc-500 hover:text-zinc-300"
            >
              <span className="text-xl leading-none mb-1">📖</span>
              <span className="text-[9px] uppercase font-semibold tracking-wider text-center px-1">Recipes</span>
            </Link>
        )}
      </nav>
    </div>
  );
}
