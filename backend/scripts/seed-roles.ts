import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting role and permission seeding...');

  // 1. Organization Types
  const orgTypes = [
    { name: 'internal', description: 'Internal parent organization Flashgard' },
    { name: 'distributor', description: 'Product distributor' },
    { name: 'dealer', description: 'Authorized dealer' },
    { name: 'retailer', description: 'Local retailer' },
    { name: 'supplier', description: 'Raw material or component supplier' },
  ];

  for (const type of orgTypes) {
    await prisma.organizationType.upsert({
      where: { name: type.name },
      update: { description: type.description },
      create: type,
    });
  }
  console.log('✅ Organization types seeded.');

  // 2. Permissions
  const permissions = [
    // Organizations
    { action: 'organizations:read', description: 'View organizations' },
    { action: 'organizations:write', description: 'Create or edit organizations' },
    { action: 'organizations:delete', description: 'Delete organizations' },
    // Organization Types
    { action: 'organization_types:read', description: 'View organization types' },
    { action: 'organization_types:write', description: 'Create or edit organization types' },
    { action: 'organization_types:delete', description: 'Delete organization types' },
    // Users
    { action: 'users:read', description: 'View users' },
    { action: 'users:write', description: 'Create or edit users' },
    { action: 'users:delete', description: 'Delete users' },
    // Roles
    { action: 'roles:read', description: 'View roles' },
    { action: 'roles:write', description: 'Create or edit roles' },
    { action: 'roles:delete', description: 'Delete roles' },
    // Models
    { action: 'models:read', description: 'View models' },
    { action: 'models:write', description: 'Create or edit models' },
    { action: 'models:delete', description: 'Delete models' },
    // Brands
    { action: 'brands:read', description: 'View brands' },
    { action: 'brands:write', description: 'Create or edit brands' },
    { action: 'brands:delete', description: 'Delete brands' },
    // Device Types
    { action: 'device_types:read', description: 'View device types' },
    { action: 'device_types:write', description: 'Create or edit device types' },
    { action: 'device_types:delete', description: 'Delete device types' },
    // Cuts
    { action: 'cuts:read', description: 'View cut history' },
    { action: 'cuts:perform', description: 'Perform technical cuts' },
    // Sales
    { action: 'sales:read', description: 'View sales data' },
    { action: 'sales:write', description: 'Record sales' },
    // Audit
    { action: 'audit:read', description: 'View system audit logs' },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { action: p.action },
      update: { description: p.description },
      create: p,
    });
  }
  console.log('✅ Permissions seeded.');

  // Helper to get permission IDs
  const getPermIds = async (actions: string[]) => {
    const perms = await prisma.permission.findMany({
      where: { action: { in: actions } },
    });
    return perms.map((p) => p.id);
  };

  const allPerms = await prisma.permission.findMany();
  const allPermIds = allPerms.map((p) => p.id);

  // 3. Roles
  const roles = [
    {
      name: 'Platform Admin',
      description: 'Full unrestricted system access across all organizations',
      isSystemRole: true,
      isRestricted: true,
      permissions: allPermIds,
    },
    {
      name: 'Catalog Manager',
      description: 'Manage internal settings, units, and global catalog',
      isSystemRole: true,
      isRestricted: true,
      permissions: await getPermIds([
        'organizations:read', 'organizations:write',
        'users:read', 'users:write',
        'roles:read', 'roles:write',
        'models:read', 'models:write',
        'brands:read', 'brands:write',
        'device_types:read', 'device_types:write',
        'audit:read', 'cuts:read'
      ]),
    },
    {
      name: 'Distributor Admin',
      description: 'Manage branches and view nested sales data',
      isSystemRole: true,
      isRestricted: false,
      permissions: await getPermIds([
        'organizations:read',
        'users:read', 'users:write',
        'roles:read',
        'models:read',
        'brands:read',
        'device_types:read',
        'sales:read',
        'cuts:read'
      ]),
    },
    {
      name: 'Dealer Admin',
      description: 'Manage shop floor and perform cuts',
      isSystemRole: true,
      isRestricted: false,
      permissions: await getPermIds([
        'users:read', 'users:write',
        'models:read',
        'brands:read',
        'organization_types:read', 'organization_types:write',
        'device_types:read',
        'cuts:perform',
        'sales:read', 'sales:write'
      ]),
    },
    {
      name: 'Operator',
      description: 'Day-to-day functional operations (cutting)',
      isSystemRole: true,
      isRestricted: false,
      permissions: await getPermIds([
        'models:read',
        'cuts:perform',
        'sales:write'
      ]),
    },
  ];

  for (const r of roles) {
    let role = await prisma.role.findFirst({
      where: { organizationId: null, name: r.name },
    });

    if (role) {
      role = await prisma.role.update({
        where: { id: role.id },
        data: {
          description: r.description,
          isRestricted: r.isRestricted,
          isSystemRole: r.isSystemRole,
        },
      });
    } else {
      role = await (prisma.role as any).create({
        data: {
          name: r.name,
          description: r.description,
          isSystemRole: r.isSystemRole,
          isRestricted: r.isRestricted,
          organizationId: null,
        },
      });
    }
 
    if (!role) {
      throw new Error(`Failed to create or find role: ${r.name}`);
    }

    // Clear existing perms and re-assign
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: r.permissions.map((pId) => ({ roleId: role.id, permissionId: pId })),
    });
  }

  console.log('✅ Roles and Role-Permission mapping seeded.');
  console.log('🚀 Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ SEED ERROR:', e);
    if (e.code) console.error('Error Code:', e.code);
    if (e.meta) console.error('Error Meta:', e.meta);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
