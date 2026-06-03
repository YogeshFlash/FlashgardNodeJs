const fs = require('fs');

function checkQuotes(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  console.log(`Checking ${filePath}...`);
  let oddCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let qCount = 0;
    for (let j = 0; j < line.length; j++) {
      if (line[j] === '"') qCount++;
    }
    if (qCount % 2 !== 0) {
      oddCount++;
      if (oddCount <= 5) {
        console.log(`Line ${i + 1} has odd quotes (${qCount}): ${line.substring(0, 120)}...`);
      }
    }
  }
  console.log(`Total lines with odd quotes: ${oddCount} / ${lines.length}`);
}

checkQuotes('d:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/LicenseMaster.csv');
checkQuotes('d:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/LicenseAssignDealer.csv');
