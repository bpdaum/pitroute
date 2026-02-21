"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface SavedTrip {
    id: string;
    title: string;
    totalPurse: number;
    createdAt: string;
    routeData: any;
}

export function SavedTrips({ onLoadRoute }: { onLoadRoute: (routeData: any) => void }) {
    const { data: session } = useSession();
    const [trips, setTrips] = useState<SavedTrip[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!session?.user) return;
        setLoading(true);
        fetch("/api/trips")
            .then(res => res.json())
            .then(data => {
                if (data.trips) setTrips(data.trips);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [session?.user]);

    if (!session?.user) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <p>Please sign in to view your saved trips.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 animate-pulse">
                <p>Loading your saved trips...</p>
            </div>
        );
    }

    if (trips.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-4xl mb-3">⭐</p>
                <p className="text-zinc-400 text-sm">No saved trips yet.</p>
                <p className="text-zinc-500 text-xs mt-1">Plan a trip and save it to view it here.</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-6 space-y-4">
            <h2 className="text-lg font-bebas tracking-widest text-zinc-300 mb-6">Your Saved Routes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
                {trips.map(trip => {
                    const stopsCount = trip.routeData?.stops?.length || 0;
                    return (
                        <div key={trip.id} className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors rounded-xl p-5 flex flex-col cursor-pointer group" onClick={() => onLoadRoute(trip.routeData)}>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-orange-400 transition-colors">{trip.title}</h3>
                                <span className="text-[10px] text-zinc-500">{new Date(trip.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-4 text-xs text-zinc-400">
                                <span className="flex items-center gap-1">📍 {stopsCount} stops</span>
                                {trip.totalPurse > 0 && <span className="flex items-center gap-1 text-emerald-500">💰 ${trip.totalPurse.toLocaleString()}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
