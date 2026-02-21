"use client";

const ORG_COLORS: Record<string, string> = {
    KCBS: "#3b82f6",
    MBN: "#ef4444",
    SCA: "#f97316",
    FBA: "#22c55e",
    IBCA: "#a855f7",
};

export interface EventItem {
    id: string;
    name: string;
    date: string;
    locationAddress: string | null;
    latitude: number | null;
    longitude: number | null;
    purseAmount: number | null;
    detailsUrl: string | null;
    organization: { name: string };
}

interface Props {
    event: EventItem;
    onClick?: () => void;
    compact?: boolean;
}

export function OrgBadge({ name }: { name: string }) {
    const color = ORG_COLORS[name] ?? "#888";
    return (
        <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase"
            style={{ background: color + "22", color, border: `1px solid ${color}55` }}
        >
            {name}
        </span>
    );
}

export function getOrgColor(name: string) {
    return ORG_COLORS[name] ?? "#888";
}

export function EventCard({ event, onClick, compact }: Props) {
    const date = new Date(event.date);
    const dateStr = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

    return (
        <div
            onClick={onClick}
            className={`
        fade-in rounded-xl border border-zinc-800 bg-zinc-900 cursor-pointer
        transition-all hover:border-zinc-600 hover:bg-zinc-800
        ${compact ? "p-3" : "p-4"}
      `}
        >
            <div className="flex items-start justify-between gap-2 mb-1">
                <OrgBadge name={event.organization.name} />
                {event.purseAmount && (
                    <span className="text-xs font-bold text-emerald-400">
                        ${event.purseAmount.toLocaleString()}
                    </span>
                )}
            </div>
            <p className={`font-semibold text-zinc-100 mt-1 leading-tight ${compact ? "text-sm" : "text-base"}`}>
                {event.name}
            </p>
            <div className="mt-1.5 flex flex-col gap-0.5">
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                    <span>📅</span> {dateStr}
                </span>
                {event.locationAddress && (
                    <span className="text-xs text-zinc-500 flex items-center gap-1 truncate">
                        <span>📍</span> {event.locationAddress}
                    </span>
                )}
            </div>
            {!compact && event.detailsUrl && (
                <a
                    href={event.detailsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="mt-2 inline-block text-xs text-orange-400 hover:text-orange-300 transition-colors"
                >
                    View details →
                </a>
            )}
        </div>
    );
}
