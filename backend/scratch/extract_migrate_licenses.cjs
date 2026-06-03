const fs = require('fs');

const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/backend/src/migration/migration.service.ts';
let code = fs.readFileSync(path, 'utf8');

const startStr = '  async migrateLicenses(licensesFile: Express.Multer.File | any[], licenseDealersFile?: Express.Multer.File | any[], sourceName?: string) {';
const endStr = '    return result;\n  }';

const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr, startIdx) + endStr.length;

const methodCode = code.substring(startIdx, endIdx);
fs.writeFileSync('d:/Projects/Flashgard2.0/Flashgard_2/Flashgard/backend/scratch/migrateLicenses.ts', methodCode);
console.log('Extracted to scratch/migrateLicenses.ts');
