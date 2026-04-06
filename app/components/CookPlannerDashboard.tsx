"use client";

import { useState, useEffect } from "react";
import { EventItem } from "./EventCard";
import { RecipePackage } from "../packages/page";
import { MasterTimelineView } from "./MasterTimelineView";
import { AIFeedbackPanel } from "./AIFeedbackPanel";

const MEAT_TYPES = ["Brisket", "Ribs", "Pork", "Chicken"];

const meatColors: Record<string, string> = {
    Brisket: "text-red-500",
    Pork: "text-pink-500",
    Ribs: "text-orange-500",
    Chicken: "text-yellow-500",
};

const meatBorders: Record<string, string> = {
    Brisket: "border-red-500/20",
    Pork: "border-pink-500/20",
    Ribs: "border-orange-500/20",
    Chicken: "border-yellow-500/20",
};

export interface CookPlan {
    id?: string;
    meatType: string;
    turnInTime?: string;
    ingredients?: string;
    recipe?: string;
    timeline?: string; // JSON string
    postNotes?: string;
    aiFeedback?: string;
    injectionPackageId?: string;
    brinePackageId?: string;
    seasoningPackageId?: string;
    saucePackageId?: string;
    cookTimeNotes?: string;
    score?: number;
    rank?: number;
}

export function CookPlannerDashboard({ event, onBack }: { event: EventItem; onBack: () => void }) {
    const [plans, setPlans] = useState<Record<string, CookPlan>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [packages, setPackages] = useState<RecipePackage[]>([]);
    
    // AI Loading states
    const [generatingTimelines, setGeneratingTimelines] = useState(false);
    const [generatingFeedback, setGeneratingFeedback] = useState(false);

    useEffect(() => {
        Promise.all([
            fetch(`/api/cook-plan?eventId=${event.id}`).then(r => r.json()),
            fetch("/api/packages").then(r => r.json())
        ]).then(([planData, pkgsData]) => {
            if (planData.cookPlans) {
                const map: Record<string, CookPlan> = {};
                planData.cookPlans.forEach((p: CookPlan) => {
                    map[p.meatType] = p;
                });
                setPlans(map);
            }
            if (pkgsData.packages) {
                setPackages(pkgsData.packages);
            }
        }).catch(console.error).finally(() => setLoading(false));
    }, [event.id]);

    const updatePlan = (meat: string, field: keyof CookPlan, value: any) => {
        setPlans(prev => ({
            ...prev,
            [meat]: { ...(prev[meat] || { meatType: meat }), [field]: value }
        }));
    };

    const handleSaveAll = async (currentPlans = plans) => {
        setSaving(true);
        try {
            const mapped = MEAT_TYPES.map(async (meat) => {
                const p = currentPlans[meat];
                if (!p) return null;
                const res = await fetch("/api/cook-plan", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...p, eventId: event.id }),
                });
                if (res.ok) {
                    const data = await res.json();
                    return data.cookPlan;
                }
                return null;
            });
            
            const results = await Promise.all(mapped);
            
            // Re-merge saved IDs
            setPlans(prev => {
                const next = { ...prev };
                results.forEach(savedPlan => {
                    if (savedPlan) next[savedPlan.meatType] = savedPlan;
                });
                return next;
            });
            
        } catch (e) {
            console.error(e);
        }
        setSaving(false);
    };

    const handleGenerateTimelines = async () => {
        setGeneratingTimelines(true);
        const nextPlans = { ...plans };
        
        try {
            await Promise.all(MEAT_TYPES.map(async (meat) => {
                const p = plans[meat];
                if (!p || !p.turnInTime) return; // Must have turn in time
                
                const res = await fetch("/api/ai/timeline", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ meatType: meat, turnInTime: p.turnInTime, ingredients: p.ingredients, recipe: p.recipe })
                });
                if (res.ok) {
                    const data = await res.json();
                    nextPlans[meat] = { ...p, timeline: JSON.stringify(data.timeline) };
                }
            }));
            setPlans(nextPlans);
            await handleSaveAll(nextPlans); // Auto-save after generating
        } catch(e) {
            console.error(e);
            alert("Error generating timelines");
        }
        setGeneratingTimelines(false);
    };

    const handleGenerateFeedbackAll = async () => {
        setGeneratingFeedback(true);
        const nextPlans = { ...plans };
        
        try {
            const meatsToReview = MEAT_TYPES.filter(m => {
                const p = plans[m];
                return p && (p.postNotes || p.recipe || p.timeline || p.ingredients);
            });
            
            if (meatsToReview.length === 0) {
                alert("Please add some execution notes, strategies, or generate a timeline first before asking for feedback!");
                setGeneratingFeedback(false);
                return;
            }

            await Promise.all(meatsToReview.map(async (meat) => {
                const p = plans[meat];
                
                let currentTimeline = [];
                if (p.timeline) {
                    try { currentTimeline = JSON.parse(p.timeline); } catch (e) { }
                }
                
                const res = await fetch("/api/ai/feedback", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ meatType: meat, ingredients: p.ingredients, recipe: p.recipe, timeline: currentTimeline, postNotes: p.postNotes })
                });
                if (res.ok) {
                    const data = await res.json();
                    nextPlans[meat] = { ...p, aiFeedback: data.feedback };
                }
            }));
            setPlans(nextPlans);
            await handleSaveAll(nextPlans);
        } catch(e) {
            console.error(e);
            alert("Error generating feedback");
        }
        setGeneratingFeedback(false);
    };

    const renderInput = (meat: string, label: string, field: keyof CookPlan, type: string = "text", placeholder: string = "") => {
        const value = plans[meat]?.[field] || "";
        return (
            <div className="mb-3">
                <label className="block text-[10px] uppercase text-zinc-500 mb-1 tracking-widest font-semibold">{label}</label>
                {type === "textarea" ? (
                    <textarea 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-zinc-500 transition-colors min-h-[60px]"
                        placeholder={placeholder}
                        value={value as string}
                        onChange={e => updatePlan(meat, field, e.target.value)}
                    />
                ) : (
                    <input 
                        type={type}
                        step={type === "number" ? "0.01" : undefined}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                        placeholder={placeholder}
                        value={value as string}
                        onChange={e => updatePlan(meat, field, type === "number" ? (e.target.value ? Number(e.target.value) : "") : e.target.value)}
                    />
                )}
            </div>
        );
    };

    const renderSelect = (meat: string, label: string, field: keyof CookPlan, pkgType: string) => {
        const value = plans[meat]?.[field] || "";
        return (
            <div className="mb-3">
                <label className="block text-[10px] uppercase text-zinc-500 mb-1 tracking-widest font-semibold">{label}</label>
                <select 
                    value={value as string}
                    onChange={e => updatePlan(meat, field, e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                >
                    <option value="">No Selection</option>
                    {packages.filter(p => p.packageType === pkgType).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-zinc-950 text-white">
            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900 shrink-0 flex flex-col md:flex-row items-center gap-4 justify-between z-10 shadow-md">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
                        <span className="text-xl">←</span>
                        <span className="text-xs uppercase font-bold tracking-widest hidden md:inline">Back</span>
                    </button>
                    <div className="flex-1 truncate">
                        <h2 className="text-lg font-bebas tracking-widest text-orange-400 truncate">{event.name}</h2>
                        <p className="text-[10px] text-zinc-500 uppercase">{new Date(event.date).toLocaleDateString()} • Master Event Planner</p>
                    </div>
                </div>
                
                <button
                    onClick={() => handleSaveAll(plans)}
                    disabled={saving}
                    className="bg-white hover:bg-zinc-200 text-zinc-900 font-bold px-6 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 text-sm shadow-md shrink-0 w-full md:w-auto justify-center"
                >
                    {saving ? "Saving All..." : "Save Route Strategy"}
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 content-start pb-32">
                {loading ? (
                    <div className="flex items-center justify-center p-12 text-zinc-500 text-sm animate-pulse">Loading strategy...</div>
                ) : (
                    <div className="max-w-[1400px] mx-auto space-y-12">
                        
                        {/* PHASE 1: PREP */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-bebas tracking-widest text-zinc-100 border-b border-zinc-800 pb-3">Phase 1: Concurrent Pre-Cook Prep</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {MEAT_TYPES.map(meat => (
                                    <div key={meat} className={`bg-zinc-900/50 border ${meatBorders[meat]} rounded-xl p-4 flex flex-col`}>
                                        <h4 className={`text-center font-bebas text-lg tracking-widest mb-4 border-b border-zinc-800/50 pb-2 ${meatColors[meat]}`}>{meat} Strategy</h4>
                                        
                                        {renderInput(meat, "Target Turn-In", "turnInTime", "text", "e.g., Sat 12:00 PM")}
                                        
                                        <div className="mt-2 pt-3 border-t border-zinc-800/50">
                                            <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-2 font-bold">Flavor Profiles</p>
                                            {renderSelect(meat, "Injection", "injectionPackageId", "INJECTION")}
                                            {renderSelect(meat, "Brine", "brinePackageId", "BRINE")}
                                            {renderSelect(meat, "Seasoning", "seasoningPackageId", "SEASONING")}
                                            {renderSelect(meat, "Sauce", "saucePackageId", "SAUCE")}
                                            {renderInput(meat, "Extras (Custom)", "ingredients", "textarea", "e.g., Apple juice spritz")}
                                        </div>

                                        <div className="mt-2 pt-3 border-t border-zinc-800/50 flex-1">
                                            <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-2 font-bold">Execution</p>
                                            {renderInput(meat, "Cook Method", "recipe", "textarea", "e.g., Wrap at 165F in butcher paper.")}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* PHASE 2: TIMELINE */}
                        <div className="space-y-4">
                            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-zinc-800 pb-3 gap-4">
                                <div>
                                    <h3 className="text-xl font-bebas tracking-widest text-zinc-100">Phase 2: Execution Schedule</h3>
                                    <p className="text-xs text-zinc-500">Auto-generate a combined timeline based on your turn-in targets and cook methods.</p>
                                </div>
                                <button
                                    onClick={handleGenerateTimelines}
                                    disabled={generatingTimelines || saving}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm shadow-lg whitespace-nowrap shrink-0 flex items-center justify-center gap-2"
                                >
                                    {generatingTimelines ? "Thinking..." : "✨ Generate Master Timeline"}
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                {MEAT_TYPES.map(meat => (
                                    <div key={meat} className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg">
                                         {renderInput(meat, `${meat} On-Site Adjustments`, "cookTimeNotes", "textarea", "Weather notes or live cook changes...")}
                                    </div>
                                ))}
                            </div>

                            <MasterTimelineView plans={plans} />
                        </div>

                        {/* PHASE 3: RESULTS */}
                        <div className="space-y-4">
                            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-zinc-800 pb-3 gap-4">
                                <div>
                                    <h3 className="text-xl font-bebas tracking-widest text-zinc-100">Phase 3: Results & AI Coach</h3>
                                    <p className="text-xs text-zinc-500">Record how it went and get unified feedback on your strategy.</p>
                                </div>
                                <button
                                    onClick={handleGenerateFeedbackAll}
                                    disabled={generatingFeedback || saving}
                                    className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm shadow-lg whitespace-nowrap shrink-0 flex items-center justify-center gap-2"
                                >
                                    {generatingFeedback ? "Analyzing Strategy..." : "🍖 Ask a Pitmaster"}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {MEAT_TYPES.map(meat => (
                                    <div key={meat} className={`bg-zinc-900/50 border ${meatBorders[meat]} rounded-xl p-4 flex flex-col gap-2`}>
                                        <h4 className={`font-bebas text-lg tracking-widest mb-1 ${meatColors[meat]}`}>{meat} Results</h4>
                                        <div className="flex gap-2">
                                            <div className="flex-1">{renderInput(meat, "Score", "score", "number", "180")}</div>
                                            <div className="flex-1">{renderInput(meat, "Rank", "rank", "number", "1st")}</div>
                                        </div>
                                        {renderInput(meat, "Debrief Notes", "postNotes", "textarea", "What went well? What failed?")}
                                        
                                        {plans[meat]?.aiFeedback && (
                                            <div className="mt-4 border-t border-zinc-800/50 pt-4">
                                                <AIFeedbackPanel feedback={plans[meat]!.aiFeedback!} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}

