"use client";

import { useMemo, useState } from "react";
import { CookPlan } from "./CookPlannerDashboard";

interface TimelineEvent {
    meatType: string;
    time: string;
    action: string;
    description: string;
    offsetMinutes: number;
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
const PIXELS_PER_MINUTE = 2.5; // 150px per hour for a taller, cleaner calendar view

function findTurnInTimeOfDay(plans: Record<string, CookPlan>) {
    for (const plan of Object.values(plans)) {
        if (plan.timeline) {
            try {
                const parsed = JSON.parse(plan.timeline);
                for (const e of parsed) {
                    const match = (e.time || "").match(/(1[0-2]|0?[1-9]):([0-5][0-9])\s*(AM|PM|am|pm)/i);
                    if (match && typeof e.offsetMinutes === "number") {
                        let hours = parseInt(match[1]);
                        const mins = parseInt(match[2]);
                        const isPM = match[3].toUpperCase() === "PM";
                        if (isPM && hours < 12) hours += 12;
                        if (!isPM && hours === 12) hours = 0;
                        const eventMinutesOfDay = (hours * 60) + mins;
                        
                        const rawTurnIn = eventMinutesOfDay - e.offsetMinutes;
                        const turnInTimeOfDay = ((rawTurnIn % 1440) + 1440) % 1440;
                        return turnInTimeOfDay;
                    }
                }
            } catch(e) {}
        }
    }
    return 720; // 12:00 PM default fallback
}

function getFormattedTime(offset: number, turnInTimeOfDay: number) {
    const absolute = turnInTimeOfDay + offset;
    const days = Math.floor(absolute / 1440); 
    const timeOfDay = ((absolute % 1440) + 1440) % 1440;
    
    let dayStr = "Day Of";
    if (days === -1) dayStr = "Day Before";
    else if (days < -1) dayStr = `${Math.abs(days)} Days Before`;
    else if (days === 1) dayStr = "Day After";
    else if (days > 1) dayStr = `${days} Days After`;
    
    let hours = Math.floor(timeOfDay / 60);
    const mins = timeOfDay % 60;
    const ampm = hours >= 12 ? "PM" : "AM";
    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;

    return `${dayStr} ${hours}:${mins.toString().padStart(2, '0')} ${ampm}`;
}

function TimelineEventBlock({ event, height, meat }: { event: TimelineEvent, height: number, meat: string }) {
    const [expanded, setExpanded] = useState(false);
    
    const isVeryShort = height < 60; // Less than ~24 minutes will truncate description naturally
    const displayHeight = expanded ? "auto" : `${height}px`;

    return (
        <div 
            onClick={() => setExpanded(!expanded)}
            className={`absolute left-1 right-1 lg:left-2 lg:right-2 rounded-xl border ${borderGlowMap[meat]} ${bgGlowMap[meat]} 
                transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-sm flex flex-col group
                ${expanded ? 'z-50 shadow-2xl !pb-3 min-h-[80px]' : 'z-10 hover:shadow-lg hover:brightness-110'}`}
            style={{ 
                top: 0, // Injected via parent style relative to column
                height: displayHeight,
                minHeight: expanded ? undefined : Math.max(height, 24) + "px" // Absolute min visual block height for extremely short events
            }}
        >
            <div className={`p-2 flex flex-col flex-1 ${expanded ? '' : 'truncate'}`}>
                <div className="flex items-start gap-1.5 shrink-0 mb-1">
                    <div className={`w-2 h-2 mt-[5px] shrink-0 rounded-full ${dotColorMap[meat]}`}></div>
                    <span className="text-[11px] md:text-sm font-bold text-white/90 leading-tight whitespace-normal line-clamp-2">
                        {event.action}
                    </span>
                </div>
                
                {(!isVeryShort || expanded) && (
                    <p className={`text-[9.5px] md:text-[11px] text-zinc-300/80 leading-relaxed mt-1 pl-3.5 
                        ${expanded ? 'whitespace-normal' : 'line-clamp-4 overflow-hidden'}`}>
                        {event.description}
                    </p>
                )}
            </div>
            
            {/* Expanded footer or fade-out gradient indicator */}
            {expanded ? (
                <div className="px-3 pt-2 mt-auto border-t border-zinc-800/50 flex justify-between text-[9px] uppercase tracking-widest text-zinc-400 font-bold bg-black/20">
                    <span>{event.time}</span>
                    <span>T{event.offsetMinutes < 0 ? event.offsetMinutes : `+${event.offsetMinutes}`} M</span>
                </div>
            ) : height > 150 && (
                <div className="mt-auto h-12 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            )}
        </div>
    );
}

export function MasterTimelineView({ plans }: { plans: Record<string, CookPlan> }) {
    const { minOffset, maxOffset, turnInTimeOfDay, processedMeats, totalEvents } = useMemo(() => {
        let min = 0;
        let max = 120; // Ensure timeline goes at least 2 hours post-turn in
        let count = 0;
        const orgMeats: Record<string, TimelineEvent[]> = {
            Brisket: [], Ribs: [], Pork: [], Chicken: []
        };
        
        Object.entries(plans).forEach(([meatType, plan]) => {
            if (plan.timeline) {
                try {
                    const parsed = JSON.parse(plan.timeline);
                    const events: TimelineEvent[] = [];
                    parsed.forEach((e: any) => {
                        if (e.action && typeof e.offsetMinutes === "number") {
                            events.push({
                                meatType,
                                time: e.time || "",
                                action: e.action,
                                description: e.description || "",
                                offsetMinutes: e.offsetMinutes
                            });
                            if (e.offsetMinutes < min) min = e.offsetMinutes;
                            if (e.offsetMinutes > max) max = e.offsetMinutes;
                            count++;
                        }
                    });
                    orgMeats[meatType] = events.sort((a,b) => a.offsetMinutes - b.offsetMinutes);
                } catch(e) {}
            }
        });
        
        // Pad the min and max safely to the nearest hour chunks
        min = Math.floor(min / 60) * 60;
        max = Math.ceil(max / 60) * 60;
        if (min > -120) min = -120; // Force layout to start slightly before 0
        
        const turnIn = findTurnInTimeOfDay(plans);
        
        return { minOffset: min, maxOffset: max, turnInTimeOfDay: turnIn, processedMeats: orgMeats, totalEvents: count };
    }, [plans]);

    if (totalEvents === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-zinc-500 text-sm">
                <p>No timelines generated yet.</p>
                <p className="text-xs mt-2 text-zinc-600">Go to individual meat strategies and auto-generate timelines to see them constructed here.</p>
            </div>
        );
    }

    const totalMinutes = maxOffset - minOffset;
    const totalHours = totalMinutes / 60;
    const hoursArray = Array.from({ length: totalHours + 1 }, (_, i) => minOffset + (i * 60));

    return (
        <div className="w-full max-w-7xl mx-auto py-2 h-[800px] flex flex-col pointer-events-auto">
            <h2 className="text-xl font-bebas tracking-widest text-indigo-400 mb-4 border-b border-zinc-800 pb-3 shrink-0 flex justify-between items-end">
                <span>Master Execution Timeline</span>
                <span className="text-[10px] text-zinc-500 font-sans tracking-wide">Calendar Layout</span>
            </h2>
            
            <div className="flex-1 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950/80 shadow-2xl relative custom-scrollbar">
                <div className="min-w-[800px] md:min-w-[1000px] relative">
                    
                    {/* Header: Sticky Columns */}
                    <div className="grid grid-cols-[100px_1fr_1fr_1fr_1fr] md:grid-cols-[120px_1fr_1fr_1fr_1fr] bg-zinc-900 border-b border-zinc-800 sticky top-0 z-30 shadow-md">
                        <div className="p-3 md:p-4 text-xs font-bold uppercase tracking-widest text-zinc-500 border-r border-zinc-800 text-center flex items-center justify-center bg-zinc-950">
                            Time
                        </div>
                        {MEAT_COLUMNS.map(col => (
                            <div key={col} className={`p-3 md:p-4 text-xs lg:text-sm font-bebas tracking-widest border-r border-zinc-800 last:border-r-0 text-center ${colorMapText[col] || 'text-zinc-300'}`}>
                                {col}
                            </div>
                        ))}
                    </div>

                    {/* Timeline Canvas */}
                    <div 
                        className="relative w-full"
                        style={{ height: `${totalMinutes * PIXELS_PER_MINUTE}px` }}
                    >
                        {/* Background continuous hour lines */}
                        <div className="absolute inset-0 z-0 flex flex-col pointer-events-none">
                            {hoursArray.map(offset => (
                                <div 
                                    key={`bg-${offset}`}
                                    style={{ top: `${(offset - minOffset) * PIXELS_PER_MINUTE}px` }}
                                    className={`absolute w-full h-px ${offset === 0 ? 'bg-orange-500/80 shadow-[0_0_8px_rgba(249,115,22,0.8)] z-20' : 'bg-zinc-800/40'}`}
                                />
                            ))}
                        </div>

                        {/* Foreground Layout Grid */}
                        <div className="grid grid-cols-[100px_1fr_1fr_1fr_1fr] md:grid-cols-[120px_1fr_1fr_1fr_1fr] h-full absolute inset-0 z-10 isolate">
                            
                            {/* Y-Axis Label Column */}
                            <div className="border-r border-zinc-800/80 relative bg-zinc-950/90 backdrop-blur-sm z-20">
                                {hoursArray.map(offset => {
                                    const timeStr = getFormattedTime(offset, turnInTimeOfDay);
                                    const [dayPart, timePart] = timeStr.split(/\s(?=\d)/); // Split "Day Before" and "6:00 PM"
                                    
                                    return (
                                        <div 
                                            key={`label-${offset}`} 
                                            style={{ top: `${(offset - minOffset) * PIXELS_PER_MINUTE}px` }} 
                                            className="absolute w-full flex flex-col items-center justify-start pointer-events-none -translate-y-1/2 mt-3"
                                        >
                                            {offset === 0 && (
                                                <div className="text-[9px] uppercase tracking-widest text-orange-400 font-bold bg-zinc-900 px-2 py-0.5 rounded border border-orange-500/50 shadow-sm mb-1">Turn-In Target</div>
                                            )}
                                            <span className="text-[9px] font-bold text-zinc-400/90 tracking-wide text-center px-1 leading-tight">{dayPart}</span>
                                            <span className="text-[11px] font-bold text-white tracking-wider">{timePart}</span>
                                            <span className="text-[8px] text-zinc-600 font-mono font-semibold mt-0.5">{offset < 0 ? `T${offset}` : `T+${offset}`}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Meat Event Columns */}
                            {MEAT_COLUMNS.map(meat => {
                                const meatEvents = processedMeats[meat];
                                return (
                                    <div key={`col-${meat}`} className="border-r border-zinc-900/40 relative last:border-r-0 h-full">
                                        {meatEvents.map((ev, i) => {
                                            const startDiff = ev.offsetMinutes - minOffset;
                                            const nextEv = meatEvents[i + 1];
                                            
                                            // Determine duration in minutes based on next event, capped dynamically to layout
                                            let durationMin = 45; // Default short duration
                                            if (nextEv) {
                                                durationMin = nextEv.offsetMinutes - ev.offsetMinutes;
                                            } else {
                                                // Last event: standard 60 minutes or pad to the end of maxOffset
                                                durationMin = Math.min((maxOffset - ev.offsetMinutes), 60);
                                                if (durationMin < 30) durationMin = 30; // Don't let last block get infinitely smushed
                                            }
                                            
                                            const topPX = startDiff * PIXELS_PER_MINUTE;
                                            const heightPX = durationMin * PIXELS_PER_MINUTE;

                                            return (
                                                <div
                                                    key={`ev-${meat}-${i}`}
                                                    style={{ top: `${topPX}px`, height: `${heightPX}px` }}
                                                    className="absolute w-full"
                                                >
                                                    <TimelineEventBlock meat={meat} event={ev} height={heightPX} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
            <p className="text-[10px] text-zinc-500 text-center mt-3 tracking-widest uppercase font-bold shrink-0">Click any block to expand details</p>
        </div>
    );
}
