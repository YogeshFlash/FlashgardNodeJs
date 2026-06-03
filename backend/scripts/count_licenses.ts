import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { decryptLicenseKey } from '../src/utils/encryption';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  const count = await (prisma as any).orgLicense.count();
  console.log(`Total count of org licenses in DB: ${count}`);

  const sample = await (prisma as any).orgLicense.findMany({
    take: 5,
    include: { owner: true }
  });
  console.log('Sample licenses:');
  sample.forEach((l: any) => {
    let key = 'failed to decrypt';
    try { key = decryptLicenseKey(l.key); } catch {}
    console.log(`- ID: ${l.id}, Key: ${key}, Owner: ${l.owner?.name} (${l.owner?.id}) [legacyId: ${l.owner?.legacyId}]`);
  });

  await app.close();
}

main().catch(console.error);
