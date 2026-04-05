import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const UA = 'PitPlanBBQ/1.0 (dev@pitplan.io)';

async function nominatimAutocomplete(q: string) {
    const res = await axios.get(NOMINATIM_URL, {
        params: { q, format: 'json', limit: 5, addressdetails: 1, countrycodes: 'us' },
        headers: { 'User-Agent': UA }
    });
    return res.data;
}

function formatAddress(item: any): string {
    if (!item.address) return item.display_name;

    const { house_number, road, city, town, village, county, state, postcode } = item.address;

    // Build street part
    let street = '';
    if (house_number && road) street = `${house_number} ${road}`;
    else if (road) street = road;

    // Build city part
    const locality = city || town || village || county || '';

    // Put it together
    const parts = [];
    if (street) parts.push(street);
    if (locality) parts.push(locality);
    if (state) parts.push(state);
    if (postcode) parts.push(postcode);

    return parts.length > 0 ? parts.join(', ') : item.display_name;
}

export async function GET(req: NextRequest) {
    const q = new URL(req.url).searchParams.get('q');
    if (!q) return NextResponse.json({ error: 'q required' }, { status: 400 });

    try {
        const data = await nominatimAutocomplete(q);

        if (data && data.length > 0) {
            const suggestions = data.map((item: any) => ({
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                displayName: formatAddress(item)
            }));
            return NextResponse.json({ suggestions });
        }

        return NextResponse.json({ suggestions: [] });
    } catch {
        return NextResponse.json({ error: 'Autocomplete failed' }, { status: 500 });
    }
}
