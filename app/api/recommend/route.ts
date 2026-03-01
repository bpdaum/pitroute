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
    const requiredEventIds = searchParams.getAll('requiredEventIds');
    const maxDistanceParam = searchParams.get('maxDistance');

    if (isNaN(lat) || isNaN(lng) || requiredEventIds.length === 0) {
        return NextResponse.json({ error: 'lat, lng, and at least one requiredEventId are required' }, { status: 400 });
    }

    const requiredEvents = await prisma.event.findMany({
        where: { id: { in: requiredEventIds } },
    });

    if (requiredEvents.length !== requiredEventIds.length) {
        return NextResponse.json({ error: 'One or more required events not found' }, { status: 404 });
    }

    const requiredDates = requiredEvents.map(e => new Date(e.date).getTime());
    const minAnchorDate = new Date(Math.min(...requiredDates));
    const maxAnchorDate = new Date(Math.max(...requiredDates));

    minAnchorDate.setHours(0, 0, 0, 0);
    maxAnchorDate.setHours(23, 59, 59, 999);

    // Build the search window: up to 14 days before the earliest event, and 14 days after the latest
    const startWindow = new Date(minAnchorDate.getTime() - 14 * 24 * 60 * 60 * 1000);
    const endWindow = new Date(maxAnchorDate.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Enforce "today" as the absolute minimum bound so historical routes can't be planned
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const windowStartBounded = new Date(Math.max(startWindow.getTime(), today.getTime()));

    const tripDays = Math.max(1, Math.ceil((endWindow.getTime() - windowStartBounded.getTime()) / (1000 * 60 * 60 * 24)));

    // Ensure the user can at least reach the furthest required event
    const maxDistToRequired = Math.max(...requiredEvents.map(e =>
        haversine(lat, lng, e.latitude!, e.longitude!)
    ));
    let maxOneWayMiles = Math.max(720, maxDistToRequired + 100);

    if (maxDistanceParam) {
        const parsedMax = parseFloat(maxDistanceParam);
        if (!isNaN(parsedMax) && parsedMax > 0) {
            maxOneWayMiles = Math.max(parsedMax, maxDistToRequired + 50); // NEVER let the user's radius exclude a required event
        }
    }

    // Fetch all upcoming geocoded events within exact window
    const allEvents = await prisma.event.findMany({
        where: {
            latitude: { not: null },
            longitude: { not: null },
            date: { gte: windowStartBounded, lte: endWindow },
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
        // Enforce Anchor Constraint: Path MUST visit ALL required events
        const allRequiredVisited = requiredEventIds.every(reqId =>
            path.some(stop => stop.event.id === reqId)
        );
        if (!allRequiredVisited) {
            return;
        }

        // Calculate total miles including return
        const lastStop = path[path.length - 1];
        let pathMiles = 0;

        for (let i = 0; i < path.length; i++) {
            if (i === 0) {
                // Initial drive from hub to first event
                pathMiles += path[i].driveFromPrevMiles;
            } else {
                const prevDate = new Date(path[i - 1].event.date).getTime();
                const currDate = new Date(path[i].event.date).getTime();
                const daysBetween = (currDate - prevDate) / (24 * 60 * 60 * 1000);

                if (daysBetween > 4) {
                    // It's a new weekend trip. Drive home from prev, then drive from home to new.
                    const returnHomeMiles = haversine(path[i - 1].event.latitude, path[i - 1].event.longitude, lat, lng);
                    const driveFreshMiles = haversine(lat, lng, path[i].event.latitude, path[i].event.longitude);
                    pathMiles += (returnHomeMiles + driveFreshMiles);
                } else {
                    // Standard chain hop
                    pathMiles += path[i].driveFromPrevMiles;
                }
            }
        }

        // Final return trip home from the last event
        const returnMiles = haversine(lastStop.event.latitude, lastStop.event.longitude, lat, lng);
        pathMiles += returnMiles;

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
        currentPurse: number
    ) {
        evaluatePath(currentPath, currentPurse);

        const currentEvent = currentPath[currentPath.length - 1].event;
        const currentDate = new Date(currentEvent.date);

        for (let i = currentIndex + 1; i < reachable.length; i++) {
            const nextEvent = reachable[i];
            const nextDate = new Date(nextEvent.date);

            const distMiles = haversine(
                currentEvent.latitude, currentEvent.longitude,
                nextEvent.latitude!, nextEvent.longitude!
            );
            const isSameVenue = distMiles < 5;

            // Constraint: Must be on or after current date 
            if (nextDate.getTime() >= currentDate.getTime()) {

                // CRITICAL FIX: You cannot physically attend two events in different cities on the exact same day
                if (!isSameVenue && nextDate.getTime() === currentDate.getTime()) {
                    continue; // Skip trying to cook two events simultaneously
                }

                // Optional constraint: limit daily drive time between events
                const daysBetween = Math.max(1, (nextDate.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000));

                // If the gap is > 4 days, we assume the driver went home and rested. 
                // They get a "fresh start" driving from the Hub to the new event, bypassing the chained constraint.
                let isValidDriveHop = false;

                if (daysBetween > 4) {
                    // Treat as a fresh round-trip leg
                    isValidDriveHop = true;

                    // We *could* validate if the Hub -> NextEvent drive is possible by itself, but since we already filtered 
                    // `reachable` by `maxDistance` upfront, we know the user can reach it from their Hub.
                } else {
                    // Standard chained leg check
                    if (distMiles / AVG_MPH <= daysBetween * MAX_DRIVE_HOURS_PER_DAY) {
                        // Realistic timeline check
                        if (!isSameVenue) {
                            const currentEnd = currentDate.getTime() + (17 * 60 * 60 * 1000); // 5 PM day of cook
                            const driveMs = (distMiles / AVG_MPH) * 60 * 60 * 1000;
                            const absoluteLatestArrivalMs = nextDate.getTime() + (8 * 60 * 60 * 1000); // 8 AM day of next cook

                            if (currentEnd + driveMs <= absoluteLatestArrivalMs) {
                                isValidDriveHop = true;
                            }
                        } else {
                            isValidDriveHop = true;
                        }
                    }
                }

                if (isValidDriveHop) {
                    // If it was a round-trip reset (> 4 days), the 'driveFromPrevMiles' logic gets messy to display in UI.
                    // For now, we still calculate the theoretical "chained" distance here for the UI node connecting line,
                    // but `evaluatePath` handles the true mileage sum scoring correctly.

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
                        currentPurse + (nextEvent.purseAmount || 0)
                    );

                    currentPath.pop();
                }
            }
        }
    }

    // Since the window is strictly defined by the user (startDate to endDate)
    // We treat every event as a potential starting point for the route
    for (let i = 0; i < reachable.length; i++) {
        const startEvent = reachable[i];
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
            i,
            initialPath,
            (startEvent.purseAmount || 0)
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
