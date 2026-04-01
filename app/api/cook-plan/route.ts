import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const eventId = searchParams.get("eventId");

        if (!eventId) {
            return NextResponse.json({ error: "eventId is required" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const cookPlans = await prisma.cookPlan.findMany({
            where: {
                userId: user.id,
                eventId: eventId,
            },
            orderBy: {
                meatType: "asc",
            },
        });

        return NextResponse.json({ cookPlans });
    } catch (error) {
        console.error("Error fetching cook plans:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await request.json();
        const { 
            eventId, meatType, turnInTime, ingredients, recipe, timeline, postNotes, aiFeedback,
            injectionPackageId, brinePackageId, seasoningPackageId, saucePackageId, cookTimeNotes, score, rank
        } = body;

        if (!eventId || !meatType) {
            return NextResponse.json({ error: "eventId and meatType are required" }, { status: 400 });
        }

        const cookPlan = await prisma.cookPlan.upsert({
            where: {
                userId_eventId_meatType: {
                    userId: user.id,
                    eventId: eventId,
                    meatType: meatType,
                },
            },
            update: {
                turnInTime: turnInTime !== undefined ? turnInTime : undefined,
                ingredients: ingredients !== undefined ? ingredients : undefined,
                recipe: recipe !== undefined ? recipe : undefined,
                timeline: timeline !== undefined ? timeline : undefined,
                postNotes: postNotes !== undefined ? postNotes : undefined,
                aiFeedback: aiFeedback !== undefined ? aiFeedback : undefined,
                injectionPackageId: injectionPackageId !== undefined ? injectionPackageId : undefined,
                brinePackageId: brinePackageId !== undefined ? brinePackageId : undefined,
                seasoningPackageId: seasoningPackageId !== undefined ? seasoningPackageId : undefined,
                saucePackageId: saucePackageId !== undefined ? saucePackageId : undefined,
                cookTimeNotes: cookTimeNotes !== undefined ? cookTimeNotes : undefined,
                score: score !== undefined ? parseFloat(score) : undefined,
                rank: rank !== undefined ? parseInt(rank) : undefined,
            },
            create: {
                userId: user.id,
                eventId: eventId,
                meatType: meatType,
                turnInTime: turnInTime,
                ingredients: ingredients,
                recipe: recipe,
                timeline: timeline,
                postNotes: postNotes,
                aiFeedback: aiFeedback,
                injectionPackageId: injectionPackageId,
                brinePackageId: brinePackageId,
                seasoningPackageId: seasoningPackageId,
                saucePackageId: saucePackageId,
                cookTimeNotes: cookTimeNotes,
                score: score ? parseFloat(score) : undefined,
                rank: rank ? parseInt(rank) : undefined,
            },
        });

        return NextResponse.json({ cookPlan });
    } catch (error) {
        console.error("Error saving cook plan:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 });
        }

        await prisma.cookPlan.delete({
            where: {
                id: id,
                userId: user.id, // ensure user owns the record
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting cook plan:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
