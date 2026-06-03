const fs = require('fs');

const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/AspNetUsers.csv';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split(/\r?\n/);

const oddQuoteLines = [870, 1390, 1791, 2054, 2776];
oddQuoteLines.forEach(lIdx => {
  const line = lines[lIdx - 1];
  console.log(`Line ${lIdx}: ${line}`);
});
