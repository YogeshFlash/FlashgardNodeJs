import { PrismaClient, DataScope } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Master Seed...');

  // 1. Seed Organization Types
  console.log('--- Seeding Organization Types ---');
  const orgTypes = [
    { name: 'parent', description: 'Parent organization Flashgard' },
    { name: 'headquarters', description: 'Headquarters / Main Dealer' },
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

  // 2. Seed Permissions
  console.log('--- Seeding Permissions ---');
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

    // Navigation Visibility
    { action: 'nav:dashboard', description: 'View Dashboard tab' },
    { action: 'nav:organizations', description: 'View Organizations tab' },
    { action: 'nav:reports', description: 'View Reports tab' },
    { action: 'nav:models', description: 'View Models tab' },
    { action: 'nav:inventory', description: 'View Inventory tab' },
    { action: 'nav:licenses', description: 'View Licenses tab' },
    { action: 'nav:migration', description: 'View Data Migration tab' },
    { action: 'nav:settings', description: 'View Settings tab' },
    { action: 'nav:mobile-home', description: 'View Mobile Home tab' },
    { action: 'mobile-home:write', description: 'Manage mobile home page elements' },
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
  console.log('--- Seeding System Roles ---');
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
        'licenses:read', 'licenses:write', 'credits:read', 'credits:write', 'reports:read',
        'nav:dashboard', 'nav:organizations', 'nav:reports', 'nav:models', 'nav:inventory', 'nav:licenses', 'nav:settings', 'nav:mobile-home', 'mobile-home:write'
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
        'licenses:read', 'licenses:write', 'credits:read', 'credits:write',
        'nav:dashboard', 'nav:reports', 'nav:models', 'nav:inventory', 'nav:licenses', 'nav:settings', 'nav:mobile-home', 'mobile-home:write'
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
        'catalog:read', 'licenses:read', 'credits:read', 'licenses:write', 'credits:write',
        'nav:dashboard', 'nav:models', 'nav:licenses'
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
        'users:read', 'users:write', 'catalog:read', 'licenses:read', 'licenses:write', 'credits:read', 'credits:write', 'orgs:read',
        'nav:dashboard', 'nav:organizations', 'nav:reports', 'nav:models', 'nav:licenses', 'nav:settings', 'nav:mobile-home', 'mobile-home:write'
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
        data: { ...roleFields, organizationId: null },
      });
    } else {
      role = await (prisma.role as any).update({
        where: { id: role.id },
        data: { description: roleFields.description },
      });
    }

    // Sync Permissions
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: rolePermissions.map(rp => ({
        roleId: role.id,
        permissionId: rp.permissionId,
        dataScope: rp.dataScope,
      })),
    });
  }

  // 4. Seed Root Organization & Admin
  console.log('--- Seeding Root Organization & Admin ---');
  const parentType = await prisma.organizationType.findUnique({ where: { name: 'parent' } });
  if (!parentType) throw new Error('Parent type not found');

  let flashgard = await prisma.organization.findFirst({ where: { name: 'Flashgard' } });
  if (!flashgard) {
    flashgard = await prisma.organization.create({
      data: {
        name: 'Flashgard',
        organizationTypeId: parentType.id,
      },
    });
  }

  const sysAdminRole = await (prisma.role as any).findFirst({ where: { organizationId: null, name: 'System Admin' } });
  
  const email = 'admin@flashgard.com';
  const password = 'admin123';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  let admin = await prisma.user.findUnique({ where: { email } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: 'System',
        lastName: 'Admin',
        isSuperAdmin: true,
        isActive: true,
        organizationId: null,
        roleId: sysAdminRole.id
      },
    });
  } else {
    admin = await prisma.user.update({
      where: { email },
      data: {
        organizationId: null,
        roleId: sysAdminRole.id,
      }
    });
  }

  // Ensure Admin-Org link is completely removed since Super Admin is independent
  await prisma.userOrganization.deleteMany({
    where: { userId: admin.id }
  });

  // 5. Seed Product Master Data
  console.log('--- Seeding Product Master Data ---');
  const filmTypes = ['Canvas 3D', 'Canvas Alpha', 'Canvas Shield', 'Canvas Titan', 'Clear Film', 'Dry Films', 'Matte Film', 'Shield Clear', 'Textured Film'];
  for (const name of filmTypes) {
    let ft = await (prisma as any).filmType.findFirst({ where: { name, parentId: null } });
    if (!ft) {
      await (prisma as any).filmType.create({ data: { name, parentId: null } });
    }
  }

  const categories = ['Mobile', 'Laptop', 'Smart watches', 'Accessories', 'Two wheeler display', 'Car display'];
  for (const name of categories) {
    let cat = await (prisma as any).modelCategory.findFirst({ where: { name, parentId: null } });
    if (!cat) {
      await (prisma as any).modelCategory.create({ data: { name, parentId: null, sortOrder: 0 } });
    }
  }

  const cutTypes = ['Front Protector CF', 'Front Protector Full', 'Back Protector CF', 'Back Protector Full', 'Back Skin Full', 'Back Skin CF', 'Back Skin CF Without Logo', 'Back Skin Full Without Logo', 'Split Full Wrap'];
  for (const name of cutTypes) {
    let cp = await (prisma as any).cutPattern.findFirst({ where: { name } });
    if (!cp) {
      await (prisma as any).cutPattern.create({ data: { name, sortOrder: 0 } });
    }
  }

  console.log('✅ Master Seeding Completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
