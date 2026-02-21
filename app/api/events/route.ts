import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const orgs = searchParams.get('org')?.split(',').filter(Boolean);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const q = searchParams.get('q');

    const events = await prisma.event.findMany({
        where: {
            ...(orgs && orgs.length > 0
                ? { organization: { name: { in: orgs } } }
                : {}),
            ...(from || to
                ? {
                    date: {
                        ...(from ? { gte: new Date(from) } : {}),
                        ...(to ? { lte: new Date(to) } : {}),
                    },
                }
                : {}),
            ...(q
                ? {
                    OR: [
                        { name: { contains: q, mode: 'insensitive' } },
                        { locationAddress: { contains: q, mode: 'insensitive' } },
                    ],
                }
                : {}),
        },
        include: { organization: { select: { name: true } } },
        orderBy: { date: 'asc' },
    });

    return NextResponse.json({ events });
}
