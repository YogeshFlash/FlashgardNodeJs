const fs = require('fs');
const csv = require('csv-parser');

const modelFile = 'd:\\Projects\\Flashgard2.0\\Flashgard_2\\Flashgard\\mobile\\android\\app\\libs\\DatatoMigrate\\ModelMaster.csv';

let rowCount = 0;
fs.createReadStream(modelFile)
  .pipe(csv({ headers: false }))
  .on('data', (data) => {
    if (rowCount === 0) {
      console.log('Row 0 keys:', Object.keys(data));
      console.log('Row 0 length:', Object.keys(data).length);
      Object.keys(data).forEach(k => {
        console.log(`Index ${k}:`, data[k]?.substring(0, 20));
      });
    }
    rowCount++;
  })
  .on('end', () => {
    console.log('Total Rows:', rowCount);
  });
