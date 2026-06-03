const fs = require('fs');

const stream = fs.createReadStream('D:/Projects/Flashgard2.0/Flashgard_2/Flashgard/backend/uploads/DatatoMigrate/ModelMaster.csv', { end: 10000 });
let data = Buffer.alloc(0);

stream.on('data', chunk => {
    data = Buffer.concat([data, chunk]);
});

stream.on('end', () => {
    const str = Buffer.from(data.filter(b => b !== 0)).toString('utf8');
    const firstLine = str.split('\n')[0];
    console.log('Commas:', (firstLine.match(/,/g) || []).length);
    console.log('Tabs:', (firstLine.match(/\t/g) || []).length);
    console.log('Semicolons:', (firstLine.match(/;/g) || []).length);
    console.log('Pipes:', (firstLine.match(/\|/g) || []).length);
});
