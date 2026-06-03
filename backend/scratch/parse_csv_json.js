const fs = require('fs');
const { Transform } = require('stream');
const csv = require('csv-parser');

const encodingTransform = new Transform({
    transform(chunk, encoding, callback) {
        const sanitized = Buffer.from(chunk.filter(b => b !== 0));
        this.push(sanitized);
        callback();
    }
});

const inputStream = fs.createReadStream('D:/Projects/Flashgard2.0/Flashgard_2/Flashgard/backend/uploads/DatatoMigrate/ModelMaster.csv');
const csvStream = inputStream.pipe(encodingTransform).pipe(csv({ headers: false }));

let count = 0;
const results = [];
csvStream.on('data', (row) => {
    if (count < 3) {
        results.push({
            Col0: row[0],
            Col1: row[1],
            Col2: row[2],
            Col3: row[3],
            Col4_Len: row[4] ? row[4].length : 0,
            Col5: row[5]
        });
        count++;
    } else {
        console.log(JSON.stringify(results));
        process.exit(0);
    }
});
