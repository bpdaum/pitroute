import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: Request) {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "missing" });
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { meatType, ingredients, recipe, timeline, postNotes } = await request.json();

        if (!meatType || !postNotes) {
            return NextResponse.json(
                { error: "meatType and postNotes are required for feedback" },
                { status: 400 }
            );
        }

        const prompt = `
You are a Championship BBQ Pitmaster and KCBS/IBCA Certified Master Judge.
A competitor just finished a competition cook and is providing you with their notes on how it went. Your job is to analyze their cook profile and notes, provide expert compliments on what they did right, constructive criticism on what might have gone wrong, and highly specific, actionable advice for their next competition.

Competitor's Cook Profile:
- Meat: ${meatType}
- Ingredients/Rubs/Injections used: ${ingredients || "None specified, standard practice assumed"}
- Recipe/Method: ${recipe || "None specified"}
- AI Generated Timeline Used: ${timeline ? JSON.stringify(timeline) : "None used"}

Competitor's Post-Cook Notes/Results:
"${postNotes}"

Format your response in beautiful Markdown. Use nice headers like "### 🏆 What Worked", "### 🔍 Areas for Improvement", and "### 💡 Next Time". Be encouraging but brutally honest like a real competition judge. Provide specific technical temperature, wrapping, resting, or flavor profile adjustments they should make next time based on their notes.
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.7, // Allow for some creative encouragement
            }
        });

        const aiText = response.text || "I'm sorry, I couldn't generate feedback at this time.";

        return NextResponse.json({ feedback: aiText });
    } catch (error) {
        console.error("Error generating feedback:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
