import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seed() {
  console.log('\n🌱 Seeding database...\n');

  // 0. Ensure organization types exist
  const orgTypesData = [
    { name: 'parent', description: 'Parent organization Flashgard' },
    { name: 'Distributor', description: 'Distributor organization' },
    { name: 'Dealer', description: 'Dealer organization' },
    { name: 'Retailer', description: 'Retailer organization' },
    { name: 'Vendor', description: 'Vendor organization' },
  ];

  for (const type of orgTypesData) {
    await prisma.organizationType.upsert({
      where: { name: type.name },
      update: { description: type.description },
      create: type,
    });
  }

  // 1. Flashgard HQ organization
  let hq = await prisma.organization.findFirst({ where: { name: 'Flashgard HQ' } });
  if (!hq) {
    let internalOrgType = await prisma.organizationType.findUnique({ where: { name: 'parent' } });
    if (!internalOrgType) {
      internalOrgType = await prisma.organizationType.create({
        data: { name: 'parent', description: 'Parent organization Flashgard' },
      });
    }
    hq = await prisma.organization.create({
      data: { name: 'Flashgard HQ', organizationTypeId: internalOrgType.id, isActive: true },
    });
  }
  console.log('✅ Organization:', hq.name, `(id=${hq.id})`);

  // 2. System Roles
  const roleData = [
    { name: 'super_admin', description: 'Complete unrestricted system access', isSystemRole: true, isRestricted: true },
    { name: 'system_admin', description: 'Manage global settings and users', isSystemRole: true, isRestricted: true },
    { name: 'system_sales', description: 'Flashgard Sales team role', isSystemRole: true, isRestricted: true },
    { name: 'system_warehouse', description: 'Flashgard Warehouse role', isSystemRole: true, isRestricted: true },
    { name: 'system_reports', description: 'Reports analyst access', isSystemRole: true, isRestricted: true },
    { name: 'org_admin', description: 'Admin role for external orgs', isSystemRole: true, isRestricted: false },
    { name: 'org_sales', description: 'Sales role for external orgs', isSystemRole: true, isRestricted: false },
    { name: 'org_viewer', description: 'View-only role for external orgs', isSystemRole: true, isRestricted: false },
  ];

  for (const r of roleData) {
    const existing = await prisma.role.findFirst({ where: { name: r.name, organizationId: null } });
    if (existing) {
      await (prisma.role as any).update({
        where: { id: existing.id },
        data: { isRestricted: r.isRestricted, description: r.description },
      });
    } else {
      await (prisma.role as any).create({
        data: { ...r, organizationId: null },
      });
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
    { action: 'roles:system_access', description: 'Access and assign restricted system roles (system_*, super_*)' },
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
