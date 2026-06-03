const fs = require('fs');
const path = require('path');

const basePath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database';
const files = [
  'AspNetUsers.csv',
  'AspNetUserRoles.csv',
  'LicenseMaster.csv',
  'LicenseAssignDealer.csv'
];

files.forEach(f => {
  const p = path.join(basePath, f);
  if (fs.existsSync(p)) {
    const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(Boolean);
    console.log(`${f}: ${lines.length - 1} records (excluding header)`);
  } else {
    console.log(`${f} does not exist.`);
  }
});
