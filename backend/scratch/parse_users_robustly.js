const fs = require('fs');

function parseUsersRobustly(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
  const lines = content.split(/\r?\n/);
  
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple split by comma. We don't use standard CSV parsing because of unescaped quotes.
    const parts = line.split(',');
    if (parts.length < 33) {
      // Incomplete line
      console.warn(`Line ${i + 1} has only ${parts.length} columns: ${line}`);
      continue;
    }

    const row = {};
    // First 20 fields (0 to 19)
    for (let j = 0; j < 20; j++) {
      row[headers[j]] = parts[j].trim();
    }

    // Last 12 fields (from parts.length - 12 to parts.length - 1)
    const startLast12 = parts.length - 12;
    for (let j = 0; j < 12; j++) {
      row[headers[21 + j]] = parts[startLast12 + j].trim();
    }

    // Address is everything in between (index 20 to parts.length - 13)
    const addressParts = parts.slice(20, parts.length - 12);
    row['Address'] = addressParts.join(',').trim();

    rows.push(row);
  }

  return rows;
}

const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/AspNetUsers.csv';
console.log('Parsing robustly...');
const rows = parseUsersRobustly(path);
console.log(`Successfully parsed ${rows.length} rows.`);

const targets = [
  '2a625437-5191-4578-b355-f33dee14e6fb',
  '4146a6fe-12a6-41e3-aa5e-a7e818182ef0'
];

targets.forEach(t => {
  const found = rows.find(r => r.Id === t);
  console.log(`\nTarget ${t}:`);
  if (found) {
    console.log(JSON.stringify(found, null, 2));
  } else {
    console.log('NOT FOUND');
  }
});
