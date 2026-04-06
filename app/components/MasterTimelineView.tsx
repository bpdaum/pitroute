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

interface GroupedEvent {
    offsetMinutes: number;
    timeStr: string;
    events: Record<string, TimelineEvent[]>;
}

const colorMapText: Record<string, string> = {
    Brisket: "text-red-500",
    Pork: "text-pink-500",
    Ribs: "text-orange-500",
    Chicken: "text-yellow-500",
};

const dotColorMap: Record<string, string> = {
    Brisket: "bg-red-500",
    Pork: "bg-pink-500",
    Ribs: "bg-orange-500",
    Chicken: "bg-yellow-500",
};

const glowMap: Record<string, string> = {
    Brisket: "shadow-[0_0_15px_rgba(239,68,68,0.5)]",
    Pork: "shadow-[0_0_15px_rgba(236,72,153,0.5)]",
    Ribs: "shadow-[0_0_15px_rgba(249,115,22,0.5)]",
    Chicken: "shadow-[0_0_15px_rgba(234,179,8,0.5)]",
};

const bgGlowMap: Record<string, string> = {
    Brisket: "bg-red-500/10",
    Pork: "bg-pink-500/10",
    Ribs: "bg-orange-500/10",
    Chicken: "bg-yellow-500/10",
};

const borderGlowMap: Record<string, string> = {
    Brisket: "border-red-500/30",
    Pork: "border-pink-500/30",
    Ribs: "border-orange-500/30",
    Chicken: "border-yellow-500/30",
};

const MEAT_COLUMNS = ["Brisket", "Ribs", "Pork", "Chicken"];

export function MasterTimelineView({ plans }: { plans: Record<string, CookPlan> }) {
    const groupedEvents = useMemo(() => {
        const groups: Record<number, GroupedEvent> = {};

        Object.entries(plans).forEach(([meatType, plan]) => {
            if (plan.timeline) {
                try {
                    const parsed = JSON.parse(plan.timeline);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(e => {
                            if (e.action) {
                                const offset = typeof e.offsetMinutes === "number" ? e.offsetMinutes : 9999;
                                if (!groups[offset]) {
                                    let cleanTime = e.time || "";
                                    const timeMatch = cleanTime.match(/(1[0-2]|0?[1-9]):[0-5][0-9]\s*(AM|PM|am|pm)/i);
                                    if (timeMatch) {
                                        if (offset <= -2160) {
                                            cleanTime = `2 Days Before ${timeMatch[0].toUpperCase()}`;
                                        } else if (offset <= -720 || /(Fri|Before|Prev|Eve)/i.test(cleanTime)) {
                                            cleanTime = `Day Before ${timeMatch[0].toUpperCase()}`;
                                        } else {
                                            cleanTime = `Day Of ${timeMatch[0].toUpperCase()}`;
                                        }
                                    }
                                    groups[offset] = { offsetMinutes: offset, timeStr: cleanTime, events: {} };
                                }
                                if (!groups[offset].events[meatType]) {
                                    groups[offset].events[meatType] = [];
                                }
                                groups[offset].events[meatType].push({
                                    meatType,
                                    time: e.time || "",
                                    action: e.action || "",
                                    description: e.description || "",
                                    offsetMinutes: offset
                                });
                            }
                        });
                    }
                } catch (e) {
                    console.error("Failed to parse timeline for", meatType, e);
                }
            }
        });

        return Object.values(groups).sort((a, b) => a.offsetMinutes - b.offsetMinutes);
    }, [plans]);

    if (groupedEvents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-zinc-500 text-sm">
                <p>No timelines generated yet.</p>
                <p className="text-xs mt-2 text-zinc-600">Go to individual meat tabs and auto-generate timelines to see them here.</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto py-2 h-full flex flex-col">
            <h2 className="text-xl font-bebas tracking-widest text-indigo-400 mb-4 border-b border-zinc-800 pb-3 shrink-0">
                Master Execution Timeline
            </h2>
            
            <div className="flex-1 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950/50 shadow-2xl relative">
                <div className="min-w-[800px] md:min-w-[1000px]">
                    {/* Header */}
                    <div className="grid grid-cols-[100px_1fr_1fr_1fr_1fr] bg-zinc-900 border-b border-zinc-800 sticky top-0 z-20 shadow-md">
                        <div className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500 border-r border-zinc-800 text-center">
                            Time
                        </div>
                        {MEAT_COLUMNS.map(col => (
                            <div key={col} className={`p-4 text-xs font-bold uppercase tracking-widest border-r border-zinc-800 last:border-r-0 ${colorMapText[col] || 'text-zinc-300'}`}>
                                {col}
                            </div>
                        ))}
                    </div>

                    {/* Body */}
                    <div className="divide-y divide-zinc-800/50 pb-8">
                        {groupedEvents.map((group, i) => (
                            <div key={i} className="grid grid-cols-[100px_1fr_1fr_1fr_1fr] hover:bg-zinc-900/40 transition-colors group min-h-[80px]">
                                {/* Time Column */}
                                <div className="p-4 flex flex-col justify-start items-center border-r border-zinc-800/50 bg-zinc-950/80 relative">
                                    {/* Timeline subtle connecting line */}
                                    <div className="absolute top-0 bottom-0 left-1/2 w-px bg-zinc-800/40 -z-10 group-hover:bg-zinc-700/60 transition-colors"></div>
                                    
                                    <span className="text-xs font-bold text-white text-center bg-zinc-900 px-2 py-1 rounded border border-zinc-800 z-10">{group.timeStr}</span>
                                    {group.offsetMinutes !== 9999 && (
                                        <span className="text-[10px] text-zinc-500 font-mono mt-2 bg-zinc-950 px-1 z-10">
                                            {group.offsetMinutes < 0 ? `T${group.offsetMinutes}` : group.offsetMinutes === 0 ? "Turn-in" : `T+${group.offsetMinutes}`}
                                        </span>
                                    )}
                                </div>
                                
                                {/* Meat Columns */}
                                {MEAT_COLUMNS.map(meat => {
                                    const meatEvents = group.events[meat];
                                    
                                    if (!meatEvents || meatEvents.length === 0) {
                                        return <div key={meat} className="p-4 border-r border-zinc-900/50 last:border-r-0"></div>;
                                    }
                                    
                                    return (
                                        <div key={meat} className="p-3 border-r border-zinc-900/50 last:border-r-0 flex flex-col gap-3">
                                            {meatEvents.map((ev, idx) => (
                                                <div key={idx} className={`relative p-3 rounded-xl border ${borderGlowMap[meat]} ${bgGlowMap[meat]} shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}>
                                                    <div className="flex items-start gap-2 mb-2">
                                                        <div className={`w-2 h-2 mt-1 shrink-0 rounded-full ${dotColorMap[meat]} ${glowMap[meat]}`}></div>
                                                        <span className="text-xs font-bold text-white leading-tight">{ev.action}</span>
                                                    </div>
                                                    <p className="text-[10px] text-zinc-400 leading-relaxed">{ev.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
