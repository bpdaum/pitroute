import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenAI, Type } from "@google/genai";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60; // Allow 60 seconds for complex AI tool agenting

const tools = [{
    functionDeclarations: [
        {
            name: "find_events",
            description: "Search the database for upcoming barbecue events.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    keyword: { type: Type.STRING, description: "Keyword in event name or location" },
                }
            }
        },
        {
            name: "create_recipe_package",
            description: "Create a reusable recipe package in the user's account.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Name of the recipe" },
                    packageType: { type: Type.STRING, description: "Must be INJECTION, BRINE, SEASONING, or SAUCE" },
                    ingredients: { type: Type.STRING, description: "List of ingredients and measurements" },
                    instructions: { type: Type.STRING, description: "How to prepare it" }
                },
                required: ["name", "packageType"]
            }
        },
        {
            name: "get_user_events",
            description: "Retrieve events that the user is currently building plans for.",
            parameters: { type: Type.OBJECT, properties: {} }
        },
        {
            name: "upsert_cook_plan",
            description: "Update or create a cook plan for a specific event and meat type. Use this to alter their strategy.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    eventId: { type: Type.STRING, description: "The ID of the event" },
                    meatType: { type: Type.STRING, description: "Brisket, Ribs, Pork, or Chicken" },
                    turnInTime: { type: Type.STRING, description: "Target turn in time, e.g., Sat 12:00 PM" },
                    recipe: { type: Type.STRING, description: "Cooking method/instructions" },
                    postNotes: { type: Type.STRING, description: "Debrief notes or results" },
                    score: { type: Type.NUMBER, description: "Competition score" },
                    rank: { type: Type.NUMBER, description: "Competition rank" }
                },
                required: ["eventId", "meatType"]
            }
        }
    ]
}] as any;

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = session.user.id;

        const { history, message, attachments } = await request.json();

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "missing" });
        
        let systemPrompt = `You are an expert AI BBQ Pitmaster Agent. You exclusively help the user plan barbecue competitions, formulate recipes, and analyze their strategy. You have tools to search events, create recipe packages, and modify cook plans directly in the database. Use them autonomously when the user asks you to save something or search for something.`;

        // We inject the history into the system prompt before creating the chat instance 
        // to avoid mutating the private config after instantiation.
        if (history && history.length > 0) {
            const serializedHistory = history.map((h: any) => `${h.role}: ${h.content}`).join("\n\n");
            systemPrompt += `\n\nPrevious Conversation History:\n${serializedHistory}`;
        }

        // Initialize chat
        const chat = ai.chats.create({
            model: "gemini-2.5-flash",
            config: {
                systemInstruction: systemPrompt,
                tools: tools,
                temperature: 0.7,
            }
        });

        const contents: any[] = [{ text: message }];

        // Attach images if provided
        if (attachments && attachments.length > 0) {
            for (const att of attachments) {
                // att is base64 e.g. data:image/jpeg;base64,...
                const [header, data] = att.split(",");
                const mimeType = header.match(/:(.*?);/)?.[1] || "image/jpeg";
                contents.push({
                    inlineData: {
                        data: data,
                        mimeType: mimeType
                    }
                });
            }
        }

        let response = await chat.sendMessage({ message: contents });

        // Tool calling loop
        let attempts = 0;
        let toolResultsArr: any[] = [];
        
        while (response.functionCalls && response.functionCalls.length > 0 && attempts < 5) {
            const fcalls = response.functionCalls;
            const functionResponses = [];

            for (const call of fcalls) {
                const { name, args } = call;
                let resultData: Record<string, unknown> = {};
                
                try {
                    if (name === "find_events") {
                        const kw = args?.keyword || "";
                        const evs = await prisma.event.findMany({
                            where: { name: { contains: kw as string, mode: "insensitive" } },
                            take: 5
                        });
                        resultData = { events: evs };
                    } 
                    else if (name === "create_recipe_package") {
                        const pkg = await prisma.package.create({
                            data: {
                                userId,
                                name: args?.name as string,
                                packageType: args?.packageType as string,
                                ingredients: args?.ingredients as string,
                                instructions: args?.instructions as string,
                                isPublic: false
                            }
                        });
                        resultData = { success: true, package: pkg };
                    }
                    else if (name === "get_user_events") {
                        const plans = await prisma.cookPlan.findMany({
                            where: { userId },
                            include: { event: true },
                            distinct: ['eventId']
                        });
                        resultData = { activeEvents: plans.map(p => p.event) };
                    }
                    else if (name === "upsert_cook_plan") {
                        const existing = await prisma.cookPlan.findUnique({
                            where: {
                                userId_eventId_meatType: {
                                    userId,
                                    eventId: args?.eventId as string,
                                    meatType: args?.meatType as string
                                }
                            }
                        });
                        
                        const updateData: any = {};
                        if (args?.turnInTime) updateData.turnInTime = args.turnInTime;
                        if (args?.recipe) updateData.recipe = args.recipe;
                        if (args?.postNotes) updateData.postNotes = args.postNotes;
                        if (args?.score !== undefined) updateData.score = Number(args.score);
                        if (args?.rank !== undefined) updateData.rank = Number(args.rank);

                        let finalPlan;
                        if (existing) {
                            finalPlan = await prisma.cookPlan.update({
                                where: { id: existing.id },
                                data: updateData
                            });
                        } else {
                            finalPlan = await prisma.cookPlan.create({
                                data: {
                                    userId,
                                    eventId: args?.eventId as string,
                                    meatType: args?.meatType as string,
                                    ...updateData
                                }
                            });
                        }
                        resultData = { success: true, plan: finalPlan };
                    }
                } catch (e: any) {
                    resultData = { error: e.message };
                }

                functionResponses.push({
                    name: call.name,
                    response: resultData
                });
                toolResultsArr.push({ tool: call.name, returned: resultData });
            }

            // Send tool results back to the model
            // @google/genai expects an array of parts with functionResponse
            const toolParts = functionResponses.map(fr => ({
                functionResponse: {
                    name: fr.name,
                    response: fr.response
                }
            }));

            response = await chat.sendMessage({ message: toolParts });
            attempts++;
        }

        return NextResponse.json({
            text: response.text,
            actionsTaken: toolResultsArr
        });

    } catch (error: any) {
        console.error("AI Coach Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
