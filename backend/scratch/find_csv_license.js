const fs = require('fs');

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

const csvPath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/LicenseMaster.csv';
const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split(/\r?\n/);

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  const parts = line.split(',');
  if (parts.length > 2) {
    const rawKey = parts[2].replace(/"/g, '').trim();
    const decoded = decodeHex(rawKey);
    if (decoded === 'YSMR94UOVOEZS2CR') {
      console.log(`Matched on line ${i}:`, line);
      console.log(`Decoded key:`, decoded);
      
      // Also print dealer assignments for LicenseID from parts[0]
      const licId = parts[0].replace(/"/g, '').trim();
      console.log(`LicenseID: ${licId}`);
      
      const dealerCsvPath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/LicenseAssignDealer.csv';
      if (fs.existsSync(dealerCsvPath)) {
        const dContent = fs.readFileSync(dealerCsvPath, 'utf8');
        const dLines = dContent.split(/\r?\n/);
        for (const dl of dLines) {
          if (dl.includes(licId)) {
            console.log(`  Assign Dealer row:`, dl);
          }
        }
      }
    }
  }
}
