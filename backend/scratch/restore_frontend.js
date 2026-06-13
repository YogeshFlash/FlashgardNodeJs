const fs = require('fs');

const file = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/flashgard-monorepo/apps/frontend/src/pages/LicensesPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// Restore Batch checkbox for Licenses
content = content.replace(
  /checked=\{group\.items\.filter\(\(i: any\) => i\.status === 'AVAILABLE' && i\.ownerId === user\?\.organizationId\)\.every/g,
  "checked={group.items.filter((i: any) => i.status === 'AVAILABLE' && (user?.isSuperAdmin || i.ownerId === user?.organizationId)).every"
);
content = content.replace(
  /&& group\.items\.filter\(\(i: any\) => i\.status === 'AVAILABLE' && i\.ownerId === user\?\.organizationId\)\.length > 0\}/g,
  "&& group.items.filter((i: any) => i.status === 'AVAILABLE' && (user?.isSuperAdmin || i.ownerId === user?.organizationId)).length > 0}"
);

// Restore Individual checkbox for Licenses
content = content.replace(
  /\{item\.status === 'AVAILABLE' && item\.ownerId === user\?\.organizationId && \(/g,
  "{item.status === 'AVAILABLE' && (user?.isSuperAdmin || item.ownerId === user?.organizationId) && ("
);

// Restore selectFullBatch logic
content = content.replace(
  /const batchItems = items\.filter\(item => item\.batchId === batchId && item\.status === 'AVAILABLE' && item\.ownerId === user\?\.organizationId\);/g,
  "const batchItems = items.filter(item => item.batchId === batchId && item.status === 'AVAILABLE' && (user?.isSuperAdmin || item.ownerId === user?.organizationId));"
);

// Restore Batch checkbox for Cut Credits
content = content.replace(
  /checked=\{group\.items\.filter\(\(i: any\) => i\.status === 'AVAILABLE' && i\.ownerId === user\?\.organizationId\)\.every/g,
  "checked={group.items.filter((i: any) => i.status === 'AVAILABLE' && (user?.isSuperAdmin || i.ownerId === user?.organizationId)).every"
);
content = content.replace(
  /&& group\.items\.filter\(\(i: any\) => i\.status === 'AVAILABLE' && i\.ownerId === user\?\.organizationId\)\.length > 0\}/g,
  "&& group.items.filter((i: any) => i.status === 'AVAILABLE' && (user?.isSuperAdmin || i.ownerId === user?.organizationId)).length > 0}"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Restored isSuperAdmin bypass in LicensesPage.tsx');
