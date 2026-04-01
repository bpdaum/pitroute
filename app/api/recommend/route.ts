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

    if (isNaN(lat) || isNaN(lng) || requiredEventIds.length === 0) {
        return NextResponse.json({ error: 'lat, lng, and at least one requiredEventId are required' }, { status: 400 });
    }

    const requiredEvents = await prisma.event.findMany({
        where: { id: { in: requiredEventIds } },
        include: { organization: { select: { name: true } } },
    });

    if (requiredEvents.length !== requiredEventIds.length) {
        return NextResponse.json({ error: 'One or more required events not found' }, { status: 404 });
    }

    // Sort strictly by chronology
    const chronologicalEvents = requiredEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let bestRoute: RecommendedStop[] = [];
    let totalPurse = 0;
    let prevLat = lat;
    let prevLng = lng;

    for (let i = 0; i < chronologicalEvents.length; i++) {
        const ev = chronologicalEvents[i];
        
        let driveMiles = 0;
        
        // If it's a new event that's > 4 days apart from the last, assume we went home first
        let wentHomeFirst = false;
        if (i > 0) {
            const prevEv = chronologicalEvents[i - 1];
            const daysBetween = (new Date(ev.date).getTime() - new Date(prevEv.date).getTime()) / (1000 * 60 * 60 * 24);
            if (daysBetween > 4) {
                wentHomeFirst = true;
            }
        }

        if (wentHomeFirst) {
            // Drive from prev event to home, then home to new event
            const distToHome = haversine(prevLat, prevLng, lat, lng);
            const distHomeToNew = haversine(lat, lng, ev.latitude!, ev.longitude!);
            driveMiles = distToHome + distHomeToNew;
        } else {
            // Straight drive from previous stop
            driveMiles = haversine(prevLat, prevLng, ev.latitude!, ev.longitude!);
        }

        bestRoute.push({
            event: {
                id: ev.id,
                name: ev.name,
                date: ev.date.toISOString(),
                locationAddress: ev.locationAddress,
                latitude: ev.latitude!,
                longitude: ev.longitude!,
                purseAmount: ev.purseAmount,
                detailsUrl: ev.detailsUrl,
                organization: ev.organization,
            },
            driveFromPrevMiles: Math.round(driveMiles),
            driveFromPrevHours: Math.round((driveMiles / AVG_MPH) * 10) / 10,
            dayOfTrip: i + 1,
            arrivalDate: ev.date.toISOString(),
        });

        totalPurse += ev.purseAmount || 0;
        prevLat = ev.latitude!;
        prevLng = ev.longitude!;
    }

    let finalReturnMiles = 0;
    let finalReturnHours = 0;
    let finalTotalMiles = 0;
    let finalTotalDriveHours = 0;
    let tripDays = 1;

    if (bestRoute.length > 0) {
        const lastStop = bestRoute[bestRoute.length - 1];
        finalReturnMiles = haversine(lastStop.event.latitude, lastStop.event.longitude, lat, lng);
        finalReturnHours = finalReturnMiles / AVG_MPH;
        finalTotalMiles = bestRoute.reduce((s, r) => s + r.driveFromPrevMiles, 0) + Math.round(finalReturnMiles);
        finalTotalDriveHours = bestRoute.reduce((s, r) => s + r.driveFromPrevHours, 0) + Math.round(finalReturnHours * 10) / 10;
        
        const firstDate = new Date(bestRoute[0].event.date);
        const lastDate = new Date(bestRoute[bestRoute.length-1].event.date);
        tripDays = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
    }

    return NextResponse.json({
        stops: bestRoute,
        totalMiles: Math.round(finalTotalMiles),
        totalDriveHours: Math.round(finalTotalDriveHours * 10) / 10,
        returnMiles: Math.round(finalReturnMiles),
        returnHours: Math.round(finalReturnHours * 10) / 10,
        tripDays,
        maxOneWayMiles: 0,
        totalReachableCount: chronologicalEvents.length,
        totalPurse
    });
}
