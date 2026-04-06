"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface SavedCookEvent {
    id: string;
    name: string;
    date: string;
    locationAddress?: string;
    organization?: { name: string };
    cookPlans: any[]; // The meat combinations they are doing
}

export function SavedCooks({ onOpenCook }: { onOpenCook: (event: any) => void }) {
    const { data: session } = useSession();
    const [events, setEvents] = useState<SavedCookEvent[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!session?.user) return;
        setLoading(true);
        fetch("/api/saved-cooks")
            .then(res => res.json())
            .then(data => {
                if (data.events) setEvents(data.events);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [session?.user]);

    if (!session?.user) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <p>Please sign in to view your saved cooks.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 animate-pulse">
                <p>Loading your saved cooks...</p>
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-4xl mb-3">🔥</p>
                <p className="text-zinc-400 text-sm">No cooks planned yet.</p>
                <p className="text-zinc-500 text-xs mt-1">Select an event from the map or ask the AI to build a cook!</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-6 space-y-4">
            <h2 className="text-lg font-bebas tracking-widest text-zinc-300 mb-6">Your Cook Library</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
                {events.map((ev) => {
                    // Collect meats planned
                    const activeMeats = ev.cookPlans.map(cp => cp.meatType);
                    const meatsString = activeMeats.length > 0 ? activeMeats.join(", ") : "No meats selected";

                    return (
                        <div 
                            key={ev.id} 
                            onClick={() => onOpenCook(ev)}
                            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors rounded-xl p-5 flex flex-col cursor-pointer group"
                        >
                            <div className="flex justify-between items-start mb-2 gap-2">
                                <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-orange-400 transition-colors line-clamp-2">
                                    {ev.name}
                                </h3>
                                <span className="shrink-0 px-2 py-1 bg-zinc-800 rounded-md text-[9px] font-bold tracking-wider uppercase text-zinc-300">
                                    {ev.organization?.name || "Event"}
                                </span>
                            </div>
                            
                            <div className="text-xs text-zinc-500 mb-4 flex items-center gap-1">
                                📅 {new Date(ev.date).toLocaleDateString()}
                            </div>

                            <div className="mt-auto flex flex-col gap-2 border-t border-zinc-800/60 pt-3">
                                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Strategy Active For:</span>
                                <div className="text-xs text-orange-400/80 line-clamp-1 flex items-center gap-1">
                                    🥩 {meatsString}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
