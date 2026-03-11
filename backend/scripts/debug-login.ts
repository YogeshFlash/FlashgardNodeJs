import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'admin@flashgard.in';
  const password = process.argv[3] || 'Flashgard@2026';

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      isActive: true,
      isSuperAdmin: true,
      organizationId: true,
      roleId: true,
      passwordHash: true,
    },
  });

  if (!user) {
    console.log({ ok: false, reason: 'USER_NOT_FOUND', email });
    return;
  }

  const passwordHashLooksBcrypt = typeof user.passwordHash === 'string' && user.passwordHash.startsWith('$2');
  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  console.log({
    ok: user.isActive && passwordMatches,
    email: user.email,
    userId: user.id,
    isActive: user.isActive,
    passwordHashLooksBcrypt,
    passwordMatches,
    organizationId: user.organizationId,
    roleId: user.roleId,
    isSuperAdmin: user.isSuperAdmin,
  });
}

main()
  .catch((e) => {
    console.error('debug-login failed:', e?.message || e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
