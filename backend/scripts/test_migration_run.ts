import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { MigrationService } from '../src/migration/migration.service';

async function main() {
  console.log('Bootstrapping NestJS application...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const migrationService = app.get(MigrationService);

  console.log('Calling migrateUsers with undefined arguments (empty files)...');
  try {
    const result = await migrationService.migrateUsers();
    console.log('Migration ran successfully! Result:', result);
  } catch (err: any) {
    console.error('Migration failed with error:', err);
  } finally {
    await app.close();
  }
}

main().catch(console.error);
