import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

function parseBlocks(text: string): any[] {
    const blocks = text.split(/\n?===\n?/).map(b => b.trim()).filter(Boolean);
    const events: any[] = [];

    for (const block of blocks) {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) continue;

        const name = lines[0];
        // Skip classes, certifications, banquets, board meetings
        if (/certif|class|banquet|board of directors|sauce contest|team registration|registration\b|\btable captain\b/i.test(name)) continue;

        // Find date line
        const dateLine = lines.find(l => /^\d{1,2}\/\d{1,2}\/\d{4}/.test(l));
        if (!dateLine) continue;
        const dateMatch = dateLine.match(/^(\d{1,2}\/\d{1,2}\/\d{4})/);
        if (!dateMatch) continue;

        const date = new Date(dateMatch[1]);
        if (isNaN(date.getTime())) continue;

        // Location: line after date
        const dateIdx = lines.indexOf(dateLine);
        const location = dateIdx + 1 < lines.length ? lines[dateIdx + 1] : '';

        // Prize money
        const purseLine = lines.find(l => /Prize Money:/i.test(l));
        let purseAmount: number | null = null;
        if (purseLine) {
            const m = purseLine.match(/\$([\d,]+(?:\.\d{2})?)/);
            if (m) purseAmount = parseFloat(m[1].replace(/,/g, ''));
        }

        events.push({ name, date, locationAddress: location, purseAmount });
    }
    return events;
}

async function main() {
    let org = await prisma.organization.findFirst({ where: { name: 'KCBS' } });
    if (!org) {
        org = await prisma.organization.create({
            data: { name: 'KCBS', url: 'https://mms.kcbs.us/members/evr_search.php?org_id=KCBA' }
        });
    }

    const scratchpadPath = 'C:\\Users\\bpdau\\.gemini\\antigravity\\brain\\3feaac9f-bdd2-4706-9e74-63e212b6fc38\\browser\\scratchpad_ohq0e21m.md';
    const text = fs.readFileSync(scratchpadPath, 'utf8');
    const events = parseBlocks(text);

    console.log(`Parsed ${events.length} events. Upserting...`);

    let ok = 0, err = 0;
    for (const ev of events) {
        try {
            await prisma.event.upsert({
                where: { organizationId_name_date: { organizationId: org.id, name: ev.name, date: ev.date } },
                create: { organizationId: org.id, ...ev },
                update: { locationAddress: ev.locationAddress, purseAmount: ev.purseAmount }
            });
            ok++;
        } catch (e: any) {
            console.error(`Error: ${ev.name} | ${e.message}`);
            err++;
        }
    }
    console.log(`Done. ${ok} upserted, ${err} errors.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
