const fs = require('fs');
const csv = require('csv-parser');
const { Readable } = require('stream');

async function parseCsvBuffer(buffer) {
  const rows = [];
  return new Promise((resolve, reject) => {
    Readable.from(buffer)
      .pipe(csv({
          mapHeaders: ({ header }) => header.trim().replace(/^\ufeff/, ''),
          mapValues: ({ value }) => value?.trim()
      }))
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

async function main() {
  const usersPath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/AspNetUsers.csv';
  const buffer = fs.readFileSync(usersPath);
  console.log('Parsing with csv-parser...');
  const rows = await parseCsvBuffer(buffer);
  console.log(`Parsed rows count: ${rows.length}`);

  const targets = [
    '2a625437-5191-4578-b355-f33dee14e6fb',
    '4146a6fe-12a6-41e3-aa5e-a7e818182ef0'
  ];

  targets.forEach(t => {
    const found = rows.find(r => r.Id === t);
    console.log(`Target ${t} found:`, found ? 'YES' : 'NO');
  });
}

main().catch(console.error);
