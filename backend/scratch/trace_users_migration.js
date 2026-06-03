const fs = require('fs');
const path = require('path');

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

const usersPath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/AspNetUsers.csv';
const rolesPath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/AspNetUserRoles.csv';

console.log('Parsing files...');
const users = parseCSV(usersPath);
const userRoles = parseCSV(rolesPath);

const targets = [
  '2a625437-5191-4578-b355-f33dee14e6fb',
  '4146a6fe-12a6-41e3-aa5e-a7e818182ef0'
];

targets.forEach(target => {
  console.log(`\n=== Tracing Target: ${target} ===`);
  const uRow = users.find(u => u.Id === target);
  if (!uRow) {
    console.log(`Not found in AspNetUsers.csv!`);
    return;
  }
  console.log('User Row in CSV:', JSON.stringify(uRow, null, 2));

  const uRoles = userRoles.filter(ur => ur.UserId === target);
  console.log('Roles for User in CSV:', JSON.stringify(uRoles, null, 2));
});
