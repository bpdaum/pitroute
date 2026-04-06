import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const eventsWithCooks = await prisma.event.findMany({
            where: {
                cookPlans: {
                    some: { userId: session.user.id }
                }
            },
            include: {
                organization: true,
                cookPlans: {
                    where: { userId: session.user.id }
                }
            },
            orderBy: {
                date: 'asc'
            }
        });

        return NextResponse.json({ events: eventsWithCooks });
    } catch (error) {
        console.error("Error fetching saved cooks:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
