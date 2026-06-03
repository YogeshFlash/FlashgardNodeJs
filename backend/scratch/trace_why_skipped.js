const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

function parseCSV(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    const headers = parseCSVLine(lines[0]).map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const obj = {};
        headers.forEach((h, i) => { obj[h] = values[i] ? values[i].trim() : null; });
        return obj;
    });
}

function parseBit(val) {
    if (val === '1' || val === 1 || val === 'true' || val === true || val === 'True') return true;
    return false;
}

async function main() {
  const usersPath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/AspNetUsers.csv';
  const csvUsers = parseCSV(usersPath);
  
  let noEmailCount = 0;
  let isDeleteCount = 0;
  let inactiveCount = 0;
  let otherReasons = [];

  const processedEmails = new Set();
  const duplicateEmails = [];

  for (const row of csvUsers) {
    const email = (row.Email || '').trim().toLowerCase();
    const id = row.Id;
    const isDeleted = parseBit(row.IsDelete);
    const isActive = parseBit(row.IsActive);

    if (!email) {
      noEmailCount++;
      continue;
    }

    if (processedEmails.has(email)) {
      duplicateEmails.push({ id, email });
      continue;
    }
    processedEmails.add(email);

    if (isDeleted) {
      isDeleteCount++;
      continue;
    }

    if (!isActive) {
      inactiveCount++;
      continue;
    }
  }

  console.log(`Total rows in CSV: ${csvUsers.length}`);
  console.log(`- Empty email: ${noEmailCount}`);
  console.log(`- Duplicate email: ${duplicateEmails.length}`);
  console.log(`- IsDelete = true: ${isDeleteCount}`);
  console.log(`- IsActive = false (but IsDelete = false): ${inactiveCount}`);
  console.log(`Total filtered out by simple rules: ${noEmailCount + duplicateEmails.length + isDeleteCount + inactiveCount}`);
  console.log(`Remaining to import: ${csvUsers.length - (noEmailCount + duplicateEmails.length + isDeleteCount + inactiveCount)}`);
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
