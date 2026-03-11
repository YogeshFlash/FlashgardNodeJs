import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seed() {
  console.log('\n🌱 Seeding database...\n');

  // 1. Flashgard HQ organization
  let hq = await prisma.organization.findFirst({ where: { name: 'Flashgard HQ' } });
  if (!hq) {
    hq = await prisma.organization.create({
      data: { name: 'Flashgard HQ', type: 'internal', isActive: true },
    });
  }
  console.log('✅ Organization:', hq.name, `(id=${hq.id})`);

  // 2. System Roles
  const roleData = [
    { name: 'super_admin',        description: 'Complete unrestricted system access', isSystemRole: true },
    { name: 'internal_admin',     description: 'Manage global settings and users',    isSystemRole: true },
    { name: 'internal_sales',     description: 'Flashgard Sales team role',           isSystemRole: true },
    { name: 'internal_warehouse', description: 'Flashgard Warehouse role',            isSystemRole: true },
    { name: 'internal_reports',   description: 'Reports analyst access',              isSystemRole: true },
    { name: 'external_admin',     description: 'Admin role for external orgs',        isSystemRole: true },
    { name: 'external_sales',     description: 'Sales role for external orgs',        isSystemRole: true },
    { name: 'external_viewer',    description: 'View-only role for external orgs',    isSystemRole: true },
  ];

  for (const r of roleData) {
    const existing = await prisma.role.findFirst({ where: { name: r.name, isSystemRole: true } });
    if (!existing) {
      await prisma.role.create({ data: { ...r, organizationId: null } });
    }
  }
  const roles = await prisma.role.findMany({ where: { isSystemRole: true } });
  console.log(`✅ Roles: ${roles.length} system roles seeded`);

  // 2.5 Seed Permissions
  const permissionsData = [
    { action: 'organizations:read', description: 'View organizations' },
    { action: 'organizations:write', description: 'Create or edit organizations' },
    { action: 'organizations:delete', description: 'Delete organizations' },
    { action: 'users:read', description: 'View users' },
    { action: 'users:write', description: 'Create or edit users' },
    { action: 'users:delete', description: 'Delete users' },
    { action: 'roles:read', description: 'View roles and permissions' },
    { action: 'roles:write', description: 'Create or edit roles' },
    { action: 'roles:delete', description: 'Delete roles' },
    { action: 'contacts:read', description: 'View contacts' },
    { action: 'contacts:write', description: 'Create or edit contacts' },
    { action: 'contacts:delete', description: 'Delete contacts' },
    { action: 'addresses:read', description: 'View addresses' },
    { action: 'addresses:write', description: 'Create or edit addresses' },
    { action: 'addresses:delete', description: 'Delete addresses' },
    { action: 'audit:read', description: 'View system audit logs' },
  ];

  await prisma.permission.createMany({
    data: permissionsData,
    skipDuplicates: true,
  });
  const allPermissions = await prisma.permission.findMany();
  console.log(`✅ Permissions: ${allPermissions.length} permissions seeded`);

  // Assign ALL permissions to super_admin role
  const superAdminRole = await prisma.role.findFirst({ where: { name: 'super_admin' } });
  if (superAdminRole && allPermissions.length > 0) {
    await prisma.rolePermission.createMany({
      data: allPermissions.map(p => ({ roleId: superAdminRole.id, permissionId: p.id })),
      skipDuplicates: true,
    });
    console.log(`✅ Assigned all permissions to super_admin role`);
  }

  // 3. Super Admin User
  const passwordHash = await bcrypt.hash('Flashgard@2026', 10);

  const user = await prisma.user.upsert({
    where: { email: 'admin@flashgard.in' },
    // Ensure admin always has the expected org + role even if it already existed.
    update: {
      passwordHash,
      isSuperAdmin: true,
      isActive: true,
      organizationId: hq.id,
      roleId: superAdminRole?.id ?? null,
    },
    create: {
      email: 'admin@flashgard.in',
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      isSuperAdmin: true,
      isActive: true,
      organizationId: hq.id,
      roleId: superAdminRole?.id ?? null,
    },
  });
  console.log('✅ Super Admin:', user.email, `(id=${user.id})`);

  console.log('\n✅ Seeding complete!');
  console.log('\nLogin with:');
  console.log('  Email:    admin@flashgard.in');
  console.log('  Password: Flashgard@2026');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
