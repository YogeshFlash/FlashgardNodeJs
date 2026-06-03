const fs = require('fs');
const csv = require('csv-parser');

const filePath = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/mobile/android/app/libs/DatatoMigrate/ModelMaster.csv';

let count = 0;
const stream = fs.createReadStream(filePath)
    .pipe(csv({ headers: false }))
    .on('data', (row) => {
        if (count === 1) {
            console.log('Row 1 Full Columns:');
            Object.keys(row).forEach(key => {
                console.log(`[${key}]: ${row[key]}`);
            });
        }
        count++;
    })
    .on('end', () => {
        process.exit(0);
    });
