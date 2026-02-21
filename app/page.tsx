"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { EventItem, EventCard } from "./components/EventCard";
import { EventCalendar } from "./components/EventCalendar";
import { TripPlanner } from "./components/TripPlanner";

const EventMap = dynamic(
  () => import("./components/EventMap").then(m => m.EventMap),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-zinc-600">Loading map…</div> }
);

type Tab = "plan" | "map" | "calendar" | "list";

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "plan", icon: "🔥", label: "Plan a Trip" },
  { id: "map", icon: "🗺", label: "Map" },
  { id: "calendar", icon: "📅", label: "Calendar" },
  { id: "list", icon: "☰", label: "All Events" },
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
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    fetch("/api/events")
      .then(r => r.json())
      .then(d => { setAllEvents(d.events); setLoading(false); });
  }, []);

  function handleRouteGenerated(stops: RouteStop[]) {
    setRouteStops(stops);
    // If they have a route, switch to map to show it visually
    if (stops.length > 0) {
      setTimeout(() => setActiveTab("map"), 800);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col bg-zinc-900 border-r border-zinc-800">
        <div className="px-5 pt-6 pb-4 border-b border-zinc-800">
          <h1 className="font-bebas text-4xl tracking-widest text-white leading-none">COOKR</h1>
          <p className="text-[10px] text-zinc-600 mt-0.5 uppercase tracking-widest">BBQ Competition Finder</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {TABS.map(tab => (
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

        <div className="p-4 border-t border-zinc-800">
          {loading ? (
            <p className="text-[10px] text-zinc-700 animate-pulse">Loading events…</p>
          ) : (
            <p className="text-[10px] text-zinc-700">
              <span className="text-zinc-500 font-bold">{allEvents.length}</span> competitions tracked
            </p>
          )}
          <p className="text-[9px] text-zinc-800 mt-1">KCBS · MBN · SCA · FBA · IBCA</p>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-5 py-2.5 border-b border-zinc-800 bg-zinc-950 shrink-0 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300">
            {TABS.find(t => t.id === activeTab)?.label}
          </h2>
          {routeStops.length > 0 && activeTab !== "plan" && (
            <p className="text-[11px] text-orange-400">
              🔥 Route active — {routeStops.length} stops
            </p>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            {activeTab === "plan" && (
              <TripPlanner
                onRouteGenerated={(stops) => {
                  handleRouteGenerated(stops as RouteStop[]);
                }}
                onSelectEvent={e => { setSelectedEvent(e); }}
                onUserCoordsChange={setUserCoords}
              />
            )}
            {activeTab === "map" && (
              <EventMap
                events={allEvents}
                onSelectEvent={setSelectedEvent}
                routeStops={routeStops}
                userCoords={userCoords}
              />
            )}
            {activeTab === "calendar" && (
              <EventCalendar events={allEvents} onSelectEvent={setSelectedEvent} />
            )}
            {activeTab === "list" && (
              <div className="h-full overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 content-start">
                {allEvents.map(e => (
                  <EventCard key={e.id} event={e} onClick={() => setSelectedEvent(e)} />
                ))}
              </div>
            )}
          </div>

          {selectedEvent && (
            <div className="w-80 shrink-0 border-l border-zinc-800 bg-zinc-900 overflow-y-auto fade-in">
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
                    {allEvents
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
