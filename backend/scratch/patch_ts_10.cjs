const fs = require('fs');
const path = require('path');
const file = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/backend/src/migration/migration.service.ts';

let code = fs.readFileSync(file, 'utf8');

// 1. Import BadRequestException
code = code.replace(
    "import { Injectable, Logger } from '@nestjs/common';",
    "import { Injectable, Logger, BadRequestException } from '@nestjs/common';"
);

// 2. Fix credentials.host -> credentials.server
code = code.replace(
    /server: credentials\.host,/g,
    "server: credentials.server || credentials.host,"
);

// 3. Throw BadRequestException in dbConnect
code = code.replace(
    "throw new Error('Database connection failed: ' + err.message);",
    "throw new BadRequestException('Database connection failed: ' + err.message);"
);

// 4. Throw BadRequestException in dbRun
code = code.replace(
    "throw new Error('Unsupported module type for DB migration: ' + moduleType);",
    "throw new BadRequestException('Unsupported module type for DB migration: ' + moduleType);"
);

fs.writeFileSync(file, code);
console.log('Backend patched!');
