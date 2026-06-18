const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    console.log("=== MACHINE CUT LOGS ===");
    const cutLogs = await prisma.machineCutLog.findMany({
      take: 5,
      include: {
        license: true,
        modelCutFile: {
          include: {
            cutPattern: true
          }
        }
      }
    });
    console.dir(cutLogs, { depth: null });

    console.log("=== LICENSES ===");
    const licenses = await prisma.orgLicense.findMany({
      take: 5,
      where: {
        OR: [
          { machineId: { not: null } },
          { macAddress: { not: null } },
          { deviceHash: { not: null } }
        ]
      }
    });
    console.dir(licenses, { depth: null });

    console.log("=== QR CODES ===");
    const qrCodes = await prisma.qRCode.findMany({
      take: 5,
      include: {
        filmType: true
      }
    });
    console.dir(qrCodes, { depth: null });
}

check().catch(console.error).finally(() => prisma.$disconnect());
