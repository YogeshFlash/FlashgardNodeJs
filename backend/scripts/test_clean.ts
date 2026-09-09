import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { MigrationService } from '../src/migration/migration.service';

async function main() {
  console.log('Bootstrapping NestJS application...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const migrationService = app.get(MigrationService);

  console.log('Calling cleanData("stock")...');
  try {
    const result = await migrationService.cleanData('stock');
    console.log('Clean stock data ran successfully! Result:', result);
  } catch (err: any) {
    console.error('Clean stock data failed with error:', err);
  } finally {
    await app.close();
  }
}

main().catch(console.error);
