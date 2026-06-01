import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Database Recovery Seed...');

  // 1. Seed Organization Types
  const orgTypes = [
    { name: 'parent', description: 'Parent organization' },
    { name: 'distributor', description: 'Product distributor' },
    { name: 'dealer', description: 'Authorized dealer' },
    { name: 'retailer', description: 'Local retailer' },
  ];

  for (const type of orgTypes) {
    const existing = await (prisma as any).organizationType.findUnique({ where: { name: type.name } });
    if (!existing) {
        await (prisma as any).organizationType.create({ data: type });
    }
  }
  
  const parentType = await (prisma as any).organizationType.findUnique({ where: { name: 'parent' } });
  if (!parentType) throw new Error('Parent type not found after seeding');

  // 2. Create Root Organization
  let flashgard = await (prisma as any).organization.findFirst({ where: { name: 'Flashgard' } });
  if (!flashgard) {
    flashgard = await (prisma as any).organization.create({
      data: {
        name: 'Flashgard',
        organizationTypeId: parentType.id,
      },
    });
  }

  // 3. Create Default Role
  let adminRole = await (prisma as any).role.findFirst({
    where: { 
      organizationId: flashgard.id,
      name: 'Super Admin'
    }
  });

  if (!adminRole) {
    adminRole = await (prisma as any).role.create({
      data: {
        name: 'Super Admin',
        description: 'Full system access',
        isSystemRole: true,
        organizationId: flashgard.id,
      },
    });
  }

  // 4. Create Super Admin User
  const email = 'admin@flashgard.com';
  const password = 'admin123';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  let admin = await (prisma as any).user.findUnique({ where: { email } });
  if (!admin) {
    admin = await (prisma as any).user.create({
      data: {
        email,
        passwordHash,
        firstName: 'System',
        lastName: 'Admin',
        isSuperAdmin: true,
        isActive: true,
        organizationId: flashgard.id,
        roleId: adminRole.id
      },
    });
  } else {
    await (prisma as any).user.update({
        where: { id: admin.id },
        data: { passwordHash, isSuperAdmin: true, organizationId: flashgard.id, roleId: adminRole.id }
    });
  }

  // 5. Link Admin to Flashgard Organization
  const link = await (prisma as any).userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId: admin.id,
        organizationId: flashgard.id,
      },
    },
  });

  if (!link) {
    await (prisma as any).userOrganization.create({
      data: {
        userId: admin.id,
        organizationId: flashgard.id,
        roleId: adminRole.id,
        isPrimary: true,
      },
    });
  } else {
    await (prisma as any).userOrganization.update({
        where: {
            userId_organizationId: {
                userId: admin.id,
                organizationId: flashgard.id,
            }
        },
        data: { roleId: adminRole.id }
    });
  }

  console.log('✅ Recovery Complete!');
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
