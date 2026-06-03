const fs = require('fs');

const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/LicenseAssignDealer.csv';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split(/\r?\n/);

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  const parts = line.split(',');
  if (parts[1] === '17') {
    console.log(`Row ${i}:`, line);
  }
}
