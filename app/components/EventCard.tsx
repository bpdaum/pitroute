"use client";

const ORG_COLORS: Record<string, string> = {
    KCBS: "#3b82f6",
    MBN: "#ef4444",
    SCA: "#f97316",
    FBA: "#22c55e",
    IBCA: "#a855f7",
    CBA: "#6366f1",
    LSBS: "#ec4899",
    "Outlaw BBQ": "#eab308",
    CTBA: "#0ea5e9",
    BCA: "#14b8a6",
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
    onToggleSelect?: (eventId: string) => void;
    isSelected?: boolean;
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

export function EventCard({ event, onClick, onToggleSelect, isSelected, compact }: Props) {
    const date = new Date(event.date);
    
    // Most BBQ events are 2 days (Friday setup/meeting, Saturday cook/awards)
    const startDate = new Date(date);
    startDate.setDate(date.getDate() - 1);
    
    const startMonth = startDate.toLocaleDateString("en-US", { month: "short" });
    const endMonth = date.toLocaleDateString("en-US", { month: "short" });
    const startDay = startDate.getDate();
    const endDay = date.getDate();
    
    const dateStr = startMonth === endMonth 
        ? `${startMonth} ${startDay}-${endDay}` 
        : `${startMonth} ${startDay} - ${endMonth} ${endDay}`;

    return (
        <div
            onClick={(e) => {
                if (onToggleSelect) {
                    onToggleSelect(event.id);
                } else if (onClick) {
                    onClick();
                }
            }}
            className={`
        fade-in rounded-xl border bg-zinc-900 cursor-pointer relative overflow-hidden
        transition-all hover:bg-zinc-800
        ${isSelected ? "border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.15)] ring-1 ring-orange-500" : "border-zinc-800 hover:border-zinc-600"}
        ${compact ? "p-3" : "p-4"}
      `}
        >
            {isSelected && (
                <div className="absolute top-0 right-0 w-0 h-0 border-t-[32px] border-t-orange-500 border-l-[32px] border-l-transparent">
                    <span className="absolute -top-[28px] -left-[14px] text-white text-[10px] font-bold">✓</span>
                </div>
            )}
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
                    className="mt-2 inline-block text-[11px] text-zinc-500 hover:text-orange-400 transition-colors"
                >
                    View external details ↗
                </a>
            )}
        </div>
    );
}
