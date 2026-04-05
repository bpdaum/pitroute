"use client";

import { useMemo } from "react";
import { CookPlan } from "./CookPlannerDashboard";

interface TimelineEvent {
    meatType: string;
    time: string;
    action: string;
    description: string;
    offsetMinutes: number;
}

const colorMap: Record<string, string> = {
    Brisket: "border-red-500 text-red-500",
    Pork: "border-pink-500 text-pink-500",
    Ribs: "border-orange-500 text-orange-500",
    Chicken: "border-yellow-500 text-yellow-500",
};

const bgMap: Record<string, string> = {
    Brisket: "bg-red-500/10",
    Pork: "bg-pink-500/10",
    Ribs: "bg-orange-500/10",
    Chicken: "bg-yellow-500/10",
};

const shadowMap: Record<string, string> = {
    Brisket: "bg-red-500",
    Pork: "bg-pink-500",
    Ribs: "bg-orange-500",
    Chicken: "bg-yellow-500",
};

export function MasterTimelineView({ plans }: { plans: Record<string, CookPlan> }) {
    const sortedEvents = useMemo(() => {
        const allEvents: TimelineEvent[] = [];

        Object.entries(plans).forEach(([meatType, plan]) => {
            if (plan.timeline) {
                try {
                    const parsed = JSON.parse(plan.timeline);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(e => {
                            if (e.action) {
                                allEvents.push({
                                    meatType,
                                    time: e.time || "",
                                    action: e.action || "",
                                    description: e.description || "",
                                    // Fallback to purely pushing them to the end or relying on previous generation if number isn't present
                                    offsetMinutes: typeof e.offsetMinutes === "number" ? e.offsetMinutes : 9999
                                });
                            }
                        });
                    }
                } catch (e) {
                    console.error("Failed to parse timeline for", meatType, e);
                }
            }
        });

        return allEvents.sort((a, b) => a.offsetMinutes - b.offsetMinutes);
    }, [plans]);

    if (sortedEvents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-zinc-500 text-sm">
                <p>No timelines generated yet.</p>
                <p className="text-xs mt-2 text-zinc-600">Go to individual meat tabs and auto-generate timelines to see them here.</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <h2 className="text-xl font-bebas tracking-widest text-orange-400 mb-8 border-b border-zinc-800 pb-4">
                Master Execution Timeline
            </h2>
            <div className="relative border-l border-zinc-800 ml-4 space-y-8 pb-12">
                {sortedEvents.map((ev, idx) => {
                    const colorClass = colorMap[ev.meatType] || "border-zinc-500 text-zinc-500";
                    const bgClass = bgMap[ev.meatType] || "bg-zinc-800";
                    const dotClass = shadowMap[ev.meatType] || "bg-zinc-500";
                    
                    const offsetText = ev.offsetMinutes === 9999 
                        ? "Unsorted"
                        : ev.offsetMinutes <= 0 
                            ? `T${ev.offsetMinutes}` 
                            : `T+${ev.offsetMinutes}`;

                    return (
                        <div key={idx} className="relative pl-8 group">
                            {/* Dot */}
                            <div className={`absolute -left-[9px] top-4 w-4 h-4 rounded-full border-4 border-zinc-950 ${dotClass} shadow-lg transition-transform group-hover:scale-125 duration-300`}></div>
                            
                            <div className={`p-5 rounded-xl border border-zinc-800/50 ${bgClass} transition-colors hover:border-zinc-700/80`}>
                                <div className="flex flex-wrap gap-2 items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm border ${colorClass}`}>
                                            {ev.meatType}
                                        </span>
                                        <span className="text-sm font-bold text-white tracking-widest bg-zinc-950/50 px-2 py-0.5 rounded">{ev.time}</span>
                                    </div>
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 bg-zinc-950/50 px-2 py-0.5 rounded">{offsetText} min</span>
                                </div>
                                <h3 className="text-lg font-bebas tracking-wider text-zinc-200 mb-2">{ev.action}</h3>
                                <p className="text-sm text-zinc-400 leading-relaxed font-light">{ev.description}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
