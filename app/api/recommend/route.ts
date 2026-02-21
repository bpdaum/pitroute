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
    // Search the next 180 days of events
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
        return NextResponse.json({
            stops: [], totalMiles: 0, totalDriveHours: 0, returnMiles: 0, returnHours: 0,
            tripDays, maxOneWayMiles: Math.round(maxOneWayMiles), totalReachableCount: 0, totalPurse: 0
        });
    }

    let bestRoute: RecommendedStop[] = [];
    let bestTotalPurse: number = -1;
    let bestTotalMiles: number = Infinity;

    // Helper to evaluate a path
    function evaluatePath(path: RecommendedStop[], totalPurse: number) {
        // Calculate total miles including return
        const lastStop = path[path.length - 1];
        const returnMiles = haversine(lastStop.event.latitude, lastStop.event.longitude, lat, lng);
        const pathMiles = path.reduce((sum, stop) => sum + stop.driveFromPrevMiles, 0) + returnMiles;

        // Scoring rules:
        // 1. Higher total purse wins
        // 2. If purses are equal, the path with MORE stops wins (we want to encourage multi-stop trips)
        // 3. If purses and stops are equal, the path with FEWER miles wins

        const isBetterPurse = totalPurse > bestTotalPurse;
        const isEqualPurse = totalPurse === bestTotalPurse;
        const isMoreStops = path.length > bestRoute.length;
        const isEqualStops = path.length === bestRoute.length;
        const isFewerMiles = pathMiles < bestTotalMiles;

        if (
            isBetterPurse ||
            (isEqualPurse && isMoreStops) ||
            (isEqualPurse && isEqualStops && isFewerMiles)
        ) {
            bestTotalPurse = totalPurse;
            bestTotalMiles = pathMiles;
            bestRoute = [...path];
        }
    }

    // DFS to explore valid paths within a specific trip window
    function dfs(
        currentIndex: number,
        currentPath: RecommendedStop[],
        currentPurse: number,
        windowEndDate: Date,
        clusterEvents: EventWithDist[]
    ) {
        evaluatePath(currentPath, currentPurse);

        const currentEvent = currentPath[currentPath.length - 1].event;
        const currentDate = new Date(currentEvent.date);

        for (let i = currentIndex + 1; i < clusterEvents.length; i++) {
            const nextEvent = clusterEvents[i];
            const nextDate = new Date(nextEvent.date);

            // Constraint: Must be on or after current date (allow same day if different event IDs, and sorted by date naturally)
            // Constraint: Must be within the trip window
            if (nextDate.getTime() >= currentDate.getTime() && nextDate.getTime() <= windowEndDate.getTime()) {
                const distMiles = haversine(
                    currentEvent.latitude, currentEvent.longitude,
                    nextEvent.latitude!, nextEvent.longitude!
                );

                // Optional constraint: limit daily drive time between events (e.g. max 8 hours)
                if (distMiles / AVG_MPH <= MAX_DRIVE_HOURS_PER_DAY) {
                    currentPath.push({
                        event: {
                            id: nextEvent.id,
                            name: nextEvent.name,
                            date: nextEvent.date.toISOString(),
                            locationAddress: nextEvent.locationAddress,
                            latitude: nextEvent.latitude!,
                            longitude: nextEvent.longitude!,
                            purseAmount: nextEvent.purseAmount,
                            detailsUrl: nextEvent.detailsUrl,
                            organization: nextEvent.organization,
                        },
                        driveFromPrevMiles: Math.round(distMiles),
                        driveFromPrevHours: Math.round((distMiles / AVG_MPH) * 10) / 10,
                        dayOfTrip: currentPath.length + 1,
                        arrivalDate: nextEvent.date.toISOString(),
                    });

                    dfs(
                        i,
                        currentPath,
                        currentPurse + (nextEvent.purseAmount || 0),
                        windowEndDate,
                        clusterEvents
                    );

                    currentPath.pop();
                }
            }
        }
    }

    // Sliding window: Use every reachable event as a potential starting point
    for (let i = 0; i < reachable.length; i++) {
        const startEvent = reachable[i];

        // Window ends tripDays - 1 after the start event
        const windowEnd = new Date(startEvent.date);
        windowEnd.setDate(windowEnd.getDate() + tripDays - 1);

        // Optimization: Only cluster events within this potential window to reduce inner loop size
        // AND ensuring we include all events even ones on the same date as our start event
        const clusterEvents = reachable.filter(
            e => new Date(e.date).getTime() >= new Date(startEvent.date).getTime() &&
                new Date(e.date).getTime() <= windowEnd.getTime()
        );

        // Find index of startEvent in clusterEvents
        const clusterStartIndex = clusterEvents.findIndex(e => e.id === startEvent.id);

        const initialMiles = haversine(lat, lng, startEvent.latitude!, startEvent.longitude!);
        const initialPath: RecommendedStop[] = [{
            event: {
                id: startEvent.id,
                name: startEvent.name,
                date: startEvent.date.toISOString(),
                locationAddress: startEvent.locationAddress,
                latitude: startEvent.latitude!,
                longitude: startEvent.longitude!,
                purseAmount: startEvent.purseAmount,
                detailsUrl: startEvent.detailsUrl,
                organization: startEvent.organization,
            },
            driveFromPrevMiles: Math.round(initialMiles),
            driveFromPrevHours: Math.round((initialMiles / AVG_MPH) * 10) / 10,
            dayOfTrip: 1,
            arrivalDate: startEvent.date.toISOString(),
        }];

        dfs(
            clusterStartIndex,
            initialPath,
            (startEvent.purseAmount || 0),
            windowEnd,
            clusterEvents
        );
    }


    let finalReturnMiles = 0;
    let finalReturnHours = 0;
    let finalTotalMiles = 0;
    let finalTotalDriveHours = 0;

    if (bestRoute.length > 0) {
        const lastStop = bestRoute[bestRoute.length - 1];
        finalReturnMiles = haversine(lastStop.event.latitude, lastStop.event.longitude, lat, lng);
        finalReturnHours = finalReturnMiles / AVG_MPH;
        finalTotalMiles = bestRoute.reduce((s, r) => s + r.driveFromPrevMiles, 0) + Math.round(finalReturnMiles);
        finalTotalDriveHours = bestRoute.reduce((s, r) => s + r.driveFromPrevHours, 0) + Math.round(finalReturnHours * 10) / 10;
    }

    const totalReachableCount = reachable.length;

    return NextResponse.json({
        stops: bestRoute,
        totalMiles: Math.round(finalTotalMiles),
        totalDriveHours: Math.round(finalTotalDriveHours * 10) / 10,
        returnMiles: Math.round(finalReturnMiles),
        returnHours: Math.round(finalReturnHours * 10) / 10,
        tripDays,
        maxOneWayMiles: Math.round(maxOneWayMiles),
        totalReachableCount,
        totalPurse: bestTotalPurse > -1 ? bestTotalPurse : 0
    });
}
