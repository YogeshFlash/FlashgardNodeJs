const fs = require('fs');
const modelFile = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/mobile/android/app/libs/DatatoMigrate/ModelMaster.csv';
const buffer = fs.readFileSync(modelFile);
console.log('First 100 bytes (Hex):', buffer.slice(0, 100).toString('hex'));
console.log('First 100 bytes (UTF8):', buffer.slice(0, 100).toString('utf8'));
