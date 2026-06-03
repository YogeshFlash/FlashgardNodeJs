const fs = require('fs');
const csv = require('csv-parser');

const modelFile = 'd:\\Projects\\Flashgard2.0\\Flashgard_2\\Flashgard\\mobile\\android\\app\\libs\\DatatoMigrate\\ModelMaster.csv';

const rows = [];
fs.createReadStream(modelFile)
  .pipe(csv({ headers: false }))
  .on('data', (data) => {
    if (rows.length < 5) rows.push(data);
  })
  .on('end', () => {
    console.log('Sample Rows (ModelMaster):');
    rows.forEach((r, i) => console.log(`${i}:`, JSON.stringify(r)));
  });
