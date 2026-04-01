import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
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

        const pkg = await prisma.package.findUnique({
            where: { id: id },
        });

        if (!pkg || pkg.userId !== user.id) {
            return NextResponse.json({ error: "Package not found or unauthorized" }, { status: 404 });
        }

        const updatedPkg = await prisma.package.update({
            where: { id: id },
            data: {
                name: name !== undefined ? name : undefined,
                packageType: packageType !== undefined ? packageType : undefined,
                ingredients: ingredients !== undefined ? ingredients : undefined,
                instructions: instructions !== undefined ? instructions : undefined,
            },
        });

        return NextResponse.json({ package: updatedPkg });
    } catch (error) {
        console.error("Error updating package:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
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

        const pkg = await prisma.package.findUnique({
            where: { id: id },
        });

        if (!pkg || pkg.userId !== user.id) {
            return NextResponse.json({ error: "Package not found or unauthorized" }, { status: 404 });
        }

        await prisma.package.delete({
            where: { id: id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting package:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
