import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { MigrationService } from '../src/migration/migration.service';
import { PrismaService } from '../src/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  const interval = setInterval(async () => {
    const orgsCount = await prisma.organization.count();
    const licCount = await (prisma as any).orgLicense.count();
    console.log(`Watching: orgs=${orgsCount}, licenses=${licCount}`);
  }, 1000);

  try {
    console.log('Cleaning existing migration data (cleanData("all"))...');
    await app.get(MigrationService).cleanData('all');

    const basePath = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database';
    const usersPath = path.join(basePath, 'AspNetUsers.csv');
    const rolesPath = path.join(basePath, 'AspNetUserRoles.csv');
    const licensesPath = path.join(basePath, 'LicenseMaster.csv');
    const dealersPath = path.join(basePath, 'LicenseAssignDealer.csv');

    const usersBuffer = fs.readFileSync(usersPath);
    const rolesBuffer = fs.readFileSync(rolesPath);
    const licensesBuffer = fs.readFileSync(licensesPath);
    const dealersBuffer = fs.readFileSync(dealersPath);

    const usersFile = { buffer: usersBuffer, originalname: 'AspNetUsers.csv' } as any;
    const userRolesFile = { buffer: rolesBuffer, originalname: 'AspNetUserRoles.csv' } as any;
    const licensesFile = { buffer: licensesBuffer, originalname: 'LicenseMaster.csv' } as any;
    const licenseDealersFile = { buffer: dealersBuffer, originalname: 'LicenseAssignDealer.csv' } as any;

    console.log('Running migrateUsers...');
    const userResult = await app.get(MigrationService).migrateUsers(usersFile, userRolesFile);
    console.log('User Migration completed! Result:', userResult);

    console.log('Running migrateLicenses...');
    const licenseResult = await app.get(MigrationService).migrateLicenses(licensesFile, licenseDealersFile);
    console.log('License Migration completed! Result:', licenseResult);

    const finalOrgs = await prisma.organization.count();
    const finalLics = await (prisma as any).orgLicense.count();
    console.log(`Final stats: orgs=${finalOrgs}, licenses=${finalLics}`);
  } catch (err: any) {
    console.error('Error during migration run:', err);
  } finally {
    clearInterval(interval);
    await app.close();
  }
}

main().catch(console.error);
