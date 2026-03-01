"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { EventItem, EventCard } from "./components/EventCard";
import { EventCalendar } from "./components/EventCalendar";
import { AuthWidget } from "./components/AuthWidget";
import { SavedTrips } from "./components/SavedTrips";
import { useSession } from "next-auth/react";

import { EventMap } from "./components/EventMap";

import { TripPlanner } from "./components/TripPlanner";
import { Logo } from "./components/Logo";

type Tab = "plan" | "map" | "calendar" | "list" | "saved";

const ALL_TABS: { id: Tab; icon: string; label: string, requireAuth?: boolean }[] = [
  { id: "plan", icon: "🔥", label: "Plan a Trip" },
  { id: "map", icon: "🗺", label: "Map" },
  { id: "calendar", icon: "📅", label: "Calendar" },
  { id: "list", icon: "☰", label: "All Events" },
  { id: "saved", icon: "⭐", label: "Saved Trips", requireAuth: true },
];

const ORGANIZATIONS = ["KCBS", "MBN", "SCA", "FBA", "IBCA", "CBA"];
const PURSE_TIERS = [
  { label: "Any Purse", value: 0 },
  { label: "$1,000+", value: 1000 },
  { label: "$5,000+", value: 5000 },
  { label: "$10,000+", value: 10000 },
];

interface RouteStop {
  event: { latitude: number; longitude: number; id: string };
}

export default function Home() {
  const [allEvents, setAllEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("plan");
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [routePurse, setRoutePurse] = useState(0);
  const [vehicleMpg, setVehicleMpg] = useState(15);
  const [vehicleGasPrice, setVehicleGasPrice] = useState(3.50);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const { data: session } = useSession();

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [minPurse, setMinPurse] = useState<number>(0);

  useEffect(() => {
    fetch("/api/events")
      .then(r => r.json())
      .then(d => { setAllEvents(d.events); setLoading(false); });
  }, []);

  function handleRouteGenerated(stops: RouteStop[], purse: number = 0) {
    setRouteStops(stops);
    setRoutePurse(purse);
    // Don't switch tabs anymore, keep them on the planner to see the timeline!
  }

  function toggleOrg(org: string) {
    setSelectedOrgs(prev =>
      prev.includes(org) ? prev.filter(o => o !== org) : [...prev, org]
    );
  }

  // Apply filters
  const filteredEvents = useMemo(() => {
    return allEvents.filter(event => {
      // 1. Text Search Match
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = event.name.toLowerCase().includes(query);
        const locMatch = event.locationAddress?.toLowerCase().includes(query) || false;
        if (!nameMatch && !locMatch) return false;
      }

      // 2. Organization Match
      if (selectedOrgs.length > 0 && !selectedOrgs.includes(event.organization.name)) {
        return false;
      }

      // 3. Minimum Purse Match
      if (minPurse > 0) {
        if (!event.purseAmount || event.purseAmount < minPurse) {
          return false;
        }
      }

      return true;
    });
  }, [allEvents, searchQuery, selectedOrgs, minPurse]);

  if (!mounted) return <div className="bg-zinc-950 min-h-screen" />;

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 flex flex-col bg-zinc-900 border-r border-zinc-800 overflow-y-auto">
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
              {tab.id === "plan" && routeStops.length > 0 && (
                <span className="ml-auto bg-orange-400/20 text-orange-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {routeStops.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Global Filters Section */}
        {activeTab !== "plan" && (
          <div className="flex-1 p-4 border-t border-zinc-800 space-y-5 fade-in">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Filters</h3>

            {/* Search */}
            <div>
              <input
                type="text"
                placeholder="Search events or locations…"
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

            {/* Clear filters */}
            {(searchQuery || selectedOrgs.length > 0 || minPurse > 0) && (
              <button
                onClick={() => { setSearchQuery(""); setSelectedOrgs([]); setMinPurse(0); }}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 tracking-wider transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Spacer to push stats to bottom if filters are hidden */}
        {activeTab === "plan" && <div className="flex-1" />}

        <div className="p-4 border-t border-zinc-800 shrink-0">
          {loading ? (
            <p className="text-[10px] text-zinc-700 animate-pulse">Loading events…</p>
          ) : (
            <div>
              <p className="text-[10px] text-zinc-500">
                <span className="text-white font-bold">{filteredEvents.length}</span>
                {filteredEvents.length !== allEvents.length && (
                  <span className="text-zinc-600"> / {allEvents.length}</span>
                )}
                {" "}events matches
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
          {routeStops.length > 0 && activeTab !== "plan" && (
            <p className="text-[11px] text-orange-400">
              🔥 Route active — {routeStops.length} stops
            </p>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden relative">
          {activeTab === "plan" && (
            <div className="w-[420px] shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col h-full z-10 shadow-2xl overflow-hidden relative">
              <TripPlanner
                onRouteGenerated={(stops, purse) => {
                  handleRouteGenerated(stops as RouteStop[], purse);
                }}
                onSelectEvent={e => { setSelectedEvent(e); }}
                onUserCoordsChange={setUserCoords}
              />
            </div>
          )}

          <div className="flex-1 overflow-hidden bg-zinc-950 relative">
            {(activeTab === "map" || activeTab === "plan") && (
              <div className="absolute inset-0">
                <EventMap
                  events={filteredEvents}
                  onSelectEvent={setSelectedEvent}
                  routeStops={routeStops}
                  userCoords={userCoords}
                  totalPurse={routePurse}
                />
              </div>
            )}
            {activeTab === "calendar" && (
              <EventCalendar events={filteredEvents} onSelectEvent={setSelectedEvent} />
            )}
            {activeTab === "list" && (
              <div className="h-full overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 content-start">
                {filteredEvents.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-sm text-zinc-500">
                    No events match your selected filters.
                  </div>
                ) : (
                  filteredEvents.map(e => (
                    <EventCard key={e.id} event={e} onClick={() => setSelectedEvent(e)} />
                  ))
                )}
              </div>
            )}
            {activeTab === "saved" && (
              <SavedTrips onLoadRoute={(routeData) => {
                handleRouteGenerated(routeData.stops, routeData.totalPurse || 0);
                if (routeData.stops?.length > 0) {
                  const firstStop = routeData.stops[0];
                  setUserCoords({ lat: firstStop.event.latitude, lng: firstStop.event.longitude });
                }
                setActiveTab("plan");
              }} />
            )}
          </div>

          {selectedEvent && (
            <div className="w-80 shrink-0 border-l border-zinc-800 bg-zinc-900 overflow-y-auto fade-in shadow-2xl relative z-20">
              <div className="sticky top-0 flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900 z-10">
                <span className="text-sm font-semibold text-zinc-300">Event Details</span>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-zinc-500 hover:text-white w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-800 transition-all text-lg"
                >×</button>
              </div>
              <div className="p-4">
                <EventCard event={selectedEvent} />
                <div className="mt-6">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">
                    More from {selectedEvent.organization.name}
                  </p>
                  <div className="flex flex-col gap-2">
                    {filteredEvents
                      .filter(e => e.organization.name === selectedEvent.organization.name && e.id !== selectedEvent.id)
                      .slice(0, 5)
                      .map(e => (
                        <EventCard key={e.id} event={e} compact onClick={() => setSelectedEvent(e)} />
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
