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

export function MasterTimelineView({ plans }: { plans: Record<string, CookPlan> }) {
    const [activeIndex, setActiveIndex] = useState(0);

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

    const activeNode = sortedEvents[activeIndex] || sortedEvents[0];
    const borderGlow = borderGlowMap[activeNode.meatType] || "border-zinc-800";
    const bgGlow = bgGlowMap[activeNode.meatType] || "bg-zinc-800/10";
    const activeText = colorMapText[activeNode.meatType] || "text-zinc-400";

    return (
        <div className="w-full max-w-4xl mx-auto py-2">
            <h2 className="text-xl font-bebas tracking-widest text-indigo-400 mb-6 border-b border-zinc-800 pb-4">
                Master Execution Timeline
            </h2>
            
            {/* Horizontal Axis Wrapper */}
            <div className="relative py-6 mb-6 overflow-hidden max-w-full">
                {/* Background Line */}
                <div className="absolute bottom-[8px] left-0 right-0 h-0.5 bg-zinc-800 z-0"></div>
                
                {/* Scrolling Container */}
                <div className="flex overflow-x-auto no-scrollbar relative z-10 snap-x snap-mandatory pb-4">
                    {/* Add leading/trailing spacer for better centering on ends */}
                    <div className="shrink-0 w-8 md:w-20"></div>
                    
                    {sortedEvents.map((node, i) => {
                        const isActive = i === activeIndex;
                        const dotColor = dotColorMap[node.meatType] || "bg-zinc-500";
                        const activeGlow = glowMap[node.meatType] || "";
                        
                        return (
                            <div 
                                key={i} 
                                onClick={() => setActiveIndex(i)}
                                className="flex flex-col items-center justify-end shrink-0 w-[100px] md:w-[120px] snap-center cursor-pointer group"
                            >
                                <div className="flex flex-col items-center mb-3">
                                    <span className={`text-[9px] uppercase tracking-widest font-bold mb-1 transition-colors ${isActive ? colorMapText[node.meatType] : 'text-zinc-600 group-hover:text-zinc-500'}`}>
                                        {node.meatType}
                                    </span>
                                    <span className={`text-[10px] font-bold transition-colors text-center px-1 ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                                        {node.time}
                                    </span>
                                </div>
                                <div className={`w-4 h-4 rounded-full border-4 transition-all duration-300 ${
                                    isActive 
                                    ? `${dotColor} border-zinc-900 scale-125 ${activeGlow}` 
                                    : `${dotColor} border-zinc-900 opacity-40 group-hover:opacity-80`
                                }`}></div>
                            </div>
                        );
                    })}
                    
                    <div className="shrink-0 w-8 md:w-20"></div>
                </div>
            </div>

            {/* Premium Focus Card */}
            <div className={`bg-zinc-950 border ${borderGlow} rounded-2xl p-5 md:p-6 shadow-2xl relative overflow-hidden fade-in min-h-[160px] transition-colors duration-500`}>
                {/* Subtle background glow */}
                <div className={`absolute -top-20 -right-20 w-40 h-40 ${bgGlow} blur-3xl rounded-full pointer-events-none transition-colors duration-500`}></div>
                
                <div className="relative z-10 flex flex-col h-full justify-center pb-8 md:pb-0 pr-0 md:pr-20">
                    <div className="flex flex-wrap gap-2 items-center mb-3">
                        <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-sm border ${borderGlow} ${activeText} ${bgGlow}`}>
                            {activeNode.meatType}
                        </span>
                        <span className="text-sm font-bold text-white tracking-widest bg-zinc-900 px-2.5 py-1 rounded">{activeNode.time}</span>
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-white leading-tight mb-2">{activeNode.action}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl">{activeNode.description}</p>
                </div>
                
                {/* Navigation helpers */}
                <div className="absolute bottom-4 right-4 flex gap-2">
                    <button 
                        onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
                        disabled={activeIndex === 0}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-900 border border-zinc-800 text-zinc-400 disabled:opacity-30 hover:text-white transition-colors"
                    >
                        ←
                    </button>
                    <button 
                        onClick={() => setActiveIndex(Math.min(sortedEvents.length - 1, activeIndex + 1))}
                        disabled={activeIndex === sortedEvents.length - 1}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-900 border border-zinc-800 text-zinc-400 disabled:opacity-30 hover:text-white transition-colors"
                    >
                        →
                    </button>
                </div>
            </div>
        </div>
    );
}
