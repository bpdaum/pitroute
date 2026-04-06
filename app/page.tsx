"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { EventItem, EventCard, cleanAddress } from "./components/EventCard";
import { EventCalendar } from "./components/EventCalendar";
import { AuthWidget } from "./components/AuthWidget";
import { SavedCooks } from "./components/SavedCooks";
import { useSession, signIn, signOut } from "next-auth/react";

import { EventMap } from "./components/EventMap";
import { Logo } from "./components/Logo";
import { BlackoutDates } from "./components/BlackoutDates";
import { CookPlannerDashboard } from "./components/CookPlannerDashboard";
import { AiCoachChat } from "./components/AiCoachChat";
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
  showPastEvents: boolean;
  setShowPastEvents: (v: boolean) => void;
}

const ORGANIZATIONS = ["KCBS", "MBN", "SCA", "FBA", "IBCA", "CBA", "LSBS", "Outlaw BBQ", "CTBA", "BCA"];

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
        
        <div className="flex items-center gap-2 mt-4">
          <input 
            type="checkbox" 
            id="showPast" 
            checked={props.showPastEvents} 
            onChange={(e) => props.setShowPastEvents(e.target.checked)}
            className="accent-orange-500 w-4 h-4 rounded bg-zinc-950 border-zinc-800"
          />
          <label htmlFor="showPast" className="text-[10px] uppercase tracking-widest text-zinc-600 cursor-pointer font-bold">Show events before today</label>
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
    </div>
  );
}

type Tab = "discover" | "calendar" | "cooks" | "coach";

const ALL_TABS: { id: Tab; icon: string; label: string, requireAuth?: boolean }[] = [
  { id: "discover", icon: "🗺", label: "Discover Events" },
  { id: "calendar", icon: "📅", label: "Calendar" },
  { id: "cooks", icon: "🔥", label: "Cooks", requireAuth: true },
  { id: "coach", icon: "🤖", label: "AI Pitmaster", requireAuth: true },
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
  const [activeTab, setActiveTab] = useState<Tab>("discover");
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
  const [blackoutDates, setBlackoutDates] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showPastEvents, setShowPastEvents] = useState<boolean>(false);

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
      setActiveTab("discover"); // Navigate to a view where we can render the timeline later
    } catch (e: any) {
      setRouteError(e.message || "Failed to generate route.");
    }
    setIsGeneratingPath(false);
  }

  // Apply filters
  const filteredEvents = useMemo(() => {
    return allEvents.filter(event => {
      const eventDateStr = event.date.split("T")[0]; // YYYY-MM-DD
      
      // 0. Past Events Filter (Unless checked)
      if (!showPastEvents) {
          const today = new Date();
          today.setHours(0,0,0,0);
          const [year, month, day] = eventDateStr.split("-").map(Number);
          const eDate = new Date(year, month - 1, day);
          if (eDate < today) return false;
      }

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

      // 4. Blackout Dates
      if (blackoutDates.includes(eventDateStr)) {
        return false;
      }

      // 5. Explicit Date Filtering
      const eTime = new Date(eventDateStr).getTime();
      if (startDate && eTime < new Date(startDate).getTime()) return false;
      if (endDate && eTime > new Date(endDate).getTime()) return false;

      return true;
    });
  }, [allEvents, searchQuery, selectedOrgs, userCoords, maxDistance, blackoutDates, startDate, endDate, showPastEvents]);

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
      showPastEvents={showPastEvents}
      setShowPastEvents={setShowPastEvents}
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
              onClick={() => { setActiveTab(tab.id); setPlanningEvent(null); }}
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
          <div className="flex items-center gap-3">
            {/* Mobile Auth Minimal Info/Button */}
            <div className="md:hidden">
              {session?.user ? (
                <button onClick={() => signOut()} className="block" title="Sign Out">
                  {session.user.image ? (
                    <img src={session.user.image} className="w-7 h-7 rounded-full border border-zinc-700" alt="Sign Out" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 text-[10px] font-bold">
                        {session.user.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                </button>
              ) : (
                <button onClick={() => signIn("google")} className="text-[10px] font-bold text-orange-400 uppercase tracking-widest px-2.5 py-1.5 border border-orange-500/30 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 whitespace-nowrap">Sign In</button>
              )}
            </div>

            {/* Mobile filter button */}
            {(activeTab === "discover" || activeTab === "calendar") && (
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
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden relative">
          <div className="flex-1 overflow-hidden bg-zinc-950 relative min-h-[60vh] md:min-h-0">
            {activeTab === "discover" && (
              <div className="flex w-full h-full relative">
                {/* Sidebar List - Desktop: always visible. Mobile: visible only if no event is selected */}
                <div className={`w-full md:w-[350px] lg:w-[400px] shrink-0 h-full overflow-y-auto bg-zinc-950 border-r border-zinc-800 ${selectedEvent ? 'hidden md:block' : 'block'}`}>
                  <div className="p-4 flex flex-col gap-3 pb-32">
                    {filteredEvents.length === 0 ? (
                      <div className="py-12 text-center text-sm text-zinc-500">
                        No events match your selected filters. Try adjusting your radius or dates.
                      </div>
                    ) : (
                      filteredEvents.map(e => (
                        <EventCard
                          key={e.id}
                          event={e}
                          isSelected={selectedEventIds.includes(e.id) || selectedEvent?.id === e.id}
                          onClick={() => setSelectedEvent(e)}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Map Pane - Desktop: always visible. Mobile: visible only if an event is selected */}
                <div className={`flex-1 relative ${selectedEvent ? 'block w-full h-full' : 'hidden md:block'}`}>
                  <EventMap
                    events={filteredEvents}
                    onSelectEvent={setSelectedEvent}
                    routeStops={routeStops as any}
                    userCoords={userCoords}
                    totalPurse={routePurse}
                    onPlanCook={setPlanningEvent}
                    selectedEvent={selectedEvent}
                  />
                </div>
              </div>
            )}
            {activeTab === "calendar" && (
              <EventCalendar events={filteredEvents} onSelectEvent={setSelectedEvent} />
            )}
            {activeTab === "cooks" && (
              <SavedCooks onOpenCook={(event) => {
                setPlanningEvent(event);
              }} />
            )}
            {activeTab === "coach" && (
              <AiCoachChat />
            )}
          </div>

          {selectedEvent && (
            <div className="fixed bottom-24 md:bottom-4 left-4 lg:left-72 right-4 z-[60] animate-in slide-in-from-bottom flex justify-center pointer-events-none">
              <div className="bg-zinc-900 border border-zinc-800 shadow-[0_0_30px_rgba(0,0,0,0.8)] rounded-xl py-3 px-4 flex flex-col md:flex-row items-center gap-4 max-w-4xl w-full pointer-events-auto">
                <div className="flex-1 w-full flex items-center justify-between md:justify-start gap-4 overflow-hidden">
                  <div className="truncate flex-1">
                    <h3 className="text-white font-bold text-sm md:text-base truncate">{selectedEvent.name}</h3>
                    <p className="text-zinc-400 text-xs md:text-sm mt-0.5 truncate">
                      {new Date(selectedEvent.date).toLocaleDateString()} • {cleanAddress(selectedEvent.locationAddress)}
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
                        className="flex-1 md:flex-none bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-lg font-bold transition-all shadow-lg flex items-center justify-center gap-2 text-sm whitespace-nowrap"
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
                      className={`flex-1 md:flex-none px-5 py-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 text-sm whitespace-nowrap border ${
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
                        className="hidden md:flex text-zinc-500 hover:text-white p-2 items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors shrink-0 ml-1"
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
              onClick={() => { setActiveTab(tab.id); setPlanningEvent(null); }}
              className={`flex flex-col items-center justify-center flex-1 pt-3 pb-1 transition-colors ${isActive ? "text-orange-400" : "text-zinc-500 hover:text-zinc-300"
                }`}
            >
              <span className="text-xl leading-none mb-1">{tab.icon}</span>
              <span className="text-[9px] uppercase font-semibold tracking-wider text-center px-1">
                {tab.id === 'discover' ? 'Events' : tab.label}
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
