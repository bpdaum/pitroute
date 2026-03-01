export function Logo({ className = "h-8" }: { className?: string }) {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <svg viewBox="0 0 24 24" className="h-full w-auto drop-shadow-md shrink-0 transition-transform hover:scale-105" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2A7 7 0 0 0 5 9c0 4.7 6.1 11.8 6.6 12.4a.5.5 0 0 0 .8 0C12.9 20.8 19 13.7 19 9A7 7 0 0 0 12 2Z" fill="url(#pinGradient)" />
                <path d="M12 15a4 4 0 0 0 4-4c0-2-2-4-4-6-2 2-4 4-4 6a4 4 0 0 0 4 4Z" fill="#18181B" />
                <path d="M12 14a3 3 0 0 0 3-3c0-1.5-1.5-3-3-4.5-1.5 1.5-3 3-3 4.5a3 3 0 0 0 3 3Z" fill="url(#flameGradient)" />
                <defs>
                    <linearGradient id="pinGradient" y1="2" x1="12" y2="22" x2="12" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#F97316" />
                        <stop offset="1" stopColor="#ea580c" />
                    </linearGradient>
                    <linearGradient id="flameGradient" y1="6" x1="12" y2="14" x2="12" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#fde047" />
                        <stop offset="0.5" stopColor="#f59e0b" />
                        <stop offset="1" stopColor="#ea580c" />
                    </linearGradient>
                </defs>
            </svg>
            <span className="font-bebas text-2xl tracking-widest text-white leading-none mt-1 shrink-0">
                PITROUTE<span className="text-orange-500">.IO</span>
            </span>
        </div>
    );
}
