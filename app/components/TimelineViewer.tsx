"use client";

import { useState } from "react";

interface TimelineNode {
    time: string;
    action: string;
    description: string;
}

export function TimelineViewer({ timelineStr }: { timelineStr: string }) {
    const [activeIndex, setActiveIndex] = useState(0);

    if (!timelineStr) {
        return (
            <div className="text-zinc-500 text-xs italic p-4 bg-zinc-950 rounded-lg border border-zinc-800 text-center">
                Set your ingredients, recipe, and turn-in time above, then hit Auto-Generate to create an expert cooking timeline.
            </div>
        );
    }

    let nodes: TimelineNode[] = [];
    try {
        nodes = JSON.parse(timelineStr);
    } catch (e) {
        return <div className="text-red-400 text-xs">Error parsing timeline json.</div>;
    }

    if (nodes.length === 0) return null;

    const activeNode = nodes[activeIndex] || nodes[0];

    return (
        <div className="space-y-4 pt-2 w-full">
            {/* Horizontal Axis Wrapper */}
            <div className="relative py-6">
                {/* Background Line */}
                <div className="absolute bottom-[8px] left-0 right-0 h-0.5 bg-zinc-800 z-0"></div>
                
                {/* Scrolling Container */}
                <div className="flex overflow-x-auto no-scrollbar relative z-10 snap-x snap-mandatory pb-4">
                    {nodes.map((node, i) => {
                        const isActive = i === activeIndex;
                        return (
                            <div 
                                key={i} 
                                onClick={() => setActiveIndex(i)}
                                className="flex flex-col items-center justify-end shrink-0 w-[120px] snap-center cursor-pointer group"
                            >
                                <span className={`text-[10px] font-bold mb-3 transition-colors text-center px-1 ${isActive ? 'text-orange-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                                    {node.time}
                                </span>
                                <div className={`w-4 h-4 rounded-full border-4 transition-all duration-300 ${
                                    isActive 
                                    ? 'bg-orange-500 border-zinc-900 scale-125 shadow-[0_0_15px_rgba(249,115,22,0.5)]' 
                                    : 'bg-zinc-800 border-zinc-900 group-hover:bg-zinc-600'
                                }`}></div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Premium Focus Card */}
            <div className="bg-zinc-950 border border-orange-500/30 rounded-2xl p-5 md:p-6 shadow-2xl relative overflow-hidden fade-in min-h-[160px]">
                {/* Subtle background glow */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-orange-500/10 blur-3xl rounded-full pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col h-full justify-center pb-8 md:pb-0 pr-0 md:pr-20">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3">
                        <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-md tracking-widest">{activeNode.time}</span>
                        <h3 className="text-lg md:text-xl font-bold text-white leading-tight">{activeNode.action}</h3>
                    </div>
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
                        onClick={() => setActiveIndex(Math.min(nodes.length - 1, activeIndex + 1))}
                        disabled={activeIndex === nodes.length - 1}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-900 border border-zinc-800 text-zinc-400 disabled:opacity-30 hover:text-white transition-colors"
                    >
                        →
                    </button>
                </div>
            </div>
        </div>
    );
}
