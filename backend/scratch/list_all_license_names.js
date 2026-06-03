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

const samples = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  const values = parseCSVLine(line);
  const name = values[1] ? values[1].trim() : '';
  const ref = values[3] ? values[3].trim() : '';
  if (!name.startsWith('Bhavika_') && !name.startsWith('Test_') && !name.startsWith('FLASH_')) {
    samples.push({ index: i, name, ref });
    if (samples.length >= 30) break;
  }
}

console.log('Sample LicenseNames:');
console.log(samples);
