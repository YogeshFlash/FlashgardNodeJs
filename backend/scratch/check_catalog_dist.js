const fs = require('fs');
const csv = require('csv-parser');

const modelFile = 'd:\\Projects\\Flashgard2.0\\Flashgard_2\\Flashgard\\mobile\\android\\app\\libs\\DatatoMigrate\\ModelMaster.csv';

const catalogCounts = new Map();
fs.createReadStream(modelFile)
  .pipe(csv({ headers: false }))
  .on('data', (data) => {
    const cid = data[5]?.trim();
    catalogCounts.set(cid, (catalogCounts.get(cid) || 0) + 1);
  })
  .on('end', () => {
    console.log('CatalogID Distribution in ModelMaster:');
    const sorted = [...catalogCounts.entries()].sort((a, b) => b[1] - a[1]);
    sorted.forEach(([id, count]) => console.log(`CatalogID ${id}: ${count} designs`));
  });
