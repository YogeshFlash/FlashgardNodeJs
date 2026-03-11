import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSuperAdmin() {
  const email = 'admin@flashgard.in';
  const password = 'Flashgard@2026';
  const passwordHash = await bcrypt.hash(password, 10);

  console.log('\n🔐 Generated hash for', email);
  console.log('Hash:', passwordHash);

  const hq = await prisma.organization.findFirst({ where: { name: 'Flashgard HQ' } });
  const superAdminRole = await prisma.role.findFirst({ where: { name: 'super_admin' } });

  // Upsert the super admin user
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      isSuperAdmin: true,
      isActive: true,
      firstName: 'System',
      lastName: 'Administrator',
      organizationId: hq?.id ?? null,
      roleId: superAdminRole?.id ?? null,
    },
    create: {
      email,
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      isSuperAdmin: true,
      isActive: true,
      organizationId: hq?.id ?? null,
      roleId: superAdminRole?.id ?? null,
    },
  });

  console.log('\n✅ Super admin user ready:');
  console.log('  ID:', user.id);
  console.log('  Email:', user.email);
  console.log('  isSuperAdmin:', user.isSuperAdmin);
  console.log('  isActive:', user.isActive);
  console.log('\nYou can now login with:');
  console.log('  Email:    admin@flashgard.in');
  console.log('  Password: Flashgard@2026');
}

fixSuperAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
