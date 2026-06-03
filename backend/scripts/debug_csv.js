const fs = require('fs');
const path = require('path');

function parseCSVLine(line) {
    const result = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            result.push(cur);
            cur = '';
        } else {
            cur += char;
        }
    }
    result.push(cur);
    return result;
}

const modelFile = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/mobile/android/app/libs/DatatoMigrate/ModelMaster.csv';
const lines = fs.readFileSync(modelFile, 'utf8').split('\n');

console.log('Headers:', parseCSVLine(lines[0]));
console.log('Row 1 Length:', parseCSVLine(lines[1]).length);
console.log('Row 1 Start:', parseCSVLine(lines[1]).slice(0, 6));
console.log('Row 1 Instruction Length:', parseCSVLine(lines[1])[4].length);
