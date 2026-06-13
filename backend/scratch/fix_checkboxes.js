const fs = require('fs');

const file = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/flashgard-monorepo/apps/frontend/src/pages/LicensesPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix 1: Batch checkbox for Licenses
content = content.replace(
  /checked=\{group\.items\.filter\(\(i: any\) => i\.status === 'AVAILABLE' && \(user\?\.isSuperAdmin \|\| i\.ownerId === user\?\.organizationId\)\)\.every/g,
  "checked={group.items.filter((i: any) => i.status === 'AVAILABLE' && i.ownerId === user?.organizationId).every"
);
content = content.replace(
  /&& group\.items\.filter\(\(i: any\) => i\.status === 'AVAILABLE' && \(user\?\.isSuperAdmin \|\| i\.ownerId === user\?\.organizationId\)\)\.length > 0\}/g,
  "&& group.items.filter((i: any) => i.status === 'AVAILABLE' && i.ownerId === user?.organizationId).length > 0}"
);

// Fix 2: Individual checkbox for Licenses
content = content.replace(
  /\{item\.status === 'AVAILABLE' && \(user\?\.isSuperAdmin \|\| item\.ownerId === user\?\.organizationId\) && \(/g,
  "{item.status === 'AVAILABLE' && item.ownerId === user?.organizationId && ("
);

// Fix 3: Batch checkbox for Cut Credits
content = content.replace(
  /checked=\{group\.items\.filter\(\(i: any\) => i\.status === 'AVAILABLE'\)\.every/g,
  "checked={group.items.filter((i: any) => i.status === 'AVAILABLE' && i.ownerId === user?.organizationId).every"
);
content = content.replace(
  /&& group\.items\.filter\(\(i: any\) => i\.status === 'AVAILABLE'\)\.length > 0\}/g,
  "&& group.items.filter((i: any) => i.status === 'AVAILABLE' && i.ownerId === user?.organizationId).length > 0}"
);

// Fix 4: Individual checkbox for Cut Credits
content = content.replace(
  /\{item\.status === 'AVAILABLE' && \(/g,
  "{item.status === 'AVAILABLE' && item.ownerId === user?.organizationId && ("
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed LicensesPage.tsx checkboxes');
