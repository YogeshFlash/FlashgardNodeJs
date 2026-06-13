const fs = require('fs');

const file = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/flashgard-monorepo/apps/frontend/src/pages/LicensesPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Grouping for Licenses
content = content.replace(
  /const groupedLicenses = orgLicenses\.reduce\(\(acc: any, curr: any\) => \{\s+if \(!acc\[curr\.batchId\]\) acc\[curr\.batchId\] = \{ info: curr\.batch, items: \[\] \};\s+acc\[curr\.batchId\]\.items\.push\(curr\);\s+return acc;\s+\}, \{\}\);/g,
  `const groupedLicenses = orgLicenses.reduce((acc: any, curr: any) => {
    const key = curr.batchId + '_' + curr.ownerId;
    if (!acc[key]) acc[key] = { info: curr.batch, owner: curr.owner, items: [] };
    acc[key].items.push(curr);
    return acc;
  }, {});`
);

// 2. Grouping for Cut Credits
content = content.replace(
  /const groupedCredits = cutCredits\.reduce\(\(acc: any, curr: any\) => \{\s+if \(!acc\[curr\.batchId\]\) acc\[curr\.batchId\] = \{ info: curr\.batch, items: \[\] \};\s+acc\[curr\.batchId\]\.items\.push\(curr\);\s+return acc;\s+\}, \{\}\);/g,
  `const groupedCredits = cutCredits.reduce((acc: any, curr: any) => {
    const key = curr.batchId + '_' + curr.ownerId;
    if (!acc[key]) acc[key] = { info: curr.batch, owner: curr.owner, items: [] };
    acc[key].items.push(curr);
    return acc;
  }, {});`
);

// 3. selectFullBatch signature and logic
content = content.replace(
  /const selectFullBatch = \(items: any\[\], batchId: string\) => \{\s+const batchItems = items\.filter\(item => item\.batchId === batchId && item\.status === 'AVAILABLE' && \(user\?\.isSuperAdmin \|\| item\.ownerId === user\?\.organizationId\)\);/g,
  `const selectFullBatch = (items: any[], batchId: string, ownerId: string) => {
    const batchItems = items.filter(item => item.batchId === batchId && item.ownerId === ownerId && item.status === 'AVAILABLE' && (user?.isSuperAdmin || item.ownerId === user?.organizationId));`
);

// 4. Update the Batch Checkbox for Licenses
content = content.replace(
  /checked=\{group\.items\.filter\(\(i: any\) => i\.status === 'AVAILABLE' && \(user\?\.isSuperAdmin \|\| i\.ownerId === user\?\.organizationId\)\)\.every\(\(i: any\) => selectedIds\.includes\(i\.id\)\) && group\.items\.filter\(\(i: any\) => i\.status === 'AVAILABLE' && \(user\?\.isSuperAdmin \|\| i\.ownerId === user\?\.organizationId\)\)\.length > 0\}/g,
  "checked={group.items.filter((i: any) => i.status === 'AVAILABLE' && (user?.isSuperAdmin || i.ownerId === user?.organizationId)).every((i: any) => selectedIds.includes(i.id)) && group.items.filter((i: any) => i.status === 'AVAILABLE' && (user?.isSuperAdmin || i.ownerId === user?.organizationId)).length > 0}"
);
// Replace the onChange handler to pass ownerId
content = content.replace(
  /onChange=\{\(\) => selectFullBatch\(orgLicenses, batchId\)\}/g,
  "onChange={() => selectFullBatch(orgLicenses, group.items[0].batchId, group.items[0].ownerId)}"
);
// Add owner info to the batch header row for Licenses
content = content.replace(
  /<span className="font-bold text-slate-700 text-xs uppercase tracking-wider">Batch: \{group\.info\.batchCode\}<\/span>/g,
  `<span className="font-bold text-slate-700 text-xs uppercase tracking-wider">Batch: {group.info.batchCode}</span>
  <span className="text-slate-400 text-xs">•</span>
  <span className="font-bold text-indigo-700 text-xs uppercase tracking-wider">{group.owner?.name}</span>`
);

// 5. Update the Batch Checkbox for Cut Credits
// Cut credits onChange handler
content = content.replace(
  /onChange=\{\(\) => selectFullBatch\(cutCredits, batchId\)\}/g,
  "onChange={() => selectFullBatch(cutCredits, group.items[0].batchId, group.items[0].ownerId)}"
);

// We should also make sure to run this file
fs.writeFileSync(file, content, 'utf8');
console.log('Grouped by owner in LicensesPage.tsx');
