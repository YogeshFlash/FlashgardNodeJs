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

const csvPath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/LicenseMaster.csv';
const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split(/\r?\n/);
const headers = parseCSVLine(lines[0]).map(h => h.trim());

let emptyCount = 0;
const names = new Set();
const prefixCounts = {};

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  const values = parseCSVLine(line);
  const name = values[1] ? values[1].trim() : '';
  if (!name || name.toUpperCase() === 'NULL') {
    emptyCount++;
  } else {
    names.add(name);
    // Parse prefix before underscore
    const idx = name.lastIndexOf('_');
    const prefix = idx !== -1 && /^\d+$/.test(name.substring(idx + 1)) ? name.substring(0, idx) : name;
    prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
  }
}

console.log(`Total rows checked: ${lines.length - 1}`);
console.log(`Empty/NULL names: ${emptyCount}`);
console.log(`Unique non-empty names: ${names.size}`);
console.log(`Unique batch prefixes: ${Object.keys(prefixCounts).length}`);
console.log(`Prefixes and their counts:`, Object.entries(prefixCounts).sort((a,b)=>b[1]-a[1]));
