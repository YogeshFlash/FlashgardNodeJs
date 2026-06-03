const fs = require('fs');

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

function decodeHex(input) {
  if (!input) return input;
  let current = input.trim();
  
  for (let i = 0; i < 2; i++) {
    if (/^[0-9a-fA-F]+$/.test(current) && current.length % 2 === 0) {
      try {
        const decodedUtf16 = Buffer.from(current, 'hex').toString('utf16le');
        const isPrintableUtf16 = /^[\x20-\x7E]*$/.test(decodedUtf16);
        if (isPrintableUtf16 && decodedUtf16.length > 0) {
          current = decodedUtf16;
          continue;
        }

        const decodedAscii = Buffer.from(current, 'hex').toString('utf8');
        const isPrintableAscii = /^[\x20-\x7E]*$/.test(decodedAscii);
        if (isPrintableAscii && decodedAscii.length > 0) {
          current = decodedAscii;
          continue;
        }
      } catch (e) {}
    }
    break;
  }
  return current;
}

const masterPath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/LicenseMaster.csv';
const dealerPath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/LicenseAssignDealer.csv';

const licContent = fs.readFileSync(masterPath, 'utf8');
const licLines = licContent.split(/\r?\n/);

const targetKeys = ['BRSS27COI2614844', '5P0COIXEW9WHQR8W'];

for (let i = 1; i < licLines.length; i++) {
  const line = licLines[i];
  if (!line.trim()) continue;
  const parts = line.split(',');
  if (parts.length > 2) {
    const rawKey = parts[2].replace(/"/g, '').trim();
    const decoded = decodeHex(rawKey);
    if (targetKeys.includes(decoded)) {
      console.log(`License Row in LicenseMaster.csv:`, line);
      console.log(`  Decoded key:`, decoded);
      
      const licId = parts[0].replace(/"/g, '').trim();
      console.log(`  LicenseID: ${licId}`);
      
      const dContent = fs.readFileSync(dealerPath, 'utf8');
      const dLines = dContent.split(/\r?\n/);
      for (const dl of dLines) {
        if (dl.startsWith(`${licId},`) || dl.includes(`,${licId},`)) {
          console.log(`  Assign Dealer row:`, dl);
        }
      }
    }
  }
}
