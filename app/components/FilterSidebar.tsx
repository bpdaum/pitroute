"use client";

import { AuthWidget } from "./AuthWidget";

const ORGS = ["KCBS", "MBN", "SCA", "FBA", "IBCA"] as const;

const ORG_COLORS: Record<string, string> = {
    KCBS: "#3b82f6",
    MBN: "#ef4444",
    SCA: "#f97316",
    FBA: "#22c55e",
    IBCA: "#a855f7",
};

interface Filters {
    orgs: string[];
    search: string;
    from: string;
    to: string;
}

interface Props {
    filters: Filters;
    onChange: (f: Filters) => void;
    eventCount: number;
}

export function FilterSidebar({ filters, onChange, eventCount }: Props) {
    function toggleOrg(org: string) {
        const already = filters.orgs.includes(org);
        const next = already ? filters.orgs.filter(o => o !== org) : [...filters.orgs, org];
        onChange({ ...filters, orgs: next });
    }

    function selectAll() { onChange({ ...filters, orgs: [...ORGS] }); }
    function clearAll() { onChange({ ...filters, orgs: [] }); }

    return (
        <aside className="w-72 shrink-0 flex flex-col bg-zinc-900 border-r border-zinc-800 overflow-hidden">
            {/* Header */}
            <div className="px-5 pt-6 pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="PitRoute.io Logo" className="h-10 object-contain" />
                </div>
                <p className="text-[10px] text-zinc-600 mt-2 uppercase tracking-widest">BBQ Competition Finder</p>
            </div>

            {/* Filters */}
            <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
                {/* Search */}
                <div>
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1.5 block">Search</label>
                    <input
                        type="text"
                        value={filters.search}
                        onChange={e => onChange({ ...filters, search: e.target.value })}
                        placeholder="Event name or city..."
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                </div>

                {/* Organizations */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Organizations</label>
                        <div className="flex gap-2">
                            <button onClick={selectAll} className="text-[10px] text-orange-400 hover:text-orange-300">All</button>
                            <span className="text-zinc-700">·</span>
                            <button onClick={clearAll} className="text-[10px] text-zinc-500 hover:text-zinc-300">None</button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {ORGS.map(org => {
                            const active = filters.orgs.includes(org);
                            const color = ORG_COLORS[org];
                            return (
                                <label key={org} className="flex items-center gap-3 cursor-pointer group">
                                    <div
                                        onClick={() => toggleOrg(org)}
                                        className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all"
                                        style={{
                                            borderColor: active ? color : "#444",
                                            background: active ? color : "transparent",
                                        }}
                                    >
                                        {active && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>}
                                    </div>
                                    <span className="text-sm text-zinc-300 group-hover:text-white transition-colors" style={{ color: active ? color : undefined }}>
                                        {org}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* Date Range */}
                <div>
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1.5 block">Date Range</label>
                    <div className="flex flex-col gap-2">
                        <input
                            type="date"
                            value={filters.from}
                            onChange={e => onChange({ ...filters, from: e.target.value })}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-orange-500 transition-colors"
                        />
                        <input
                            type="date"
                            value={filters.to}
                            onChange={e => onChange({ ...filters, to: e.target.value })}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-orange-500 transition-colors"
                        />
                    </div>
                </div>

                {/* Count */}
                <div className="mt-auto pt-4 border-t border-zinc-800">
                    <p className="text-xs text-zinc-600">
                        Showing <span className="text-orange-400 font-bold">{eventCount}</span> events
                    </p>
                </div>
            </div>

            <AuthWidget />
        </aside>
    );
}
