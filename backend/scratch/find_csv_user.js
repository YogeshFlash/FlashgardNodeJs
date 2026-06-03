const fs = require('fs');

const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/AspNetUsers.csv';
if (!fs.existsSync(path)) {
  console.log('AspNetUsers.csv not found');
  return;
}

const content = fs.readFileSync(path, 'utf8');
const lines = content.split(/\r?\n/);
const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
console.log('Headers:', headers);

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  if (line.includes('tsm.gwh@flashsolutions.in') || line.includes('venkat.reddy@flashsolutions.in')) {
    console.log(`Row ${i}:`, line);
  }
}
