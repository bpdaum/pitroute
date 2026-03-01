import { useState } from "react";

interface BlackoutDatesProps {
    blackoutDates: string[];
    setBlackoutDates: React.Dispatch<React.SetStateAction<string[]>>;
}

export function BlackoutDates({ blackoutDates, setBlackoutDates }: BlackoutDatesProps) {
    const [dateInput, setDateInput] = useState("");

    function handleAddDate() {
        if (!dateInput) return;

        // YYYY-MM-DD
        if (!blackoutDates.includes(dateInput)) {
            setBlackoutDates(prev => [...prev, dateInput].sort());
        }
        setDateInput("");
    }

    function handleRemoveDate(dateToRemove: string) {
        setBlackoutDates(prev => prev.filter(d => d !== dateToRemove));
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Blackout Dates</label>
                <span className="text-[10px] text-zinc-500 bg-zinc-900/50 px-2 py-0.5 rounded font-medium">Optional</span>
            </div>

            <div className="flex gap-2">
                <input
                    type="date"
                    value={dateInput}
                    onChange={e => setDateInput(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors color-scheme-dark shadow-inner"
                />
                <button
                    onClick={handleAddDate}
                    disabled={!dateInput}
                    className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-md text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    Add
                </button>
            </div>

            {blackoutDates.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                    {blackoutDates.map(date => {
                        // Format nice display date: "Mar 15, 2026"
                        const [y, m, d] = date.split('-');
                        const displayObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                        const displayStr = displayObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                        return (
                            <div key={date} className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 group hover:border-red-900/30 transition-colors shrink-0">
                                <span className="text-[11px] font-medium text-zinc-300 flex items-center gap-1.5">
                                    <span className="text-[10px] opacity-50">🚫</span> {displayStr}
                                </span>
                                <button
                                    onClick={() => handleRemoveDate(date)}
                                    className="text-zinc-500 hover:text-red-400 focus:text-red-400 transition-colors flex items-center justify-center translate-y-[-0.5px]"
                                    title="Remove blackout date"
                                >
                                    ×
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
}
