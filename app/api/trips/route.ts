import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";

const prisma = new PrismaClient();

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { title, routeData, totalPurse } = body;

        const savedTrip = await prisma.savedTrip.create({
            data: {
                userId: session.user.id,
                title: title || "Saved Route",
                routeData,
                totalPurse: totalPurse || 0,
            },
        });

        return NextResponse.json({ success: true, trip: savedTrip });
    } catch (error) {
        console.error("Error saving trip:", error);
        return NextResponse.json({ error: "Failed to save trip" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const trips = await prisma.savedTrip.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ trips });
    } catch (error) {
        console.error("Error fetching trips:", error);
        return NextResponse.json({ error: "Failed to fetch trips" }, { status: 500 });
    }
}
