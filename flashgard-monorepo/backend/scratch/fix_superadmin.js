const fs = require('fs');
const file = 'apps/frontend/src/pages/LicensesPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix 1: The row class 'opacity-50 bg-slate-50 grayscale pointer-events-none'
content = content.replace(
  /\${item\.ownerId !== user\?\.organizationId \? 'opacity-50/g,
  "${!user?.isSuperAdmin && item.ownerId !== user?.organizationId ? 'opacity-50"
);

// Fix 2: group.items.some check for styling
content = content.replace(
  /\${group\.items\.some\(\(i: any\) => i\.ownerId === user\?\.organizationId\) \?/g,
  "${user?.isSuperAdmin || group.items.some((i: any) => i.ownerId === user?.organizationId) ?"
);

// Fix 3: group.items.some check for disabled
content = content.replace(
  /disabled=\{\!group\.items\.some\(\(i: any\) => i\.ownerId === user\?\.organizationId\)\}/g,
  "disabled={!user?.isSuperAdmin && !group.items.some((i: any) => i.ownerId === user?.organizationId)}"
);

// Fix 4: group.items.filter for checked (group header)
content = content.replace(
  /group\.items\.filter\(\(i: any\) => i\.status === 'AVAILABLE' && i\.ownerId === user\?\.organizationId\)/g,
  "group.items.filter((i: any) => i.status === 'AVAILABLE' && (user?.isSuperAdmin || i.ownerId === user?.organizationId))"
);

// Fix 5: item.ownerId check for credits toggleSelect
content = content.replace(
  /onChange=\{\(\) => item\.ownerId === user\?\.organizationId \? toggleSelect\(item\.id\) : null\}/g,
  "onChange={() => (user?.isSuperAdmin || item.ownerId === user?.organizationId) ? toggleSelect(item.id) : null}"
);

// Fix 6: credits disabled
content = content.replace(
  /disabled=\{item\.ownerId !== user\?\.organizationId\}/g,
  "disabled={!user?.isSuperAdmin && item.ownerId !== user?.organizationId}"
);

// Fix 7: credits styling
content = content.replace(
  /\$\{item\.ownerId === user\?\.organizationId \? 'text-amber-600/g,
  "${(user?.isSuperAdmin || item.ownerId === user?.organizationId) ? 'text-amber-600"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed LicensesPage.tsx');
