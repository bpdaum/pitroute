import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 3958.8;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const AVG_MPH = 60;
// How many hours of driving per day is reasonable
const MAX_DRIVE_HOURS_PER_DAY = 8;

// "Trip length" maps to max one-way driving hours
// e.g. "Weekend" (3 day) → you'd spend at most ~1 day driving each way
const tripDaysToOneWayHours = (days: number) => Math.min(days * MAX_DRIVE_HOURS_PER_DAY * 0.35, 12);

export interface RecommendedStop {
    event: {
        id: string;
        name: string;
        date: string;
        locationAddress: string | null;
        latitude: number;
        longitude: number;
        purseAmount: number | null;
        detailsUrl: string | null;
        organization: { name: string };
    };
    driveFromPrevMiles: number;
    driveFromPrevHours: number;
    dayOfTrip: number;
    arrivalDate: string;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get('lat') ?? '');
    const lng = parseFloat(searchParams.get('lng') ?? '');
    const tripDays = parseInt(searchParams.get('days') ?? '3');

    if (isNaN(lat) || isNaN(lng)) {
        return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
    }

    const now = new Date();
    // Search the next 180 days of events, regardless of trip length
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + 180);

    // Max one-way drive distance based on trip length
    const maxOneWayHours = tripDaysToOneWayHours(tripDays);
    const maxOneWayMiles = maxOneWayHours * AVG_MPH;

    // Fetch all upcoming geocoded events
    const allEvents = await prisma.event.findMany({
        where: {
            latitude: { not: null },
            longitude: { not: null },
            date: { gte: now, lte: horizon },
        },
        include: { organization: { select: { name: true } } },
        orderBy: { date: 'asc' },
    });

    // Filter to events within driving range
    type EventWithDist = (typeof allEvents)[0] & { distMiles: number };
    const reachable: EventWithDist[] = allEvents
        .map((e): EventWithDist => ({
            ...e,
            distMiles: haversine(lat, lng, e.latitude!, e.longitude!),
        }))
        .filter((e: EventWithDist) => e.distMiles <= maxOneWayMiles)
        .sort((a: EventWithDist, b: EventWithDist) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (reachable.length === 0) {
        return NextResponse.json({ stops: [], totalMiles: 0, totalDriveHours: 0, returnMiles: 0, returnHours: 0, tripDays, maxOneWayMiles: Math.round(maxOneWayMiles) });
    }

    // Find the first "weekend cluster": group events that fall within `tripDays` of each other
    // Start from the nearest-date reachable event and greedily collect events
    // that can be chained within the trip duration
    const firstEvent = reachable[0];
    const tripWindowEnd = new Date(firstEvent.date);
    tripWindowEnd.setDate(tripWindowEnd.getDate() + tripDays - 1);

    // Collect all events in this cluster window
    const clusterEvents = reachable.filter(
        e => new Date(e.date) >= new Date(firstEvent.date) && new Date(e.date) <= tripWindowEnd
    );

    // Greedy route within the cluster: nearest-neighbor from user location
    const visited = new Set<string>();
    const route: RecommendedStop[] = [];
    let currentLat = lat;
    let currentLng = lng;

    while (true) {
        let best: (typeof clusterEvents)[0] | null = null;
        let bestDist = Infinity;

        for (const event of clusterEvents) {
            if (visited.has(event.id)) continue;
            const dist = haversine(currentLat, currentLng, event.latitude!, event.longitude!);
            if (dist < bestDist) {
                best = event;
                bestDist = dist;
            }
        }

        if (!best) break;

        visited.add(best.id);
        const driveHours = bestDist / AVG_MPH;

        route.push({
            event: {
                id: best.id,
                name: best.name,
                date: best.date.toISOString(),
                locationAddress: best.locationAddress,
                latitude: best.latitude!,
                longitude: best.longitude!,
                purseAmount: best.purseAmount,
                detailsUrl: best.detailsUrl,
                organization: best.organization,
            },
            driveFromPrevMiles: Math.round(bestDist),
            driveFromPrevHours: Math.round(driveHours * 10) / 10,
            dayOfTrip: route.length + 1,
            arrivalDate: best.date.toISOString(),
        });

        currentLat = best.latitude!;
        currentLng = best.longitude!;
    }

    const returnMiles = haversine(currentLat, currentLng, lat, lng);
    const returnHours = returnMiles / AVG_MPH;
    const totalMiles = route.reduce((s, r) => s + r.driveFromPrevMiles, 0) + Math.round(returnMiles);
    const totalDriveHours = route.reduce((s, r) => s + r.driveFromPrevHours, 0) + Math.round(returnHours * 10) / 10;

    // Also return count of total reachable competitions across all 180 days
    const totalReachableCount = reachable.length;

    return NextResponse.json({
        stops: route,
        totalMiles: Math.round(totalMiles),
        totalDriveHours: Math.round(totalDriveHours * 10) / 10,
        returnMiles: Math.round(returnMiles),
        returnHours: Math.round(returnHours * 10) / 10,
        tripDays,
        maxOneWayMiles: Math.round(maxOneWayMiles),
        totalReachableCount,
    });
}
