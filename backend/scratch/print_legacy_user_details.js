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

    const parts = line.split(',');
    if (parts.length < 33) continue;

    const row = {};
    for (let j = 0; j < 20; j++) {
      row[headers[j]] = parts[j].trim();
    }
    const startLast12 = parts.length - 12;
    for (let j = 0; j < 12; j++) {
      row[headers[21 + j]] = parts[startLast12 + j].trim();
    }
    const addressParts = parts.slice(20, parts.length - 12);
    row['Address'] = addressParts.join(',').trim();

    rows.push(row);
  }
  return rows;
}

const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/AspNetUsers.csv';
const rows = parseUsersRobustly(path);

const ids = [
  '017e0747-dd6c-45db-8e01-10ba8a9fb169', // Demo - ware House
  '4909ed49-2eef-4ffd-bed1-faf2cb88f457'  // 0001 - Vijaykumar C.V
];

for (const id of ids) {
  const row = rows.find(r => r.Id === id);
  console.log(`\n=== Legacy user details for ID: ${id} ===`);
  if (row) {
    console.log(JSON.stringify(row, null, 2));
  } else {
    console.log('Not found in CSV.');
  }
}
