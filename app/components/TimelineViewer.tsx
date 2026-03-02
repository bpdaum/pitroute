"use client";

interface TimelineNode {
    time: string;
    action: string;
    description: string;
}

export function TimelineViewer({ timelineStr }: { timelineStr: string }) {
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

    return (
        <div className="space-y-4 pt-2">
            {nodes.map((node, i) => (
                <div key={i} className="flex gap-4 group">
                    <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500 ring-4 ring-zinc-900 z-10"></div>
                        {i !== nodes.length - 1 && (
                            <div className="w-[1px] h-full bg-zinc-800 -my-1 group-hover:bg-orange-500/50 transition-colors"></div>
                        )}
                    </div>
                    <div className="pb-4 last:pb-0">
                        <div className="flex items-baseline gap-2">
                            <span className="text-orange-400 font-bold text-sm min-w-[70px]">{node.time}</span>
                            <span className="text-zinc-100 font-semibold text-sm">{node.action}</span>
                        </div>
                        <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                            {node.description}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
