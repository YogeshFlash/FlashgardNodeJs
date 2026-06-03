const fs = require('fs');
const path = require('path');

function decodeHex(hex) {
  if (!hex) return '';
  try {
    return Buffer.from(hex, 'hex').toString('utf8');
  } catch {
    return '';
  }
}

const basePath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database';
const licPath = path.join(basePath, 'LicenseMaster.csv');
const lines = fs.readFileSync(licPath, 'utf8').split(/\r?\n/);
const headers = lines[0].split(',').map(h => h.trim());

const targets = ['BRSS27COI2614844', '5P0COIXEW9WHQR8W'];

targets.forEach(t => {
  console.log(`\n=== Matches for ${t} in CSV ===`);
  let matchesCount = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = parts[idx]?.trim();
    });
    const key = decodeHex(row.LicenseKey || row.Licensekey);
    if (key.toLowerCase() === t.toLowerCase()) {
      matchesCount++;
      console.log(JSON.stringify(row, null, 2));
      console.log(`Decoded Key: ${key}`);
    }
  }
  console.log(`Found ${matchesCount} matches.`);
});
