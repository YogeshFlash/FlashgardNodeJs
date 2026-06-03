const fs = require('fs');

const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/LicenseAssignDealer.csv';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split(/\r?\n/);
console.log('Headers:', lines[0]);
console.log('Row 1:', lines[1]);
console.log('Row 2:', lines[2]);
