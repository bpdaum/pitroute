import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const UA = 'CookrBBQApp/1.0 (dev@cookr.app)';

async function nominatimSearch(q: string, countrycodes?: string) {
    const res = await axios.get(NOMINATIM_URL, {
        params: { q, format: 'json', limit: 1, ...(countrycodes ? { countrycodes } : {}) },
        headers: { 'User-Agent': UA }
    });
    return res.data as Array<{ lat: string; lon: string; display_name: string }>;
}

export async function GET(req: NextRequest) {
    const q = new URL(req.url).searchParams.get('q');
    if (!q) return NextResponse.json({ error: 'q required' }, { status: 400 });

    try {
        // Try US first — critical for correctly resolving US zip codes
        let data = await nominatimSearch(q, 'us');

        // If nothing found in US, try global (handles "London", etc.)
        if (!data || data.length === 0) {
            data = await nominatimSearch(q);
        }

        if (data && data.length > 0) {
            const { lat, lon, display_name } = data[0];
            return NextResponse.json({
                lat: parseFloat(lat),
                lng: parseFloat(lon),
                displayName: display_name
            });
        }

        return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    } catch {
        return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
    }
}
