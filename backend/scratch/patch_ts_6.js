const fs = require('fs');
const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/backend/src/migration/migration.service.ts';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// Fix buffer accesses
for (let i = 0; i < lines.length; i++) {
    // lines[i] is 0-indexed, so line number is i + 1
    if (lines[i].includes('this.parseCsvBuffer(licensesFile.buffer)')) {
        lines[i] = lines[i].replace('licensesFile.buffer', '(licensesFile as Express.Multer.File).buffer');
    }
    if (lines[i].includes('this.parseCsvBuffer(licenseDealersFile.buffer)')) {
        lines[i] = lines[i].replace('licenseDealersFile.buffer', '(licenseDealersFile as Express.Multer.File).buffer');
    }
    if (lines[i].includes('licensesFile.originalname')) {
        lines[i] = lines[i].replace('licensesFile.originalname', '(licensesFile as Express.Multer.File).originalname');
    }
    if (lines[i].includes('licenseDealersFile?.originalname')) {
        lines[i] = lines[i].replace('licenseDealersFile?.originalname', '(licenseDealersFile as Express.Multer.File)?.originalname');
    }
    if (lines[i].includes('async migrateRoles(file: Express.Multer.File) {')) {
        lines[i] = lines[i].replace('async migrateRoles(file: Express.Multer.File) {', 'async migrateRoles(file: Express.Multer.File | any[], sourceName?: string) {');
    }
    if (lines[i].includes('async migrateMobileUsers(file: Express.Multer.File) {')) {
        lines[i] = lines[i].replace('async migrateMobileUsers(file: Express.Multer.File) {', 'async migrateMobileUsers(file: Express.Multer.File | any[], sourceName?: string) {');
    }
    if (lines[i].includes('async migrateUsers(')) {
        if (lines[i+1] && lines[i+1].includes('usersFile?: Express.Multer.File,')) {
            lines[i+1] = lines[i+1].replace('usersFile?: Express.Multer.File,', 'usersFile?: Express.Multer.File | any[],');
            lines[i+2] = lines[i+2].replace('userRolesFile?: Express.Multer.File', 'userRolesFile?: Express.Multer.File | any[], sourceName?: string');
        }
    }
    if (lines[i].includes('this.parseUsersCsvRobustly(usersFile.buffer)')) {
        lines[i] = lines[i].replace('this.parseUsersCsvRobustly(usersFile.buffer)', 'this.parseUsersCsvRobustly((usersFile as Express.Multer.File).buffer)');
    }
    if (lines[i].includes('this.parseCsvBuffer(userRolesFile.buffer)')) {
        lines[i] = lines[i].replace('this.parseCsvBuffer(userRolesFile.buffer)', 'this.parseCsvBuffer((userRolesFile as Express.Multer.File).buffer)');
    }
    if (lines[i].includes('usersFile ? usersFile.originalname : \'\'')) {
        lines[i] = lines[i].replace('usersFile ? usersFile.originalname : \'\'', 'usersFile ? (usersFile as Express.Multer.File).originalname : \'\'');
    }
    if (lines[i].includes('userRolesFile ? userRolesFile.originalname : \'\'')) {
        lines[i] = lines[i].replace('userRolesFile ? userRolesFile.originalname : \'\'', 'userRolesFile ? (userRolesFile as Express.Multer.File).originalname : \'\'');
    }
    
    // Check dbRun calls for signatures
    if (lines[i].includes('return await this.migrateRoles(rows, "MSSQL: " + tableMap.file1);')) {
        // already fixed earlier
    }
}

// Ensure the dbRun migrateRoles and migrateMobileUsers calls are using sourceName 
// Oh wait, `patch_ts_3.js` was breaking earlier because I missed replacing `Readable.from(file.buffer)`!
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Readable.from(file.buffer)')) {
        lines[i] = lines[i].replace('Readable.from(file.buffer)', 'Readable.from((file as Express.Multer.File).buffer)');
    }
}

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('Line-based patch complete!');
