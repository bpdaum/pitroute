"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import { MasterTimelineView } from "./MasterTimelineView";

interface ChatMessage {
    role: 'user' | 'model';
    content: string;
    attachments?: string[]; // base64 strings
    actionsTaken?: any[];
}

export function AiCoachChat() {
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [images, setImages] = useState<string[]>([]);
    const endRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial greeting
    useEffect(() => {
        if (history.length === 0) {
            setHistory([{
                role: 'model',
                content: "Howdy! I'm your autonomous AI Pitmaster agent. I can search the tournament DB for events, build entire multi-meat execution timelines for you, translate photos of handwritten recipes into digital packages automatically, and document your cook outcomes. What's on the smoker today?"
            }]);
        }
    }, [history]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history, loading]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];
        
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === "string") {
                setImages([...images, reader.result]);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSend = async () => {
        if (!input.trim() && images.length === 0) return;
        
        const newMessage: ChatMessage = { role: 'user', content: input, attachments: [...images] };
        const nextHistory = [...history, newMessage];
        setHistory(nextHistory);
        setInput("");
        setImages([]);
        setLoading(true);

        try {
            const res = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: input || "Analyze this image.",
                    history: nextHistory.slice(0, -1), // Send history except the newly pushed message
                    attachments: newMessage.attachments
                })
            });
            const data = await res.json();
            
            if (data.text || data.actionsTaken) {
                setHistory(prev => [...prev, { role: 'model', content: data.text || "", actionsTaken: data.actionsTaken }]);
            } else if (data.error) {
                setHistory(prev => [...prev, { role: 'model', content: `Error: ${data.error}` }]);
            }
        } catch(e) {
            console.error(e);
            setHistory(prev => [...prev, { role: 'model', content: "An error occurred trying to reach the Pitmaster." }]);
        }
        setLoading(false);
    }

    return (
        <div className="flex flex-col h-full bg-zinc-950 text-white relative">
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
                {history.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                            msg.role === 'user' 
                                ? 'bg-orange-600 text-white rounded-br-none' 
                                : 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-tl-none shadow-xl'
                        }`}>
                            <div className="prose prose-invert prose-sm max-w-none">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                            {msg.attachments && msg.attachments.length > 0 && (
                                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                                    {msg.attachments.map((src, j) => (
                                        <img key={j} src={src} className="h-24 rounded-lg object-contain bg-zinc-950/50" alt="Uploaded" />
                                    ))}
                                </div>
                            )}
                            {msg.actionsTaken && msg.actionsTaken.map((action, k) => {
                                if (action.tool === 'generate_event_timeline' && action.returned?.plans) {
                                    return (
                                        <div key={k} className="mt-4 border-t border-zinc-800 pt-4 w-full min-w-[500px]">
                                            <p className="text-[10px] uppercase text-orange-400 font-bold mb-2 tracking-widest">Master Timeline Generated</p>
                                            <MasterTimelineView plans={action.returned.plans} />
                                        </div>
                                    );
                                }
                                return null;
                            })}
                        </div>
                    </div>
                ))}
                
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-none px-4 py-3 text-zinc-400 flex gap-2">
                            <span className="animate-bounce inline-block">.</span>
                            <span className="animate-bounce inline-block" style={{ animationDelay: '0.2s' }}>.</span>
                            <span className="animate-bounce inline-block" style={{ animationDelay: '0.4s' }}>.</span>
                        </div>
                    </div>
                )}
                <div ref={endRef} className="h-4" />
            </div>

            <div className="p-4 bg-zinc-900 border-t border-zinc-800 shrink-0 relative">
                {images.length > 0 && (
                    <div className="absolute bottom-[100%] left-0 w-full p-2 bg-zinc-900/90 backdrop-blur-md flex gap-2 overflow-x-auto border-t border-zinc-800">
                        {images.map((src, i) => (
                            <div key={i} className="relative inline-block group">
                                <img src={src} className="h-16 rounded shadow-lg object-cover" />
                                <button 
                                    onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] invisible group-hover:visible"
                                >✕</button>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex items-center gap-2 max-w-3xl mx-auto">
                    <input 
                        type="file" 
                        accept="image/*" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 text-zinc-400 hover:text-orange-400 hover:bg-zinc-800 rounded-xl transition-colors bg-zinc-950 border border-zinc-800"
                        title="Upload recipe photo or turn-in box picture"
                    >
                        📸
                    </button>
                    <input 
                        type="text" 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !loading && (input.trim() || images.length > 0)) handleSend(); }}
                        placeholder="Ask the Pitmaster agent to create a recipe or find an event..."
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={loading || (!input.trim() && images.length === 0)}
                        className="bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-50 px-5 py-3 rounded-xl font-bold transition-colors"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}
