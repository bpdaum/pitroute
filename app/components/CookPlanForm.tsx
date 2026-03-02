"use client";

import { useState } from "react";
import { CookPlan } from "./CookPlannerDashboard";
import { TimelineViewer } from "./TimelineViewer";
import { AIFeedbackPanel } from "./AIFeedbackPanel";

interface CookPlanFormProps {
    plan: CookPlan;
    onSave: (plan: CookPlan) => void;
    saving: boolean;
}

export function CookPlanForm({ plan, onSave, saving }: CookPlanFormProps) {
    const [turnInTime, setTurnInTime] = useState(plan.turnInTime || "");
    const [ingredients, setIngredients] = useState(plan.ingredients || "");
    const [recipe, setRecipe] = useState(plan.recipe || "");
    const [postNotes, setPostNotes] = useState(plan.postNotes || "");

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
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-300 border-b border-zinc-800 pb-2">
                    1. Pre-Cook Prep
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
                    <label className="block text-xs uppercase text-zinc-500 mb-1">Ingredients (Rubs, Injections, Spritz)</label>
                    <textarea
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-orange-500 transition-colors min-h-[80px]"
                        placeholder="e.g., Kosmos Q Cow Cover, Butcher BBQ Brisket Injection..."
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
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-300">
                        2. Cook Timeline
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
            </div>

            {/* POST-COOK FEEDBACK */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-300 border-b border-zinc-800 pb-2">
                    3. Post-Cook Feedback
                </h3>

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
                    {saving ? "Saving..." : "Save Cook Plan"}
                </button>
            </div>

        </div>
    );
}
