const fs = require('fs');

const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/AspNetUsers.csv';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split(/\r?\n/);

let openQuoteLine = -1;
let inQuote = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let quoteCount = 0;
  for (let j = 0; j < line.length; j++) {
    if (line[j] === '"') {
      quoteCount++;
    }
  }
  
  if (quoteCount % 2 !== 0) {
    console.log(`Line ${i + 1} has an odd number of quotes (${quoteCount}):`);
    console.log(`  Content: ${line.substring(0, 100)}...`);
  }
}
