import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
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
        const packageType = searchParams.get("packageType");

        const whereClause: any = { userId: user.id };
        if (packageType) {
            whereClause.packageType = packageType;
        }

        const packages = await prisma.package.findMany({
            where: whereClause,
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json({ packages });
    } catch (error) {
        console.error("Error fetching packages:", error);
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
        const { name, packageType, ingredients, instructions } = body;

        if (!name || !packageType) {
            return NextResponse.json({ error: "name and packageType are required" }, { status: 400 });
        }

        const pkg = await prisma.package.create({
            data: {
                userId: user.id,
                name: name,
                packageType: packageType,
                ingredients: ingredients,
                instructions: instructions,
            },
        });

        return NextResponse.json({ package: pkg });
    } catch (error) {
        console.error("Error creating package:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
