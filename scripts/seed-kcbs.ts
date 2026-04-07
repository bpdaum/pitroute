import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

function parseEvents(text: string) {
  const blocks = text.split('---').map(b => b.trim()).filter(Boolean);
  const events: any[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    // Skip judging/class entries
    const name = lines[0];
    if (/judg|class|banquet|board of directors|sauce contest|team registration/i.test(name)) continue;

    // Find date line like "5/1/2026 - 5/2/2026"
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
  // Ensure KCBS org exists
  let org = await prisma.organization.findFirst({ where: { name: 'KCBS' } });
  if (!org) {
    org = await prisma.organization.create({
      data: { name: 'KCBS', url: 'https://mms.kcbs.us/members/evr_search.php?org_id=KCBA' }
    });
    console.log('Created KCBS org');
  }

  const scratchpad1 = 'scripts/kcbs-jan-apr.md';
  const scratchpad2 = 'scripts/kcbs-may.md';

  // Parse scratchpad1 (Jan-Apr): convert structured list format
  const text1 = fs.readFileSync(scratchpad1, 'utf8');
  // Extract the "Collected Data" section and convert to block format
  const blocks1: string[] = [];
  const lines1 = text1.split('\n');
  let currentBlock: string[] = [];
  let inData = false;
  for (const line of lines1) {
    if (line.startsWith('### ') || line.startsWith('## ')) { inData = line.startsWith('### ') || line.includes('Collected Data'); continue; }
    if (/^\d+\.\s/.test(line.trim())) {
      if (currentBlock.length > 0) blocks1.push(currentBlock.join('\n'));
      currentBlock = [line.replace(/^\d+\.\s/, '').trim()];
    } else if (line.trim().startsWith('- Dates:')) {
      const d = line.replace('- Dates:', '').trim();
      currentBlock.push(d.split(' - ')[0].trim());
    } else if (line.trim().startsWith('- Location:')) {
      currentBlock.push(line.replace('- Location:', '').trim());
    } else if (line.trim().startsWith('- Prize Money:') && !line.includes('N/A')) {
      const pm = line.replace('- Prize Money:', '').trim();
      currentBlock.push(`Prize Money: ${pm}`);
    }
  }
  if (currentBlock.length > 0) blocks1.push(currentBlock.join('\n'));

  // Parse scratchpad2 (May+): already in block format separated by ---
  const text2 = fs.readFileSync(scratchpad2, 'utf8');
  const dataSection2 = text2.substring(text2.indexOf('Bear-B-Q'));

  const events1 = parseEvents(blocks1.join('\n---\n'));
  const events2 = parseEvents(dataSection2);
  const allEvents = [...events1, ...events2];

  console.log(`Parsed ${allEvents.length} events total. Upserting...`);

  let ok = 0, err = 0;
  for (const ev of allEvents) {
    try {
      await prisma.event.upsert({
        where: { organizationId_name_date: { organizationId: org.id, name: ev.name, date: ev.date } },
        create: { organizationId: org.id, name: ev.name, date: ev.date, locationAddress: ev.locationAddress, purseAmount: ev.purseAmount },
        update: { locationAddress: ev.locationAddress, purseAmount: ev.purseAmount }
      });
      ok++;
    } catch(e: any) {
      console.error(`Error: ${ev.name} - ${e.message}`);
      err++;
    }
  }
  console.log(`Done. ${ok} upserted, ${err} errors.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
