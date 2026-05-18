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
    <div className="space-y-6">
      {/* Location Search */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-[#A0A0A0] mb-2 font-bold">Find Events Near...</p>
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
              className="flex-1 min-w-0 bg-smoke border border-ash rounded-lg px-3 py-2.5 text-xs text-bone placeholder-[#666] focus:outline-none focus:border-ember transition-colors"
            />
            <button
              onClick={props.handleGeolocate}
              disabled={props.geoLoading}
              className="bg-charcoal shrink-0 border border-ash hover:border-ember text-[#A0A0A0] hover:text-ember rounded-lg px-3 text-xs transition-colors"
            >
              {props.geoLoading ? "…" : "📍"}
            </button>
          </div>

          {props.showSuggestions && props.suggestions.length > 0 && (
            <div ref={props.suggestionRef} className="absolute z-50 w-full mt-1 bg-charcoal border border-ash rounded-lg shadow-2xl overflow-hidden left-0 text-left">
              {props.suggestions.slice(0, 5).map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    props.setLocationQuery(s.displayName);
                    props.setUserCoords({ lat: s.lat, lng: s.lng, label: s.displayName });
                    props.setShowSuggestions(false);
                  }}
                  className="w-full text-left px-3 py-2 text-[11px] text-[#D1D1D1] hover:bg-ash hover:text-bone transition-colors border-b border-ash last:border-0 truncate"
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
        <div className="animate-reveal">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-widest text-[#A0A0A0] font-bold">Search Radius</p>
            <span className="text-[10px] font-bold text-ember">{props.maxDistance} mi</span>
          </div>
          <input
            type="range"
            min="50" max="2500" step="50"
            value={props.maxDistance}
            onChange={(e) => props.setMaxDistance(parseInt(e.target.value))}
            className="w-full accent-ember h-1.5 bg-smoke rounded-lg appearance-none cursor-pointer"
          />
        </div>
      )}

      {/* Search */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-[#A0A0A0] mb-2 font-bold">Search Events</p>
        <input
          type="text"
          placeholder="Event name…"
          value={props.searchQuery}
          onChange={e => props.setSearchQuery(e.target.value)}
          className="w-full bg-smoke border border-ash rounded-lg px-3 py-2.5 text-xs text-bone placeholder-[#666] focus:outline-none focus:border-ember transition-colors"
        />
      </div>

      {/* Date Range */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-widest text-[#A0A0A0] font-bold">Date Range</p>
          {(props.startDate || props.endDate) && (
            <button onClick={() => { props.setStartDate(""); props.setEndDate(""); }} className="text-[10px] text-ember font-bold uppercase tracking-wider hover:text-white transition-colors">
              Clear
            </button>
          )}
        </div>
        <div className="flex gap-1.5 items-center">
          <input
            type="date"
            value={props.startDate}
            onChange={e => props.setStartDate(e.target.value)}
            className="flex-1 bg-smoke border border-ash rounded-lg px-2 py-2 text-xs text-bone focus:outline-none focus:border-ember transition-colors color-scheme-dark"
          />
          <span className="text-[#666] text-xs">–</span>
          <input
            type="date"
            value={props.endDate}
            onChange={e => props.setEndDate(e.target.value)}
            className="flex-1 bg-smoke border border-ash rounded-lg px-2 py-2 text-xs text-bone focus:outline-none focus:border-ember transition-colors color-scheme-dark"
          />
        </div>
        
        <div className="flex items-center gap-2 mt-4">
          <input 
            type="checkbox" 
            id="showPast" 
            checked={props.showPastEvents} 
            onChange={(e) => props.setShowPastEvents(e.target.checked)}
            className="accent-ember w-4 h-4 rounded bg-smoke border-ash"
          />
          <label htmlFor="showPast" className="text-[10px] uppercase tracking-widest text-[#A0A0A0] cursor-pointer font-bold">Show past events</label>
        </div>
      </div>

      {/* Blackout Dates */}
      <div>
        <BlackoutDates blackoutDates={props.blackoutDates} setBlackoutDates={props.setBlackoutDates} />
      </div>

      {/* Organizations */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-[#A0A0A0] mb-2 font-bold">Organizations</p>
        <div className="flex flex-wrap gap-1.5">
          {ORGANIZATIONS.map(org => {
            const isActive = props.selectedOrgs.includes(org);
            return (
              <button
                key={org}
                onClick={() => props.toggleOrg(org)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider transition-colors border ${isActive
                  ? "bg-ember/20 text-ember border-ember/30"
                  : "bg-smoke border-ash text-[#A0A0A0] hover:text-bone hover:border-[#555]"
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
  { id: "discover", icon: "🔥", label: "Events" },
  { id: "calendar", icon: "📅", label: "Calendar" },
  { id: "cooks", icon: "📓", label: "Planner", requireAuth: true },
  { id: "coach", icon: "🤖", label: "AI Coach", requireAuth: true },
];

export default function Home() {
  const [allEvents, setAllEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("discover");
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  
  // Mobile-first architecture toggles
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showMap, setShowMap] = useState(false); // Map Toggle

  const [planningEvent, setPlanningEvent] = useState<EventItem | null>(null);

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number, label?: string } | null>(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [maxDistance, setMaxDistance] = useState<number>(750);
  const [geoLoading, setGeoLoading] = useState(false);

  const [suggestions, setSuggestions] = useState<{ lat: number, lng: number, displayName: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);

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
    } catch (e) {}
    setGeoLoading(false);
  }

  function toggleOrg(org: string) {
    setSelectedOrgs(prev =>
      prev.includes(org) ? prev.filter(o => o !== org) : [...prev, org]
    );
  }

  const filteredEvents = useMemo(() => {
    return allEvents.filter(event => {
      const eventDateStr = event.date.split("T")[0];
      
      if (!showPastEvents) {
          const today = new Date();
          today.setHours(0,0,0,0);
          const [year, month, day] = eventDateStr.split("-").map(Number);
          const eDate = new Date(year, month - 1, day);
          if (eDate < today) return false;
      }

      if (userCoords && event.latitude && event.longitude) {
        const dist = haversine(userCoords.lat, userCoords.lng, event.latitude, event.longitude);
        if (dist > maxDistance) return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = event.name.toLowerCase().includes(query);
        const locMatch = event.locationAddress?.toLowerCase().includes(query) || false;
        if (!nameMatch && !locMatch) return false;
      }

      if (selectedOrgs.length > 0 && !selectedOrgs.includes(event.organization.name)) {
        return false;
      }

      if (blackoutDates.includes(eventDateStr)) {
        return false;
      }

      const eTime = new Date(eventDateStr).getTime();
      if (startDate && eTime < new Date(startDate).getTime()) return false;
      if (endDate && eTime > new Date(endDate).getTime()) return false;

      return true;
    });
  }, [allEvents, searchQuery, selectedOrgs, userCoords, maxDistance, blackoutDates, startDate, endDate, showPastEvents]);

  if (!mounted) return <div className="bg-smoke min-h-screen" />;

  const renderFilters = () => (
    <FilterPanelContents
      locationQuery={locationQuery} setLocationQuery={setLocationQuery}
      setShowSuggestions={setShowSuggestions} handleLocationSearch={handleLocationSearch}
      handleGeolocate={handleGeolocate} geoLoading={geoLoading}
      showSuggestions={showSuggestions} suggestions={suggestions} suggestionRef={suggestionRef}
      setUserCoords={setUserCoords} userCoords={userCoords}
      maxDistance={maxDistance} setMaxDistance={setMaxDistance}
      searchQuery={searchQuery} setSearchQuery={setSearchQuery}
      startDate={startDate} setStartDate={setStartDate}
      endDate={endDate} setEndDate={setEndDate}
      blackoutDates={blackoutDates} setBlackoutDates={setBlackoutDates}
      selectedOrgs={selectedOrgs} toggleOrg={toggleOrg}
      showPastEvents={showPastEvents} setShowPastEvents={setShowPastEvents}
    />
  );

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] overflow-hidden relative bg-smoke text-bone font-sans">
      
      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex w-[320px] shrink-0 flex-col border-r border-ash z-20 bg-charcoal">
        <div className="px-6 pt-8 pb-6 border-b border-ash relative">
          <h1 className="font-display font-bold text-3xl tracking-tight text-bone flex items-center gap-2">
             PitPlan<span className="text-ember">.</span>
          </h1>
          <p className="text-[10px] text-[#A0A0A0] mt-2 uppercase tracking-widest font-bold">BBQ Competition Companion</p>
        </div>

        <nav className="p-0 flex flex-col">
          {ALL_TABS.filter(tab => !tab.requireAuth || session?.user).map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setPlanningEvent(null); }}
              className={`w-full flex items-center gap-4 px-6 py-4 text-sm font-bold transition-all text-left border-b border-ash ${activeTab === tab.id
                ? "bg-ash text-bone"
                : "text-[#A0A0A0] hover:bg-smoke hover:text-bone"
                }`}
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className="tracking-widest uppercase text-xs">{tab.label}</span>
            </button>
          ))}
          {session?.user && (
            <Link
              href="/packages"
              className="w-full flex items-center gap-4 px-6 py-4 text-sm font-bold transition-all text-left border-b border-ash text-[#A0A0A0] hover:bg-smoke hover:text-bone"
            >
              <span className="text-xl leading-none">📖</span>
              <span className="tracking-widest uppercase text-xs">Recipes</span>
            </Link>
          )}
        </nav>

        {/* Global Filters Section */}
        <div className="flex-1 p-6 border-b border-ash overflow-y-auto custom-scrollbar animate-reveal">
          <div className="flex items-center justify-between mb-6">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-ember">Refine Search</h3>
              <span className="text-[10px] font-bold text-[#A0A0A0] bg-smoke px-2 py-1 rounded-md">{filteredEvents.length} results</span>
          </div>
          {renderFilters()}
        </div>

        <AuthWidget />
      </aside>

      {/* Mobile Filter Fullscreen Modal */}
      {showMobileFilters && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-charcoal animate-in slide-in-from-bottom duration-200">
            <div className="sticky top-0 bg-charcoal border-b border-ash px-5 py-4 flex items-center justify-between z-10">
              <span className="text-sm font-bold text-bone font-display tracking-widest uppercase">Filters</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-ember font-bold bg-ember/10 px-2 py-1 rounded-md">{filteredEvents.length} matches</span>
                <button onClick={() => setShowMobileFilters(false)} className="text-[#A0A0A0] hover:text-bone w-8 h-8 flex items-center justify-center text-2xl">×</button>
              </div>
            </div>
            <div className="p-5 overflow-y-auto flex-1 pb-24">
              {renderFilters()}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-charcoal border-t border-ash pb-[max(env(safe-area-inset-bottom),16px)]">
                <button onClick={() => setShowMobileFilters(false)} className="w-full ember-button py-3 text-sm tracking-wider uppercase">Show Results</button>
            </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        
        {/* Top App Bar (Mobile & Desktop) */}
        <div className="px-5 py-4 border-b border-ash bg-charcoal shrink-0 flex items-center justify-between relative z-20">
          <h2 className="text-xl md:text-2xl font-display font-bold text-bone tracking-tight flex items-center gap-2">
             {activeTab === "discover" ? "Discovery" : activeTab === "calendar" ? "Calendar" : activeTab === "cooks" ? "Planner" : "AI Coach"}
          </h2>
          
          <div className="flex items-center gap-3">
             {/* Map Toggle inside Top Bar for Discover Tab */}
             {activeTab === "discover" && (
                <button
                   onClick={() => setShowMap(!showMap)}
                   className="hidden md:flex ghost-button px-3 py-1.5 text-xs font-bold items-center gap-2"
                >
                   {showMap ? "📋 View List" : "🗺 View Map"}
                </button>
             )}

            <div className="md:hidden">
              {session?.user ? (
                <button onClick={() => signOut()} className="block" title="Sign Out">
                  {session.user.image ? (
                     <img src={session.user.image} className="w-8 h-8 rounded-full border border-ash" alt="Sign Out" />
                  ) : (
                     <div className="w-8 h-8 rounded-full bg-smoke border border-ash flex items-center justify-center text-[#A0A0A0] text-xs font-bold font-display">
                        {session.user.name?.charAt(0).toUpperCase() || "U"}
                     </div>
                  )}
                </button>
              ) : (
                <button onClick={() => signIn("google")} className="ghost-button px-3 py-1.5 text-xs font-bold tracking-wider uppercase">Sign In</button>
              )}
            </div>

            {(activeTab === "discover" || activeTab === "calendar") && (
              <button
                onClick={() => { setShowMobileFilters(true); setSelectedEvent(null); }}
                className="md:hidden ghost-button flex items-center gap-2 px-3 py-1.5 text-xs font-bold tracking-wider uppercase bg-smoke"
              >
                <span>⚙</span>
                <span>Filter</span>
                {(selectedOrgs.length > 0 || searchQuery || startDate || endDate || blackoutDates.length > 0 || userCoords) && (
                  <span className="w-2 h-2 rounded-full bg-ember" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Main View */}
        <div className="flex-1 overflow-y-auto relative bg-smoke">
            {activeTab === "discover" && (
                <div className={`w-full mx-auto pb-32 pt-2 md:pt-6 ${showMap ? 'h-full flex flex-col max-w-7xl' : 'max-w-3xl'}`}>
                   
                   {/* Mobile Map Toggle */}
                   <div className="md:hidden px-4 mb-4 mt-2 flex justify-end">
                       <button onClick={() => setShowMap(!showMap)} className="ghost-button bg-charcoal px-4 py-2 text-xs font-bold flex items-center gap-2 rounded-xl shadow-md w-full justify-center">
                           {showMap ? "📋 View List" : "🗺 View Map"}
                       </button>
                   </div>

                   {showMap ? (
                       <div className="flex-1 w-full rounded-2xl overflow-hidden border border-ash shadow-2xl relative min-h-[60vh] mx-0 md:mx-4 glass-panel">
                           <EventMap
                             events={filteredEvents}
                             onSelectEvent={setSelectedEvent}
                             userCoords={userCoords}
                             selectedEvent={selectedEvent}
                           />
                       </div>
                   ) : (
                       <div className="flex flex-col">
                           {filteredEvents.length === 0 ? (
                               <div className="p-10 text-center text-sm text-[#A0A0A0] font-sans tracking-wide">
                                   No events match your criteria.<br/><span className="text-xs text-ember mt-2 block font-bold cursor-pointer" onClick={() => setMaxDistance(2500)}>Expand Search Radius</span>
                               </div>
                           ) : (
                               filteredEvents.map((e, index) => (
                                   <div key={e.id} className={`animate-reveal delay-${(index % 3) + 1}`}>
                                       <EventCard
                                           event={e}
                                           onClick={() => setSelectedEvent(e)}
                                       />
                                   </div>
                               ))
                           )}
                       </div>
                   )}
                </div>
            )}
            
            {activeTab === "calendar" && (
              <div className="p-4 md:p-8 h-full bg-smoke">
                  <div className="glass-panel p-4 h-full">
                     <EventCalendar events={filteredEvents} onSelectEvent={setSelectedEvent} />
                  </div>
              </div>
            )}
            
            {activeTab === "cooks" && (
              <SavedCooks onOpenCook={(event) => { setPlanningEvent(event); }} />
            )}
            
            {activeTab === "coach" && (
              <AiCoachChat />
            )}
        </div>

        {/* Selected Event Action Overlay */}
        {selectedEvent && (
          <div className="fixed bottom-24 md:bottom-8 left-0 right-0 md:left-auto md:right-8 z-[60] animate-in slide-in-from-bottom flex justify-center pointer-events-none px-4">
            <div className="glass-panel border-ember/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 max-w-2xl w-full pointer-events-auto bg-charcoal/95 backdrop-blur-xl">
              <div className="flex-1 w-full flex items-center justify-between md:justify-start gap-4 overflow-hidden">
                <div className="truncate flex-1">
                  <h3 className="text-bone font-bold text-lg md:text-xl truncate font-display tracking-wide">{selectedEvent.name}</h3>
                  <p className="text-[#A0A0A0] text-xs md:text-sm mt-1 truncate flex items-center gap-2">
                    <span className="text-ember">📅</span> {new Date(selectedEvent.date).toLocaleDateString()} 
                    <span className="text-ash">•</span>
                    <span className="text-ember">📍</span> {cleanAddress(selectedEvent.locationAddress)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="md:hidden w-8 h-8 rounded-full bg-ash flex items-center justify-center text-[#A0A0A0] hover:text-bone hover:bg-[#444] transition-colors"
                >×</button>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto shrink-0 mt-3 md:mt-0">
                  {session?.user ? (
                    <button
                      onClick={() => { setPlanningEvent(selectedEvent); setSelectedEvent(null); }}
                      className="flex-1 md:flex-none ember-button px-6 py-3 shadow-[0_0_20px_rgba(232,93,4,0.2)] flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                    >
                      <span className="text-lg">📓</span>
                      <span className="tracking-wider uppercase">Plan Cook</span>
                    </button>
                  ) : (
                    <div className="flex-1 md:flex-none bg-smoke border border-ash px-5 py-3 rounded-xl text-center text-[10px] font-bold text-[#A0A0A0] uppercase tracking-widest">
                      Sign in to Plan
                    </div>
                  )}
                  
                  {selectedEvent.latitude && selectedEvent.longitude ? (
                     <a
                       href={`https://www.google.com/maps/dir/?api=1&destination=${selectedEvent.latitude},${selectedEvent.longitude}`}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="flex-1 md:flex-none px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm whitespace-nowrap border tracking-wider uppercase ghost-button border-ash text-bone"
                     >
                       <span className="text-lg">🗺</span>
                       <span>Directions</span>
                     </a>
                  ) : null}
                  
                  <button
                      onClick={() => setSelectedEvent(null)}
                      className="hidden md:flex text-[#A0A0A0] hover:text-bone w-10 h-10 items-center justify-center rounded-xl hover:bg-ash transition-colors shrink-0 ml-2"
                  >×</button>
              </div>
            </div>
          </div>
        )}

        {/* Cook Planner Overlay */}
        {planningEvent && (
          <div className="absolute inset-0 z-[70] bg-smoke/95 backdrop-blur-xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <CookPlannerDashboard event={planningEvent} onBack={() => setPlanningEvent(null)} />
          </div>
        )}

      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden flex items-center justify-around bg-charcoal border-t border-ash shrink-0 pb-[max(env(safe-area-inset-bottom),16px)] pt-2 z-50 fixed bottom-0 left-0 right-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        {ALL_TABS.filter(tab => !tab.requireAuth || session?.user).map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setPlanningEvent(null); }}
              className={`flex flex-col items-center justify-center flex-1 py-2 px-1 mx-1 rounded-xl transition-all ${isActive ? "text-ember" : "text-[#A0A0A0] hover:text-bone hover:bg-ash"
                }`}
            >
              <span className={`text-2xl leading-none mb-1.5 transition-transform ${isActive ? "scale-110 drop-shadow-[0_0_8px_rgba(232,93,4,0.5)]" : "grayscale opacity-80"}`}>{tab.icon}</span>
              <span className={`text-[9px] uppercase font-bold tracking-widest text-center ${isActive ? 'text-ember' : 'text-[#666]'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
        {session?.user && (
            <Link
              href="/packages"
              className="flex flex-col items-center justify-center flex-1 py-2 px-1 mx-1 rounded-xl transition-all text-[#A0A0A0] hover:text-bone hover:bg-ash"
            >
              <span className="text-2xl leading-none mb-1.5 grayscale opacity-80 transition-transform">📖</span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-center text-[#666]">Recipes</span>
            </Link>
        )}
      </nav>
    </div>
  );
}
