const fs = require('fs');

const stream = fs.createReadStream('D:/Projects/Flashgard2.0/Flashgard_2/Flashgard/backend/uploads/DatatoMigrate/ModelMaster.csv', { end: 50000 });
let data = Buffer.alloc(0);

stream.on('data', chunk => {
    data = Buffer.concat([data, chunk]);
});

stream.on('end', () => {
    const str = Buffer.from(data.filter(b => b !== 0)).toString('utf8');
    const lines = str.split('\n');
    for (let i = 0; i < 5; i++) {
        const line = lines[i];
        if (line) {
            console.log(`Line ${i} (Length: ${line.length}):`, line.substring(0, 100) + '...');
        }
    }
});
