import fs from 'fs';
import path from 'path';

function extract() {
    // The path to the overview text log
    const logPath = 'c:\\Users\\bpdau\\.gemini\\antigravity\\brain\\3feaac9f-bdd2-4706-9e74-63e212b6fc38\\.system_generated\\logs\\overview.txt';
    const content = fs.readFileSync(logPath, 'utf8');

    // Find the marker: "10th Annual Jimmy Jam BBQ Slam1/9/2026 - 1/10/2026St. Augustine, FL 32086"
    const startIdx = content.indexOf('10th Annual Jimmy Jam BBQ Slam1/9/2026 - 1/10/2026St. Augustine, FL 32086');
    const endIdx = content.indexOf('The search interface is here: https://mms.kcbs.us/members/evr_search.php?org_id=KCBA');

    if (startIdx !== -1 && endIdx !== -1) {
        const textToSave = content.substring(startIdx, endIdx).trim();
        fs.writeFileSync('scripts/kcbs_dump.txt', textToSave);
        console.log('Successfully extracted event list to scripts/kcbs_dump.txt');
    } else {
        console.error('Could not find markers in log.');
    }
}

extract();
