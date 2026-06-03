import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { MigrationService } from '../src/migration/migration.service';
import { PrismaService } from '../src/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  
  const countBefore = await (prisma as any).orgLicense.count();
  console.log(`Count before: ${countBefore}`);

  // Let's run a query to watch the count in the database while we do a count check
  const interval = setInterval(async () => {
    const c = await (prisma as any).orgLicense.count();
    console.log(`Watching count: ${c}`);
  }, 1000);

  try {
    console.log('Cleaning data...');
    await prisma.orgLicense.deleteMany({});
    
    const basePath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database';
    const licensesPath = path.join(basePath, 'LicenseMaster.csv');
    const dealersPath = path.join(basePath, 'LicenseAssignDealer.csv');
    const licensesBuffer = fs.readFileSync(licensesPath);
    const dealersBuffer = fs.readFileSync(dealersPath);

    const licensesFile = { buffer: licensesBuffer, originalname: 'LicenseMaster.csv' } as any;
    const licenseDealersFile = { buffer: dealersBuffer, originalname: 'LicenseAssignDealer.csv' } as any;

    console.log('Migrating...');
    const res = await (app.get(MigrationService) as any).migrateLicenses(licensesFile, licenseDealersFile);
    console.log('Migration Result:', res);

    const countAfter = await (prisma as any).orgLicense.count();
    console.log(`Count after migration service finished: ${countAfter}`);
  } catch (e) {
    console.error(e);
  } finally {
    clearInterval(interval);
    await app.close();
  }
}

main().catch(console.error);
