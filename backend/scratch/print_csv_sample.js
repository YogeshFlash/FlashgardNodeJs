const fs = require('fs');
const path = require('path');

const basePath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database';
const licPath = path.join(basePath, 'LicenseMaster.csv');
const lines = fs.readFileSync(licPath, 'utf8').split(/\r?\n/).slice(0, 10);

lines.forEach((l, i) => {
  console.log(`Line ${i}: ${l}`);
});
