
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const transfers = await prisma.licensingTransfer.findMany({
    include: {
      fromOrg: { select: { name: true } },
      toOrg: { select: { name: true } },
      items: true
    }
  });
  console.log(JSON.stringify(transfers, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
