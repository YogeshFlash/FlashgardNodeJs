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

async function main() {
  const usersPath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/AspNetUsers.csv';
  console.log('Loading AspNetUsers.csv...');
  const csvUsers = parseCSV(usersPath);
  console.log(`Total users in CSV: ${csvUsers.length}`);

  console.log('Loading all users from database...');
  const dbUsers = await prisma.user.findMany({
    select: { id: true, email: true }
  });
  console.log(`Total users in DB: ${dbUsers.length}`);

  const dbUserIds = new Set(dbUsers.map(u => u.id.toLowerCase()));
  const dbEmails = new Set(dbUsers.map(u => u.email.toLowerCase()));

  const missingUsers = [];
  for (const csvUser of csvUsers) {
    const id = (csvUser.Id || '').toLowerCase();
    const email = (csvUser.Email || '').toLowerCase();
    if (!dbUserIds.has(id) && !dbEmails.has(email)) {
      missingUsers.push(csvUser);
    }
  }

  console.log(`Total missing users: ${missingUsers.length}`);
  console.log('Sample missing users (first 10):');
  missingUsers.slice(0, 10).forEach(mu => {
    console.log(`- Id: ${mu.Id}, Email: ${mu.Email}, UserName: ${mu.UserName}, IsActive: ${mu.IsActive}, IsDelete: ${mu.IsDelete}`);
  });
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
