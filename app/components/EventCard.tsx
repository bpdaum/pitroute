"use client";

const ORG_COLORS: Record<string, string> = {
    KCBS: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    MBN: "bg-red-500/20 text-red-400 border-red-500/30",
    SCA: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    FBA: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    IBCA: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    CBA: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    LSBS: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    "Outlaw BBQ": "bg-amber-500/20 text-amber-400 border-amber-500/30",
    CTBA: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    BCA: "bg-teal-500/20 text-teal-400 border-teal-500/30",
};

export const ORG_HEX_COLORS: Record<string, string> = {
    KCBS: "#3b82f6",
    MBN: "#ef4444",
    SCA: "#f97316",
    FBA: "#10b981",
    IBCA: "#a855f7",
    CBA: "#6366f1",
    LSBS: "#ec4899",
    "Outlaw BBQ": "#f59e0b",
    CTBA: "#0ea5e9",
    BCA: "#14b8a6",
};

export function getOrgColor(name: string) {
    return ORG_HEX_COLORS[name] || "#e85d04";
}

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
    const colorClass = ORG_COLORS[name] || "bg-ash text-bone border-ash";
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-md border ${colorClass}`}
        >
            {name}
        </span>
    );
}

export function EventCard({ event, onClick, compact }: Props) {
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
                if (onClick) {
                    onClick();
                }
            }}
            className={`
        cursor-pointer relative overflow-hidden group transition-all duration-200 ease-in-out glass-panel mb-3 mx-2 md:mx-0
        border-ash hover:border-[#444] hover:shadow-lg bg-smoke hover:bg-charcoal
        ${compact ? "p-3" : "p-5"}
      `}
        >

            <div className="flex items-start justify-between gap-2 mb-3">
                <OrgBadge name={event.organization.name} />
                {event.purseAmount && (
                    <span className="text-[11px] font-bold text-ember bg-ember/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <span>💰</span> ${event.purseAmount.toLocaleString()}
                    </span>
                )}
            </div>
            
            <h3 className={`font-display font-bold leading-tight tracking-tight mb-4 ${compact ? "text-xl" : "text-2xl"} text-bone`}>
                {event.name}
            </h3>
            
            <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center gap-3">
                    <span className="text-sm">📅</span>
                    <span className="text-sm font-medium text-[#D1D1D1]">{dateStr}</span>
                </div>
                {event.locationAddress && (
                    <div className="flex items-start gap-3">
                        <span className="text-sm mt-0.5">📍</span>
                        <span className="text-sm font-medium text-[#D1D1D1] leading-snug">{cleanAddress(event.locationAddress)}</span>
                    </div>
                )}
            </div>
            
            {!compact && event.detailsUrl && (
                <a
                    href={event.detailsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="mt-5 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#A0A0A0] hover:text-ember transition-colors"
                >
                    Event Details <span className="text-base leading-none">→</span>
                </a>
            )}
        </div>
    );
}

export function cleanAddress(addr: string | null) {
  if (!addr) return 'Address TBA';
  let clean = addr;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(clean)) {
    const parts = clean.split(',');
    if (parts.length > 1) {
      parts.shift();
      clean = parts.join(',').trim();
    }
  }
  clean = clean.replace(/,\s*$/, '').trim();
  return clean || 'Address TBA';
}
