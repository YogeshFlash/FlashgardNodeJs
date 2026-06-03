const fs = require('fs');

const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/AspNetUsers.csv';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split(/\r?\n/);

const targets = [
  '017e0747-dd6c-45db-8e01-10ba8a9fb169', // Demo - ware House
  '4909ed49-2eef-4ffd-bed1-faf2cb88f457'  // 0001 - Vijaykumar C.V
];

targets.forEach(t => {
  const lineIdx = lines.findIndex(l => l.includes(t));
  console.log(`Target ${t} is on line ${lineIdx + 1}`);
});
