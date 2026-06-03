import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { MigrationService } from '../src/migration/migration.service';

async function main() {
  console.log('Bootstrapping NestJS application...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const migrationService = app.get(MigrationService);

  console.log('Calling cleanData("all")...');
  try {
    const result = await migrationService.cleanData('all');
    console.log('Clean data ran successfully! Result:', result);
  } catch (err: any) {
    console.error('Clean data failed with error:', err);
  } finally {
    await app.close();
  }
}

main().catch(console.error);
