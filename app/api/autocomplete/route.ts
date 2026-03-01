import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const UA = 'PitRouteBBQ/1.0 (dev@pitroute.io)';

async function nominatimAutocomplete(q: string) {
    const res = await axios.get(NOMINATIM_URL, {
        params: { q, format: 'json', limit: 5, addressdetails: 1 },
        headers: { 'User-Agent': UA }
    });
    return res.data as Array<{ lat: string; lon: string; display_name: string }>;
}

export async function GET(req: NextRequest) {
    const q = new URL(req.url).searchParams.get('q');
    if (!q) return NextResponse.json({ error: 'q required' }, { status: 400 });

    try {
        const data = await nominatimAutocomplete(q);

        if (data && data.length > 0) {
            const suggestions = data.map(item => ({
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                displayName: item.display_name
            }));
            return NextResponse.json({ suggestions });
        }

        return NextResponse.json({ suggestions: [] });
    } catch {
        return NextResponse.json({ error: 'Autocomplete failed' }, { status: 500 });
    }
}
