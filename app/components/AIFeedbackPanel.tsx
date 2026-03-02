"use client";

import ReactMarkdown from 'react-markdown';

export function AIFeedbackPanel({ feedback }: { feedback: string }) {
    if (!feedback) return null;

    return (
        <div className="mt-4 bg-indigo-950/20 border border-indigo-900/50 rounded-xl p-5 shadow-inner">
            <div className="flex items-center gap-2 mb-4 border-b border-indigo-900/30 pb-3">
                <span className="text-xl">🏆</span>
                <h4 className="text-sm font-bold uppercase tracking-widest text-indigo-300">
                    Championship Judge Feedback
                </h4>
            </div>

            <div className="prose prose-invert prose-sm prose-indigo max-w-none 
          prose-headings:font-bebas prose-headings:tracking-wider prose-headings:text-indigo-200
          prose-p:text-zinc-300 prose-p:leading-relaxed
          prose-li:text-zinc-300 prose-strong:text-indigo-300"
            >
                <ReactMarkdown>{feedback}</ReactMarkdown>
            </div>
        </div>
    );
}
