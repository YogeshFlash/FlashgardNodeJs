const fs = require('fs');
const readline = require('readline');

const filePath = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/mobile/android/app/libs/DatatoMigrate/ModelMaster.csv';

const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    terminal: false
});

let found = false;
rl.on('line', (line) => {
    if (!found && line.includes('Back Skin Full') && line.includes(',10,')) {
        const cols = line.split(',');
        if (cols.length > 4) {
            console.log('Found Row!');
            console.log('Hex Length:', cols[4].length);
            found = true;
            rl.close();
        }
    }
});

rl.on('close', () => {
    if (!found) console.log('Not found');
    process.exit(0);
});
