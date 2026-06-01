import { PrismaClient, DataScope } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding default permissions and roles...');

  const permissionActions = [
    // Identity & Access
    { action: 'orgs:read', description: 'View organizations' },
    { action: 'orgs:write', description: 'Create/Edit organizations' },
    { action: 'users:read', description: 'View users' },
    { action: 'users:write', description: 'Manage users' },
    { action: 'roles:read', description: 'View roles' },
    { action: 'roles:write', description: 'Manage roles' },
    { action: 'audit_logs:read', description: 'View audit logs' },

    // Catalog (CAD/Models)
    { action: 'catalog:read', description: 'View brands and models' },
    { action: 'catalog:write', description: 'Manage brands and models' },
    { action: 'designs:read', description: 'Access PLT/Design files' },
    { action: 'designs:write', description: 'Upload/Modify design files' },

    // Inventory (Film)
    { action: 'inventory:read', description: 'View stock and batches' },
    { action: 'inventory:write', description: 'Manage film inventory' },
    { action: 'inward:read', description: 'View inward receipts' },
    { action: 'inward:write', description: 'Create inward receipts' },

    // Production & Logistics
    { action: 'production:read', description: 'View work orders' },
    { action: 'production:write', description: 'Manage production' },
    { action: 'dispatch:read', description: 'View dispatch orders' },
    { action: 'dispatch:write', description: 'Manage shipping/dispatch' },
    { action: 'qr:read', description: 'View QR codes' },
    { action: 'qr:write', description: 'Generate/Audit QR codes' },

    // Licensing (Handshake Flow)
    { action: 'licenses:read', description: 'View org licenses' },
    { action: 'licenses:write', description: 'Issue/Dispatch licenses' },
    { action: 'credits:read', description: 'View machine credits' },
    { action: 'credits:write', description: 'Issue/Dispatch credits' },
    
    // Analytics
    { action: 'reports:read', description: 'View system reports' },
  ];

  const permissions: any = {};
  for (const p of permissionActions) {
    permissions[p.action] = await prisma.permission.upsert({
      where: { action: p.action },
      update: { description: p.description },
      create: p,
    });
  }

  const defaultRoles = [
    {
      name: 'System Admin',
      description: 'System-wide administrator with total control',
      isSystemRole: true,
      rolePermissions: Object.values(permissions).map((p: any) => ({
        permissionId: p.id,
        dataScope: DataScope.all,
      })),
    },
    {
      name: 'Distributor Admin',
      description: 'Manages distributor network, inventory, and licensing',
      isSystemRole: true,
      rolePermissions: [
        'orgs:read', 'users:read', 'users:write', 'catalog:read', 
        'inventory:read', 'inventory:write', 'dispatch:read', 'dispatch:write',
        'licenses:read', 'licenses:write', 'credits:read', 'credits:write', 'reports:read'
      ].map(action => ({
        permissionId: permissions[action].id,
        dataScope: DataScope.team,
      })),
    },
    {
      name: 'Dealer Admin',
      description: 'Manages dealer location and machine allocations',
      isSystemRole: true,
      rolePermissions: [
        'users:read', 'users:write', 'catalog:read', 'inventory:read',
        'licenses:read', 'licenses:write', 'credits:read', 'credits:write'
      ].map(action => ({
        permissionId: permissions[action].id,
        dataScope: DataScope.team,
      })),
    },
    {
      name: 'Retailer Sales',
      description: 'Counter-level user for machine activations and cutting',
      isSystemRole: true,
      rolePermissions: [
        'catalog:read', 'licenses:read', 'credits:read', 'licenses:write', 'credits:write'
      ].map(action => ({
        permissionId: permissions[action].id,
        dataScope: DataScope.own,
      })),
    },
    {
      name: 'Retailer Admin',
      description: 'Manages retailer location and machine activations',
      isSystemRole: true,
      rolePermissions: [
        'users:read', 'users:write', 'catalog:read', 'licenses:read', 'licenses:write', 'credits:read', 'credits:write', 'orgs:read'
      ].map(action => ({
        permissionId: permissions[action].id,
        dataScope: DataScope.team,
      })),
    },
  ];

  for (const roleData of defaultRoles) {
    const { rolePermissions, ...roleFields } = roleData;
    
    let role = await (prisma.role as any).findFirst({
      where: { organizationId: null, name: roleFields.name }
    });

    if (!role) {
      role = await (prisma.role as any).create({
        data: {
          ...roleFields,
          organizationId: null,
        },
      });
    } else {
      role = await (prisma.role as any).update({
        where: { id: role.id },
        data: { description: roleFields.description },
      });
    }

    console.log(`Ensuring permissions for role: ${role.name}`);

    // Clean current and re-add to ensure sync
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: rolePermissions.map(rp => ({
        roleId: role.id,
        permissionId: rp.permissionId,
        dataScope: rp.dataScope,
      })),
    });
  }

  console.log('Default roles and permissions seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
