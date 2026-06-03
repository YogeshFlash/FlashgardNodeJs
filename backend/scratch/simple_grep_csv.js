const fs = require('fs');

const csvPath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/LicenseMaster.csv';
const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split(/\r?\n/);
const target = '59534d523934554f564f455a53324352';

for (let i = 0; i < lines.length; i++) {
  if (lines[i].toLowerCase().includes(target)) {
    console.log(`Line ${i}:`, lines[i]);
  }
}
