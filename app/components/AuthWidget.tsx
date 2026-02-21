"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export function AuthWidget() {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return <div className="p-4 border-t border-zinc-800 shrink-0 text-zinc-500 text-xs">Loading auth...</div>;
    }

    if (session?.user) {
        return (
            <div className="p-4 border-t border-zinc-800 bg-zinc-900 shrink-0">
                <div className="flex items-center gap-3">
                    {session.user.image ? (
                        <img
                            src={session.user.image}
                            alt={session.user.name || "User"}
                            className="w-8 h-8 rounded-full border border-zinc-700"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                            <span className="text-zinc-400 text-xs font-bold">
                                {session.user.name?.charAt(0).toUpperCase() || "U"}
                            </span>
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-white font-medium truncate">
                            {session.user.name || session.user.email}
                        </p>
                        <button
                            onClick={() => signOut()}
                            className="text-[10px] text-zinc-500 hover:text-orange-400 transition-colors uppercase tracking-wider font-semibold"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 border-t border-zinc-800 shrink-0">
            <button
                onClick={() => signIn("google")}
                className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-orange-600 text-white text-xs font-semibold uppercase tracking-wider py-2.5 rounded-lg transition-colors group"
            >
                <svg className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                </svg>
                Sign In
            </button>
        </div>
    )
}
