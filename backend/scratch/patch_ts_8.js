const fs = require('fs');
const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/backend/src/migration/migration.service.ts';
let lines = fs.readFileSync(path, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
    const original = lines[i];
    
    // Fix signatures
    if (lines[i].includes('async migrateRoles(rolesFile: Express.Multer.File) {')) {
        lines[i] = lines[i].replace('async migrateRoles(rolesFile: Express.Multer.File) {', 'async migrateRoles(rolesFile: Express.Multer.File | any[], sourceName?: string) {');
    }
    else if (lines[i].includes('async migrateMobileUsers(mobileUsersFile: Express.Multer.File) {')) {
        lines[i] = lines[i].replace('async migrateMobileUsers(mobileUsersFile: Express.Multer.File) {', 'async migrateMobileUsers(mobileUsersFile: Express.Multer.File | any[], sourceName?: string) {');
    }
    else if (lines[i].includes('async migrateUsers(')) {
        if (lines[i+1] && lines[i+1].includes('usersFile?: Express.Multer.File,')) {
            lines[i+1] = lines[i+1].replace('usersFile?: Express.Multer.File,', 'usersFile?: Express.Multer.File | any[],');
            lines[i+2] = lines[i+2].replace('userRolesFile?: Express.Multer.File', 'userRolesFile?: Express.Multer.File | any[], sourceName?: string');
        }
    }
    
    // Fix parsed buffers
    if (lines[i].includes('this.parseUsersCsvRobustly(usersFile.buffer)')) {
        lines[i] = lines[i].replace('usersFile.buffer', '(usersFile as Express.Multer.File).buffer');
    }
    if (lines[i].includes('this.parseCsvBuffer(userRolesFile.buffer)')) {
        lines[i] = lines[i].replace('userRolesFile.buffer', '(userRolesFile as Express.Multer.File).buffer');
    }
    if (lines[i].includes('this.parseCsvBuffer(licensesFile.buffer)')) {
        lines[i] = lines[i].replace('licensesFile.buffer', '(licensesFile as Express.Multer.File).buffer');
    }
    if (lines[i].includes('this.parseCsvBuffer(licenseDealersFile.buffer)')) {
        lines[i] = lines[i].replace('licenseDealersFile.buffer', '(licenseDealersFile as Express.Multer.File).buffer');
    }
    if (lines[i].includes('this.parseCsvBuffer(mobileUsersFile.buffer)')) {
        lines[i] = lines[i].replace('mobileUsersFile.buffer', '(mobileUsersFile as Express.Multer.File).buffer');
    }
    if (lines[i].includes('this.parseCsvBuffer(rolesFile.buffer)')) {
        lines[i] = lines[i].replace('rolesFile.buffer', '(rolesFile as Express.Multer.File).buffer');
    }
    
    // Fix originalnames
    if (lines[i].includes('usersFile ? usersFile.originalname : \'\'')) {
        lines[i] = lines[i].replace('usersFile ? usersFile.originalname : \'\'', 'usersFile && !Array.isArray(usersFile) ? (usersFile as Express.Multer.File).originalname : \'\'');
    }
    if (lines[i].includes('userRolesFile ? userRolesFile.originalname : \'\'')) {
        lines[i] = lines[i].replace('userRolesFile ? userRolesFile.originalname : \'\'', 'userRolesFile && !Array.isArray(userRolesFile) ? (userRolesFile as Express.Multer.File).originalname : \'\'');
    }
    if (lines[i].includes('fileName: [licensesFile.originalname, licenseDealersFile?.originalname].filter(Boolean).join(\', \'),')) {
        lines[i] = '      fileName: sourceName || [!Array.isArray(licensesFile) ? (licensesFile as Express.Multer.File).originalname : \'\', licenseDealersFile && !Array.isArray(licenseDealersFile) ? (licenseDealersFile as Express.Multer.File).originalname : \'\'].filter(Boolean).join(\', \'),';
    }
    if (lines[i].includes('fileName: mobileUsersFile.originalname || \'Uploaded Mobile Users CSV File\',')) {
        lines[i] = '      fileName: sourceName || (!Array.isArray(mobileUsersFile) ? (mobileUsersFile as Express.Multer.File).originalname : \'Uploaded Mobile Users CSV File\'),';
    }
    if (lines[i].includes('fileName: rolesFile.originalname || \'Uploaded Roles CSV File\',')) {
        lines[i] = '      fileName: sourceName || (!Array.isArray(rolesFile) ? (rolesFile as Express.Multer.File).originalname : \'Uploaded Roles CSV File\'),';
    }
    
    if (original !== lines[i]) {
        console.log(`Replaced line ${i+1}:`);
        console.log(`  From: ${original}`);
        console.log(`  To:   ${lines[i]}`);
    }
}

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('Patch complete!');
