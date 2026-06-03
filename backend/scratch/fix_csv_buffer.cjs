const fs = require('fs');
const path = require('path');
const file = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/backend/src/migration/migration.service.ts';

let code = fs.readFileSync(file, 'utf8');

// 1. migrateUsers: userRolesData
code = code.replace(
    /const userRolesData = userRolesFile \? await this\.parseCsvBuffer\(\(userRolesFile as Express\.Multer\.File\)\.buffer\) : \[\];/g,
    "const userRolesData = userRolesFile ? (Array.isArray(userRolesFile) ? userRolesFile : await this.parseCsvBuffer((userRolesFile as Express.Multer.File).buffer)) : [];"
);

// 2. migrateLicenses: licensesData
code = code.replace(
    /const licensesData = await this\.parseCsvBuffer\(\(licensesFile as Express\.Multer\.File\)\.buffer\);/g,
    "const licensesData = Array.isArray(licensesFile) ? licensesFile : await this.parseCsvBuffer((licensesFile as Express.Multer.File).buffer);"
);

// 3. migrateLicenses: licenseDealersData
code = code.replace(
    /const licenseDealersData = licenseDealersFile \? await this\.parseCsvBuffer\(\(licenseDealersFile as Express\.Multer\.File\)\.buffer\) : \[\];/g,
    "const licenseDealersData = licenseDealersFile ? (Array.isArray(licenseDealersFile) ? licenseDealersFile : await this.parseCsvBuffer((licenseDealersFile as Express.Multer.File).buffer)) : [];"
);

// 4. migrateRoles: rolesData
code = code.replace(
    /const rolesData = await this\.parseCsvBuffer\(\(rolesFile as Express\.Multer\.File\)\.buffer\);/g,
    "const rolesData = Array.isArray(rolesFile) ? rolesFile : await this.parseCsvBuffer((rolesFile as Express.Multer.File).buffer);"
);

fs.writeFileSync(file, code);
console.log('Fixed parseCsvBuffer array handling.');
