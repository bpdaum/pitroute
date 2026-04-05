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

        const { meatType, turnInTime, ingredients, recipe } = await request.json();

        if (!meatType || !turnInTime) {
            return NextResponse.json(
                { error: "meatType and turnInTime are required to generate a timeline" },
                { status: 400 }
            );
        }

        const prompt = `
You are a Championship BBQ BBQ Pitmaster Expert. 
A competitor needs a detailed cooking timeline/schedule for their upcoming competition cook.

Parameters:
- Meat Type: ${meatType}
- Target Turn-In Time: ${turnInTime}
- Ingredients/Injections/Rubs: ${ingredients || "Not specified, use standard championship practices"}
- Recipe/Notes: ${recipe || "Not specified, use a standard championship hot & fast or low & slow method based on the meat type"}

Generate a chronologically ordered sequence of steps for this cook, working backward from the Turn-In Time. Include meat prep (trimming, injecting, seasoning), smoker start/management, cooking temps, wrapping/boating, resting, slicing, and building the turn-in box.

Return the result as a strict JSON array of objects, with NO markdown formatting, NO code blocks, and NO backticks. The JSON array should just be the raw text string. Every object must have these exactly 4 keys:
"time" (string, e.g., "6:00 AM", or "Day Before 8:00 PM")
"action" (string, short title of the step, e.g., "Trim & Inject Brisket")
"description" (string, 1-2 sentences of detailed expert instructions)
"offsetMinutes" (integer, representing exact minutes before or after the Target Turn-In Time. e.g., -600 for 10 hours before, 0 for Turn-In Time)

Ensure the timeline guarantees the meat is rested and sliced/boxed precisely aligned with the Target Turn-In Time.
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.2, // Keep it deterministic and factual
            }
        });

        const aiText = response.text || "[]";

        // Attempt to parse to ensure it's valid JSON before returning
        let timelineNodes = [];
        try {
            // Clean potential markdown artifacts just in case
            let cleanText = aiText.trim();
            if (cleanText.startsWith('```json')) cleanText = cleanText.replace(/```json\n/, '');
            if (cleanText.startsWith('```')) cleanText = cleanText.replace(/```\n/, '');
            if (cleanText.endsWith('```')) cleanText = cleanText.replace(/```$/, '');
            cleanText = cleanText.trim();

            timelineNodes = JSON.parse(cleanText);
        } catch (parseError) {
            console.error("Failed to parse Gemini JSON:", aiText);
            return NextResponse.json(
                { error: "AI returned malformed timeline data", rawText: aiText },
                { status: 500 }
            );
        }

        return NextResponse.json({ timeline: timelineNodes });
    } catch (error) {
        console.error("Error generating timeline:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
