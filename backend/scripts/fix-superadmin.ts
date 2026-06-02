import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSuperAdmin() {
  const email = 'admin@flashgard.in';
  const password = 'Flashgard@2026';
  const passwordHash = await bcrypt.hash(password, 10);

  console.log('\n🔐 Generated hash for', email);

  // Find the root organization
  let hq = await prisma.organization.findFirst({
    where: { name: { in: ['Flashgard', 'Flashgard HQ', 'Flashgard Internal'] } }
  });
  if (!hq) {
    hq = await prisma.organization.findFirst({
      where: { name: { contains: 'Flashgard', mode: 'insensitive' } }
    });
  }
  if (!hq) {
    const parentType = await prisma.organizationType.findFirst({ where: { name: 'parent' } });
    hq = await prisma.organization.create({
      data: {
        name: 'Flashgard',
        organizationTypeId: parentType?.id || '',
      }
    });
  }

  // Find System Admin or Super Admin role
  const superAdminRole = await prisma.role.findFirst({
    where: {
      name: { in: ['System Admin', 'Super Admin', 'super_admin'] }
    }
  });

  if (!superAdminRole) {
    console.error('❌ System Admin role not found in database!');
    return;
  }

  // Upsert the super admin user
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      isSuperAdmin: true,
      isActive: true,
      firstName: 'System',
      lastName: 'Administrator',
      organizationId: hq.id,
      roleId: superAdminRole.id,
    },
    create: {
      email,
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      isSuperAdmin: true,
      isActive: true,
      organizationId: hq.id,
      roleId: superAdminRole.id,
    },
  });

  // Ensure UserOrganization junction link
  const link = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: hq.id
      }
    }
  });

  if (!link) {
    await prisma.userOrganization.create({
      data: {
        userId: user.id,
        organizationId: hq.id,
        roleId: superAdminRole.id,
        isPrimary: true
      }
    });
  } else {
    await prisma.userOrganization.update({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: hq.id
        }
      },
      data: {
        roleId: superAdminRole.id,
        isPrimary: true
      }
    });
  }

  console.log('\n✅ Super admin user ready:');
  console.log('  ID:', user.id);
  console.log('  Email:', user.email);
  console.log('  isSuperAdmin:', user.isSuperAdmin);
  console.log('  isActive:', user.isActive);
  console.log('  Organization:', hq.name);
  console.log('  Role:', superAdminRole.name);
  console.log('\nYou can now login with:');
  console.log('  Email:    admin@flashgard.in');
  console.log('  Password: Flashgard@2026');
}

fixSuperAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
