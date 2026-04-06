"use client";

import { useState } from "react";
import { CookPlan } from "./CookPlannerDashboard";
import { TimelineViewer } from "./TimelineViewer";
import { AIFeedbackPanel } from "./AIFeedbackPanel";
import { RecipePackage } from "../packages/page";

interface CookPlanFormProps {
    plan: CookPlan;
    onSave: (plan: CookPlan) => void;
    saving: boolean;
    packages: RecipePackage[];
}

export function CookPlanForm({ plan, onSave, saving, packages }: CookPlanFormProps) {
    const [turnInTime, setTurnInTime] = useState(plan.turnInTime || "");
    const [ingredients, setIngredients] = useState(plan.ingredients || "");
    const [recipe, setRecipe] = useState(plan.recipe || "");
    const [postNotes, setPostNotes] = useState(plan.postNotes || "");
    
    // New States
    const [injectionPackageId, setInjectionPackageId] = useState(plan.injectionPackageId || "");
    const [brinePackageId, setBrinePackageId] = useState(plan.brinePackageId || "");
    const [seasoningPackageId, setSeasoningPackageId] = useState(plan.seasoningPackageId || "");
    const [saucePackageId, setSaucePackageId] = useState(plan.saucePackageId || "");
    const [cookTimeNotes, setCookTimeNotes] = useState(plan.cookTimeNotes || "");
    const [score, setScore] = useState(plan.score || "");
    const [rank, setRank] = useState(plan.rank || "");

    const [aiLoading, setAiLoading] = useState(false);
    const [timelineStr, setTimelineStr] = useState(plan.timeline || "");
    const [feedback, setFeedback] = useState(plan.aiFeedback || "");

    const handleSave = () => {
        onSave({
            ...plan,
            turnInTime,
            ingredients,
            recipe,
            timeline: timelineStr,
            postNotes,
            aiFeedback: feedback,
            injectionPackageId,
            brinePackageId,
            seasoningPackageId,
            saucePackageId,
            cookTimeNotes,
            score: score ? parseFloat(score.toString()) : undefined,
            rank: rank ? parseInt(rank.toString()) : undefined,
        });
    };

    const handleGenerateTimeline = async () => {
        if (!turnInTime) {
            alert("Please set a Target Turn-In Time to generate a timeline.");
            return;
        }

        setAiLoading(true);
        try {
            const res = await fetch("/api/ai/timeline", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    meatType: plan.meatType,
                    turnInTime,
                    ingredients,
                    recipe,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                const newTimelineStr = JSON.stringify(data.timeline);
                setTimelineStr(newTimelineStr);
                // Automatically save when an AI feature triggers so we persist it
                onSave({ ...plan, turnInTime, ingredients, recipe, timeline: newTimelineStr, postNotes, aiFeedback: feedback });
            } else {
                alert("Failed to generate timeline. Please try again.");
            }
        } catch (e) {
            console.error(e);
            alert("Error generating timeline");
        }
        setAiLoading(false);
    };

    const handleGenerateFeedback = async () => {
        if (!postNotes) {
            alert("Please add some Post-Cook Notes about how the cook went to get feedback.");
            return;
        }

        setAiLoading(true);
        try {
            let currentTimeline = [];
            if (timelineStr) {
                try { currentTimeline = JSON.parse(timelineStr); } catch (e) { }
            }

            const res = await fetch("/api/ai/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    meatType: plan.meatType,
                    ingredients,
                    recipe,
                    timeline: currentTimeline,
                    postNotes,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                const newFeedback = data.feedback;
                setFeedback(newFeedback);
                onSave({ ...plan, turnInTime, ingredients, recipe, timeline: timelineStr, postNotes, aiFeedback: newFeedback });
            } else {
                alert("Failed to generate feedback.");
            }
        } catch (e) {
            console.error(e);
            alert("Error generating feedback");
        }
        setAiLoading(false);
    };

    return (
        <div className="space-y-6 pb-20 max-w-2xl mx-auto">

            {/* PRE-COOK PLANNING */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-300 border-b border-zinc-800 pb-2 flex items-center gap-2">
                    <span className="text-orange-500 font-black">1.</span> {plan.meatType} Pre-Cook Prep
                </h3>

                <div>
                    <label className="block text-xs uppercase text-zinc-500 mb-1">Target Turn-In Time</label>
                    <input
                        type="text"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                        placeholder="e.g., Saturday 12:00 PM"
                        value={turnInTime}
                        onChange={(e) => setTurnInTime(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs uppercase text-zinc-500 mb-1 font-bold tracking-widest">Library Packages Used</label>
                    <p className="text-[10px] text-zinc-500 mb-3">Link your saved recipes here to track what was used for this cook.</p>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <select
                                value={injectionPackageId}
                                onChange={(e) => setInjectionPackageId(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-zinc-700 transition-colors"
                            >
                                <option value="">No Injection Selected</option>
                                {packages.filter(p => p.packageType === "INJECTION").map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <select
                                value={brinePackageId}
                                onChange={(e) => setBrinePackageId(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-zinc-700 transition-colors"
                            >
                                <option value="">No Brine Selected</option>
                                {packages.filter(p => p.packageType === "BRINE").map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <select
                                value={seasoningPackageId}
                                onChange={(e) => setSeasoningPackageId(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-zinc-700 transition-colors"
                            >
                                <option value="">No Seasoning Selected</option>
                                {packages.filter(p => p.packageType === "SEASONING").map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <select
                                value={saucePackageId}
                                onChange={(e) => setSaucePackageId(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-zinc-700 transition-colors"
                            >
                                <option value="">No Sauce Selected</option>
                                {packages.filter(p => p.packageType === "SAUCE").map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs uppercase text-zinc-500 mb-1">Custom Ingredients (Extras)</label>
                    <textarea
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-orange-500 transition-colors min-h-[60px]"
                        placeholder="e.g., Kosmos Q Cow Cover, extra brown sugar..."
                        value={ingredients}
                        onChange={(e) => setIngredients(e.target.value)}
                    />
                </div>


                <div>
                    <label className="block text-xs uppercase text-zinc-500 mb-1">Recipe / Cook Method</label>
                    <textarea
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-orange-500 transition-colors min-h-[100px]"
                        placeholder="e.g., Hot and fast at 300°F. Wrap in butcher paper at 170°F."
                        value={recipe}
                        onChange={(e) => setRecipe(e.target.value)}
                    />
                </div>
            </div>

            {/* AI TIMELINE GENERATOR */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-end border-b border-zinc-800 pb-2 mb-2">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-300 flex items-center gap-2">
                        <span className="text-orange-500 font-black">2.</span> {plan.meatType} Timeline
                    </h3>
                    <button
                        onClick={handleGenerateTimeline}
                        disabled={aiLoading || saving}
                        className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1 disabled:opacity-50"
                    >
                        {aiLoading ? "Thinking..." : "✨ Auto-Generate"}
                    </button>
                </div>

                <TimelineViewer timelineStr={timelineStr} />
                
                <div className="pt-4 border-t border-zinc-800">
                    <label className="block text-xs uppercase text-zinc-500 mb-1 font-bold">On-Site Cook Notes (Adjustments, Weather, Cook Times)</label>
                    <textarea
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-orange-500 transition-colors min-h-[80px]"
                        placeholder="e.g., Windy day, increased temps to 300F halfway. Wrapped 30m early."
                        value={cookTimeNotes}
                        onChange={(e) => setCookTimeNotes(e.target.value)}
                    />
                </div>
            </div>

            {/* POST-COOK FEEDBACK */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-300 border-b border-zinc-800 pb-2 flex items-center gap-2">
                    <span className="text-orange-500 font-black">3.</span> {plan.meatType} Feedback & Results
                </h3>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs uppercase text-zinc-500 mb-1 font-bold">Score (out of 180)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                            placeholder="e.g., 176.5"
                            value={score}
                            onChange={(e) => setScore(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs uppercase text-zinc-500 mb-1 font-bold">Rank / Place</label>
                        <input
                            type="number"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                            placeholder="e.g., 1"
                            value={rank}
                            onChange={(e) => setRank(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs uppercase text-zinc-500 mb-1">How did it go?</label>
                    <textarea
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-orange-500 transition-colors min-h-[100px]"
                        placeholder="e.g., Placed 8th. The flat got a little dry because we rested it too long in the cooler, but flavor was money."
                        value={postNotes}
                        onChange={(e) => setPostNotes(e.target.value)}
                    />
                </div>

                <div className="flex justify-end pt-1">
                    <button
                        onClick={handleGenerateFeedback}
                        disabled={aiLoading || saving || !postNotes}
                        className="text-xs bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1 disabled:opacity-50"
                    >
                        {aiLoading ? "Thinking..." : "🍖 Ask a Pitmaster"}
                    </button>
                </div>

                <AIFeedbackPanel feedback={feedback} />
            </div>

            {/* GLOBAL SAVE */}
            <div className="fixed bottom-0 left-0 lg:left-64 right-0 p-4 bg-zinc-950 border-t border-zinc-800 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-zinc-100 hover:bg-white text-zinc-900 font-bold px-6 py-3 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 text-sm"
                >
                    {saving ? "Saving..." : `Save ${plan.meatType} Plan`}
                </button>
            </div>

        </div>
    );
}
