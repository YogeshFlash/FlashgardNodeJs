const fs = require('fs');

function getCSVLength(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  return lines.length - 1; // subtract header
}

const usersPath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/AspNetUsers.csv';
const rolesPath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/AspNetUserRoles.csv';

console.log(`AspNetUsers.csv rows: ${getCSVLength(usersPath)}`);
console.log(`AspNetUserRoles.csv rows: ${getCSVLength(rolesPath)}`);
console.log(`Sum: ${getCSVLength(usersPath) + getCSVLength(rolesPath)}`);
