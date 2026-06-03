const fs = require('fs');

function parseCSVLine(line) {
    const result = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            result.push(cur);
            cur = '';
        } else {
            cur += char;
        }
    }
    result.push(cur);
    return result;
}

function parseCSV(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    const headers = parseCSVLine(lines[0]).map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const obj = {};
        headers.forEach((h, i) => { obj[h] = values[i] ? values[i].trim() : null; });
        return obj;
    });
}

const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/LicenseAssignDealer.csv';
console.log('Loading LicenseAssignDealer.csv...');
const assignments = parseCSV(path);
console.log(`Loaded ${assignments.length} assignments.`);

const targets = [
  '017e0747-dd6c-45db-8e01-10ba8a9fb169', // Demo - ware House
  '4909ed49-2eef-4ffd-bed1-faf2cb88f457'  // 0001 - Vijaykumar C.V
];

targets.forEach(target => {
  console.log(`\n=== Assignments for ${target}: ===`);
  const matches = assignments.filter(a => a.DealerID === target || a.CreatedBy === target || a.ModifiedBy === target);
  console.log(`Found ${matches.length} matching rows.`);
  matches.forEach(m => {
    console.log(JSON.stringify(m));
  });
});
