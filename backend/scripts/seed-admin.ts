import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding super admin and base entities...');
  const hash = await bcrypt.hash('admin123', 10);
  
  // Ensure 'parent' org type exists (might be added by seed_org_types.ts)
  let orgType = await prisma.organizationType.findFirst({ where: { name: 'parent' } });
  if (!orgType) {
     orgType = await prisma.organizationType.create({ data: { name: 'parent', description: 'Internal' } });
  }

  // Create Flashgard Org
  const org = await prisma.organization.create({
    data: {
      name: 'Flashgard Internal',
      organizationTypeId: orgType.id,
    }
  });

  // Create Super Admin Role
  const role = await prisma.role.create({
    data: {
      name: 'Super Admin',
      description: 'System-wide access',
      isSystemRole: true,
      organizationId: org.id
    }
  });

  // Create User
  const user = await prisma.user.create({
    data: {
      email: 'admin@flashgard.in',
      passwordHash: hash,
      firstName: 'Super',
      lastName: 'Admin',
      isSuperAdmin: true,
      // Legacy fields
      organizationId: org.id,
      roleId: role.id,
      // New Junction
      organizations: {
        create: {
          organizationId: org.id,
          roleId: role.id,
          isPrimary: true
        }
      }
    }
  });

  console.log('Super admin seeded:', user.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
