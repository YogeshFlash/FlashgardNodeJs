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
csvStream.on('data', (row) => {
    if (count < 3) {
        console.log(`Row ${count}:`);
        console.log(`Col 0 (ID): ${row[0]}`);
        console.log(`Col 1 (Model): ${row[1]}`);
        console.log(`Col 2 (Skin): ${row[2]}`);
        console.log(`Col 3 (SkinID): ${row[3]}`);
        console.log(`Col 4 (Hex): [Length: ${row[4] ? row[4].length : 0}]`);
        console.log(`Col 5 (CatalogID): ${row[5]}`);
        console.log(`Col 6: ${row[6]}`);
        count++;
    } else {
        process.exit(0);
    }
});
