import { PrismaClient, DataScope } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding Nav Permissions...');
  
  const permissionActions = [
    { action: 'nav:dashboard', description: 'View Dashboard tab' },
    { action: 'nav:organizations', description: 'View Organizations tab' },
    { action: 'nav:models', description: 'View Models tab' },
    { action: 'nav:inventory', description: 'View Inventory tab' },
    { action: 'nav:licenses', description: 'View Licenses tab' },
    { action: 'nav:migration', description: 'View Data Migration tab' },
    { action: 'nav:settings', description: 'View Settings tab' },
  ];

  const permissions: any = {};
  for (const p of permissionActions) {
    permissions[p.action] = await prisma.permission.upsert({
      where: { action: p.action },
      update: { description: p.description },
      create: p,
    });
  }

  // 3. Seed System Roles (Global)
  console.log('--- Updating System Roles ---');
  const defaultRoles = [
    {
      name: 'System Admin',
      actions: ['nav:dashboard', 'nav:organizations', 'nav:models', 'nav:inventory', 'nav:licenses', 'nav:migration', 'nav:settings'],
      dataScope: DataScope.all
    },
    {
      name: 'Distributor Admin',
      actions: ['nav:dashboard', 'nav:organizations', 'nav:models', 'nav:inventory', 'nav:licenses', 'nav:settings'],
      dataScope: DataScope.team
    },
    {
      name: 'Dealer Admin',
      actions: ['nav:dashboard', 'nav:models', 'nav:inventory', 'nav:licenses', 'nav:settings'],
      dataScope: DataScope.team
    },
    {
      name: 'Retailer Sales',
      actions: ['nav:dashboard', 'nav:models', 'nav:licenses'],
      dataScope: DataScope.own
    },
    {
      name: 'Retailer Admin',
      actions: ['nav:dashboard', 'nav:organizations', 'nav:models', 'nav:licenses', 'nav:settings'],
      dataScope: DataScope.team
    },
  ];

  for (const roleData of defaultRoles) {
    const role = await prisma.role.findFirst({
      where: { name: roleData.name, organizationId: null }
    });

    if (role) {
      console.log(`Updating ${role.name}...`);
      for (const action of roleData.actions) {
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: role.id,
                    permissionId: permissions[action].id
                }
            },
            update: { dataScope: roleData.dataScope },
            create: {
                roleId: role.id,
                permissionId: permissions[action].id,
                dataScope: roleData.dataScope
            }
        });
      }
    }
  }

  console.log('✅ Nav Permissions Seeded Successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
