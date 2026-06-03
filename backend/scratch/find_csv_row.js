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

const csvPath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/LicenseMaster.csv';
const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split('\n');
const headers = parseCSVLine(lines[0]).map(h => h.trim());

console.log('Headers:', headers);

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  const values = parseCSVLine(line);
  const row = {};
  headers.forEach((h, idx) => {
    row[h] = values[idx] ? values[idx].trim() : '';
  });
  
  const keyHex = row.LicenseKey || '';
  const decoded = Buffer.from(keyHex, 'hex').toString('utf8');
  if (decoded === 'YSMR94UOVOEZS2CR') {
    console.log('FOUND ROW in LicenseMaster:', row);
    console.log('Decoded LicenseKey:', decoded);
    
    // Also look up in LicenseAssignDealer.csv
    const dealerCsvPath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/LicenseAssignDealer.csv';
    const dContent = fs.readFileSync(dealerCsvPath, 'utf8');
    const dLines = dContent.split('\n');
    const dHeaders = parseCSVLine(dLines[0]).map(h => h.trim());
    console.log('Dealer CSV Headers:', dHeaders);
    
    for (let j = 1; j < dLines.length; j++) {
      const dLine = dLines[j];
      if (!dLine.trim()) continue;
      const dValues = parseCSVLine(dLine);
      const dRow = {};
      dHeaders.forEach((dh, idx) => {
        dRow[dh] = dValues[idx] ? dValues[idx].trim() : '';
      });
      if (dRow.LicenseID === row.LicenseID) {
        console.log('FOUND ASSIGNMENT in LicenseAssignDealer:', dRow);
      }
    }
  }
}
