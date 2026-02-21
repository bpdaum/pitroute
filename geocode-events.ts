/**
 * Geocodes all events in the database that don't have lat/lng
 * using Nominatim (free OpenStreetMap geocoder, 1 req/sec)
 */
import { prisma } from './lib/prisma';
import axios from 'axios';

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
        const res = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: { q: address, format: 'json', limit: 1 },
            headers: { 'User-Agent': 'PitRouteBBQ/1.0 (dev@pitroute.io)' }
        });
        if (res.data && res.data.length > 0) {
            return { lat: parseFloat(res.data[0].lat), lng: parseFloat(res.data[0].lon) };
        }
        return null;
    } catch {
        return null;
    }
}

async function main() {
    const events = await prisma.event.findMany({
        where: { latitude: null, locationAddress: { not: null } }
    });

    console.log(`Geocoding ${events.length} events...`);
    let success = 0;

    for (const event of events) {
        const coords = await geocode(event.locationAddress!);
        if (coords) {
            await prisma.event.update({
                where: { id: event.id },
                data: { latitude: coords.lat, longitude: coords.lng }
            });
            success++;
            process.stdout.write(`\r✓ ${success}/${events.length} geocoded`);
        } else {
            process.stdout.write(`\nx ${event.name} (${event.locationAddress}) — not found`);
        }
        await sleep(1100); // Nominatim rate limit: 1 req/sec
    }

    console.log(`\n\nGeocoding complete: ${success}/${events.length} succeeded`);
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
