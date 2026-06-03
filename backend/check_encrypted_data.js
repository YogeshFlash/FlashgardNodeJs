const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const latestFile = await prisma.modelCutFile.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        model: true,
        cutType: true,
      }
    });

    if (!latestFile) {
      console.log('No files found in database.');
      return;
    }

    console.log('--- Latest Uploaded File ---');
    console.log('ID:', latestFile.id);
    console.log('Model:', latestFile.model.name);
    console.log('Cut Type:', latestFile.cutType.name);
    console.log('Created At:', latestFile.createdAt);
    
    const data = latestFile.encryptedPltData;
    console.log('\n--- Encrypted Data (First 100 bytes) ---');
    console.log('Length:', data.length, 'bytes');
    console.log('Hex View:', data.slice(0, 100).toString('hex'));
    console.log('Base64 View:', data.slice(0, 100).toString('base64'));
    
    // Check if it looks like raw HPGL (it shouldn't if encrypted)
    const rawString = data.toString('utf-8');
    const isRaw = rawString.includes('IN;') || rawString.includes('PA;');
    console.log('\nIs raw HPGL visible?:', isRaw ? 'YES (UNSAFE!)' : 'NO (ENCRYPTED)');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
