import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { MigrationService } from '../src/migration/migration.service';
import { PrismaService } from '../src/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { decryptLicenseKey } from '../src/utils/encryption';

async function main() {
  console.log('Bootstrapping NestJS application...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const migrationService = app.get(MigrationService);
  const prisma = app.get(PrismaService);

  try {
    console.log('Cleaning existing migration data (cleanData("all"))...');
    await migrationService.cleanData('all');

    const basePath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database';
    const usersPath = path.join(basePath, 'AspNetUsers.csv');
    const rolesPath = path.join(basePath, 'AspNetUserRoles.csv');
    const licensesPath = path.join(basePath, 'LicenseMaster.csv');
    const dealersPath = path.join(basePath, 'LicenseAssignDealer.csv');

    console.log('Loading CSV files from disk...');
    const usersBuffer = fs.readFileSync(usersPath);
    const rolesBuffer = fs.readFileSync(rolesPath);
    const licensesBuffer = fs.readFileSync(licensesPath);
    const dealersBuffer = fs.readFileSync(dealersPath);

    const usersFile = { buffer: usersBuffer, originalname: 'AspNetUsers.csv' } as any;
    const userRolesFile = { buffer: rolesBuffer, originalname: 'AspNetUserRoles.csv' } as any;
    const licensesFile = { buffer: licensesBuffer, originalname: 'LicenseMaster.csv' } as any;
    const licenseDealersFile = { buffer: dealersBuffer, originalname: 'LicenseAssignDealer.csv' } as any;

    console.log('Running migrateUsers...');
    const userResult = await migrationService.migrateUsers(usersFile, userRolesFile);
    console.log('User Migration completed! Result:', userResult);

    console.log('Running migrateLicenses...');
    const licenseResult = await migrationService.migrateLicenses(licensesFile, licenseDealersFile);
    console.log('License Migration completed! Result:', licenseResult);

    console.log('\n--- VERIFYING DISCREPANCIES ---');
    const targets = [
      { key: 'BRSS27COI2614844', expected: '3390 - QUEEN MOBILES' },
      { key: '5P0COIXEW9WHQR8W', expected: '3390 - KARUR PARADISE' }
    ];

    // Read all org licenses
    const orgLicenses = await (prisma as any).orgLicense.findMany({
      include: { owner: true }
    });

    console.log(`Found ${orgLicenses.length} org licenses in database.`);

    for (const target of targets) {
      // Since license keys are stored encrypted, we decrypt them for comparison
      const match = orgLicenses.find((ol: any) => {
        try {
          const dec = decryptLicenseKey(ol.key);
          return dec === target.key;
        } catch {
          return false;
        }
      });

      console.log(`\nLicense Key: ${target.key}`);
      if (match) {
        console.log(`  Actual Owner Org: ${match.owner?.name} (ID: ${match.owner?.id})`);
        console.log(`  Expected Owner Org: ${target.expected}`);
        if (match.owner?.name === target.expected) {
          console.log('  Verification: SUCCESS');
        } else {
          console.log('  Verification: FAILED');
        }
      } else {
        console.log('  License NOT found in DB!');
      }
    }
  } catch (err: any) {
    console.error('Error during migration run:', err);
  } finally {
    await app.close();
  }
}

main().catch(console.error);
