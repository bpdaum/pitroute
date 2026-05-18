export function Logo({ className = "h-8" }: { className?: string }) {
    return (
        <div className={`flex items-center gap-2 group cursor-pointer ${className}`}>
            <svg viewBox="0 0 24 24" className="h-full w-auto drop-shadow-[0_0_15px_rgba(249,115,22,0.6)] shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" fill="none" xmlns="http://www.w3.org/2000/svg">
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
            <span className="font-space font-bold text-2xl tracking-[0.15em] leading-none mt-1 shrink-0 bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 drop-shadow-[0_0_12px_rgba(255,92,0,0.3)] transition-all duration-300 group-hover:drop-shadow-[0_0_20px_rgba(255,92,0,0.6)] uppercase">
                PITPLAN<span className="text-white/90 drop-shadow-none font-light ml-0.5 tracking-widest text-xl">.IO</span>
            </span>
        </div>
    );
}
