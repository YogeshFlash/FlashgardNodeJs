const fs = require('fs');

const csvPath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/MobileAppUser.csv';
const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split(/\r?\n/);

console.log('Mobile Headers:', lines[0]);

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  const parts = line.split(',');
  if (parts.some(p => p.replace(/"/g, '').trim() === '17')) {
    console.log(`Row ${i}:`, line);
  }
}
