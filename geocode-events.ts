/**
 * Geocodes all events in the database that don't have lat/lng
 * using Nominatim (free OpenStreetMap geocoder, 1 req/sec)
 * with a fallback to DuckDuckGo HTML search for blank/bad addresses.
 */
import { prisma } from './lib/prisma';
import axios from 'axios';
import * as cheerio from 'cheerio';

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Attempts to extract a viable address or venue name from Yahoo search snippets
async function fallbackSearch(eventName: string, originalLocation: string | null): Promise<string | null> {
    try {
        const query = encodeURIComponent(`${eventName} location address`);
        const url = `https://search.yahoo.com/search?p=${query}`;

        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });

        const $ = cheerio.load(res.data);
        const snippets: string[] = [];

        // Yahoo uses .compText and .compTitle for search result snippets/titles
        $('.compText').each((i, el) => {
            snippets.push($(el).text().trim());
        });

        if (snippets.length === 0) {
            console.log(`\nYahoo returned 0 snippets. HTML length: ${res.data.length}`);
            return null;
        }

        // Look for Zip Codes, state abbreviations, or "held at" / "located at"
        for (const text of snippets) {
            // Very naive extraction: grab text after "located at", "held at", "venue:"
            const venueMatch = text.match(/(?:held at|located at|venue:?|address:?)\s+([^.\n]+)/i);
            if (venueMatch && venueMatch[1].length > 5) {
                return venueMatch[1].trim() + ", USA"; // Append USA for better geocoding
            }

            // Or look for a zip code pattern "City, ST 12345"
            const zipMatch = text.match(/[A-Z][a-z\s]+,\s*[A-Z]{2}\s+\d{5}/);
            if (zipMatch) {
                return zipMatch[0];
            }
        }

        // If no explicit venue pattern, just take the first snippet and hope the geocoder can make sense of it
        const cityStateMatch = snippets[0].match(/[A-Z][a-z]+,\s*[A-Z]{2}/);
        if (cityStateMatch) {
            console.log(`\nYahoo Fallback guessing city for ${eventName}: ${cityStateMatch[0]}`);
            return `${eventName}, ${cityStateMatch[0]}`;
        }

        console.log(`\nYahoo Fallback found no usable patterns for ${eventName}. Snippets:`, snippets.slice(0, 2));
        return null;

    } catch (e: any) {
        console.log(`\nYahoo Fallback error for ${eventName}:`, e.message);
        return null;
    }
}

async function geocode(address: string, eventName: string): Promise<{ lat: number; lng: number, usedFallback: boolean, newAddress?: string } | null> {

    // Helper to call Nominatim
    const callNominatim = async (query: string) => {
        try {
            const res = await axios.get('https://nominatim.openstreetmap.org/search', {
                params: { q: query, format: 'json', limit: 1 },
                headers: { 'User-Agent': 'PitPlanBBQ/1.0 (dev@pitplan.io)' }
            });
            if (res.data && res.data.length > 0) {
                return { lat: parseFloat(res.data[0].lat), lng: parseFloat(res.data[0].lon) };
            }
            return null;
        } catch {
            return null;
        }
    };

    // 1. Clean up the original address (strip dates if accidentally scraped)
    let cleanAddress = address;
    if (cleanAddress) {
        // Remove patterns like "2/20/2026 - 2/21/2026,"
        cleanAddress = cleanAddress.replace(/\d{1,2}\/\d{1,2}\/\d{4}\s*-\s*\d{1,2}\/\d{1,2}\/\d{4},?\s*/g, '');
        cleanAddress = cleanAddress.trim();
    }

    // 2. Try normal geocoding if we have a reasonably long address
    if (cleanAddress && cleanAddress.length > 5) {
        const coords = await callNominatim(cleanAddress);
        if (coords) return { ...coords, usedFallback: false };
    }

    // 2.5 Try a looser city/state geocode if it has commas "Street, City, FL 12345"
    if (cleanAddress && cleanAddress.includes(',')) {
        const parts = cleanAddress.split(',').map(p => p.trim());
        if (parts.length >= 2) {
            let cityState = `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
            cityState = cityState.replace(/\./g, ''); // Strip periods like "FL. 32347"
            await sleep(1100);
            const looseCoords = await callNominatim(cityState);
            if (looseCoords) {
                return { ...looseCoords, usedFallback: false, newAddress: cityState };
            }
        }
    } else if (cleanAddress) {
        // Event has no commas, try to extract City State Zip using regex
        const match = cleanAddress.match(/([A-Z][A-Za-z\s]+)\s+([A-Za-z]{2})\s+(\d{5})/);
        if (match) {
            const cityState = `${match[1].trim()}, ${match[2]} ${match[3]}`;
            await sleep(1100);
            const looseCoords = await callNominatim(cityState);
            if (looseCoords) {
                return { ...looseCoords, usedFallback: false, newAddress: cityState };
            }
        }
    }

    // 3. If normal geocoding failed, try the fallback search
    await sleep(2000); // Be polite to DDG
    const fallbackAddress = await fallbackSearch(eventName, address);

    if (fallbackAddress) {
        await sleep(1500); // Nominatim rate limit
        const fallbackCoords = await callNominatim(fallbackAddress);
        if (fallbackCoords) {
            return { ...fallbackCoords, usedFallback: true, newAddress: fallbackAddress };
        }
    }

    return null;
}

async function main() {
    const events = await prisma.event.findMany({
        where: { latitude: null }
    });

    console.log(`Geocoding ${events.length} events...`);
    let success = 0;
    let fallbackSuccess = 0;

    for (const event of events) {
        const result = await geocode(event.locationAddress || '', event.name);

        if (result) {
            const updateData: any = { latitude: result.lat, longitude: result.lng };

            // If we found a better address via fallback, let's update that too so it shows in the UI
            if (result.usedFallback && result.newAddress) {
                updateData.locationAddress = result.newAddress;
                fallbackSuccess++;
            }

            await prisma.event.update({
                where: { id: event.id },
                data: updateData
            });

            success++;
            process.stdout.write(`\r✓ ${success}/${events.length} geocoded${result.usedFallback ? ' (via search)' : ''}                   `);
        } else {
            console.log(`\nx ${event.name} (${event.locationAddress || 'BLANK'}) — not found even with search`);
        }
        await sleep(1100); // Nominatim rate limit: 1 req/sec
    }

    console.log(`\n\nGeocoding complete: ${success}/${events.length} succeeded (${fallbackSuccess} via web search fallback)`);
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
