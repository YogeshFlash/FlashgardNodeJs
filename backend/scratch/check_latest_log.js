const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLogs() {
    const log = await prisma.migrationLog.findFirst({
        orderBy: { createdAt: 'desc' }
    });

    if (!log) {
        console.log("No migration logs found.");
        return;
    }

    console.log(`Latest Migration Log: ${log.status} (Processed: ${log.recordsProcessed})`);
    
    if (log.logs && log.logs.failures) {
        const errorCounts = {};
        for (const failure of log.logs.failures) {
            errorCounts[failure.error] = (errorCounts[failure.error] || 0) + 1;
        }
        console.log("Error Breakdown:");
        for (const [error, count] of Object.entries(errorCounts)) {
            console.log(`- ${error}: ${count}`);
        }
    }
}

checkLogs().catch(console.error).finally(() => prisma.$disconnect());
