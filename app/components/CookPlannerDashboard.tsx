"use client";

import { useState, useEffect } from "react";
import { EventItem } from "./EventCard";
import { CookPlanForm } from "./CookPlanForm";

const MEAT_TYPES = ["Brisket", "Ribs", "Pork", "Chicken"];

export interface CookPlan {
    id?: string;
    meatType: string;
    turnInTime?: string;
    ingredients?: string;
    recipe?: string;
    timeline?: string; // JSON string
    postNotes?: string;
    aiFeedback?: string;
}

export function CookPlannerDashboard({ event, onBack }: { event: EventItem; onBack: () => void }) {
    const [activeTab, setActiveTab] = useState(MEAT_TYPES[0]);
    const [plans, setPlans] = useState<Record<string, CookPlan>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch(`/api/cook-plan?eventId=${event.id}`)
            .then(r => r.json())
            .then(data => {
                if (data.cookPlans) {
                    const map: Record<string, CookPlan> = {};
                    data.cookPlans.forEach((p: CookPlan) => {
                        map[p.meatType] = p;
                    });
                    setPlans(map);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [event.id]);

    const handleSave = async (updatedPlan: CookPlan) => {
        setSaving(true);
        try {
            const res = await fetch("/api/cook-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...updatedPlan, eventId: event.id }),
            });
            if (res.ok) {
                const data = await res.json();
                setPlans(prev => ({ ...prev, [updatedPlan.meatType]: data.cookPlan }));
            }
        } catch (e) {
            console.error(e);
        }
        setSaving(false);
    };

    const currentPlan = plans[activeTab] || { meatType: activeTab };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-zinc-950 text-white">
            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900 shrink-0 flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
                >
                    <span className="text-xl">←</span>
                    <span className="text-xs uppercase font-bold tracking-widest">Back</span>
                </button>
                <div className="flex-1 truncate">
                    <h2 className="text-lg font-bebas tracking-widest text-orange-400 truncate">{event.name}</h2>
                    <p className="text-[10px] text-zinc-500 uppercase">{new Date(event.date).toLocaleDateString()} • Cook Planner</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-zinc-900 border-b border-zinc-800 shrink-0 px-2 overflow-x-auto no-scrollbar">
                {MEAT_TYPES.map(meat => {
                    const isActive = activeTab === meat;
                    return (
                        <button
                            key={meat}
                            onClick={() => setActiveTab(meat)}
                            className={`px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap ${isActive
                                ? "text-orange-400 border-b-2 border-orange-500"
                                : "text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent"
                                }`}
                        >
                            {meat}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 content-start">
                {loading ? (
                    <div className="flex items-center justify-center p-12 text-zinc-500 text-sm animate-pulse">Loading previous plans...</div>
                ) : (
                    <CookPlanForm
                        key={activeTab}
                        plan={currentPlan}
                        onSave={handleSave}
                        saving={saving}
                    />
                )}
            </div>
        </div>
    );
}
