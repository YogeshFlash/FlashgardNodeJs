const fs = require('fs');

const file = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/flashgard-monorepo/apps/frontend/src/pages/LicensesPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// Licenses Batch Checkbox
content = content.replace(
  /checked=\{group\.items\.filter\(\(i: any\) => i\.status === 'AVAILABLE' && \(user\?\.isSuperAdmin \|\| i\.ownerId === user\?\.organizationId\)\)\.every\(\(i: any\) => selectedIds\.includes\(i\.id\)\) && group\.items\.filter\(\(i: any\) => i\.status === 'AVAILABLE' && \(user\?\.isSuperAdmin \|\| i\.ownerId === user\?\.organizationId\)\)\.length > 0\}/g,
  "checked={group.items.filter((i: any) => i.status === 'AVAILABLE' && i.ownerId === user?.organizationId).every((i: any) => selectedIds.includes(i.id)) && group.items.filter((i: any) => i.status === 'AVAILABLE' && i.ownerId === user?.organizationId).length > 0}"
);

content = content.replace(
  /className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"/g,
  "className={`rounded border-slate-300 w-4 h-4 ${group.items.some((i: any) => i.ownerId === user?.organizationId) ? 'text-indigo-600 focus:ring-indigo-500 cursor-pointer' : 'text-slate-300 cursor-not-allowed'}`} disabled={!group.items.some((i: any) => i.ownerId === user?.organizationId)}"
);

// Licenses Row
content = content.replace(
  /<tr key=\{item\.id\} className=\{\`hover:bg-slate-50 transition-colors \$\{selectedIds\.includes\(item\.id\) \? 'bg-indigo-50\/50' : ''\}\`\}>/g,
  `<tr key={item.id} className={\`hover:bg-slate-50 transition-colors \${selectedIds.includes(item.id) ? 'bg-indigo-50/50' : ''} \${item.ownerId !== user?.organizationId ? 'opacity-50 bg-slate-50 grayscale pointer-events-none' : ''}\`}>`
);

content = content.replace(
  /\{item\.status === 'AVAILABLE' && \(user\?\.isSuperAdmin \|\| item\.ownerId === user\?\.organizationId\) && \(\s*<input type="checkbox" checked=\{selectedIds\.includes\(item\.id\)\} onChange=\{\(\) => toggleSelect\(item\.id\)\} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" \/>\s*\)\}/g,
  `{item.status === 'AVAILABLE' && (
                              <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => item.ownerId === user?.organizationId ? toggleSelect(item.id) : null} disabled={item.ownerId !== user?.organizationId} className={\`rounded border-slate-300 w-4 h-4 \${item.ownerId === user?.organizationId ? 'text-indigo-600 focus:ring-indigo-500 cursor-pointer' : 'text-slate-300 cursor-not-allowed'}\`} />
                            )}`
);

// selectFullBatch
content = content.replace(
  /const batchItems = items\.filter\(item => item\.batchId === batchId && item\.ownerId === ownerId && item\.status === 'AVAILABLE' && \(user\?\.isSuperAdmin \|\| item\.ownerId === user\?\.organizationId\)\);/g,
  "const batchItems = items.filter(item => item.batchId === batchId && item.ownerId === ownerId && item.status === 'AVAILABLE' && item.ownerId === user?.organizationId);"
);

// Credits Batch Checkbox
content = content.replace(
  /checked=\{group\.items\.filter\(\(i: any\) => i\.status === 'AVAILABLE' && \(user\?\.isSuperAdmin \|\| i\.ownerId === user\?\.organizationId\)\)\.every\(\(i: any\) => selectedIds\.includes\(i\.id\)\) && group\.items\.filter\(\(i: any\) => i\.status === 'AVAILABLE' && \(user\?\.isSuperAdmin \|\| i\.ownerId === user\?\.organizationId\)\)\.length > 0\}/g,
  "checked={group.items.filter((i: any) => i.status === 'AVAILABLE' && i.ownerId === user?.organizationId).every((i: any) => selectedIds.includes(i.id)) && group.items.filter((i: any) => i.status === 'AVAILABLE' && i.ownerId === user?.organizationId).length > 0}"
);

// Credits Row
content = content.replace(
  /<tr key=\{item\.id\} className=\{\`hover:bg-slate-50 transition-colors \$\{selectedIds\.includes\(item\.id\) \? 'bg-amber-50\/50' : ''\}\`\}>/g,
  `<tr key={item.id} className={\`hover:bg-slate-50 transition-colors \${selectedIds.includes(item.id) ? 'bg-amber-50/50' : ''} \${item.ownerId !== user?.organizationId ? 'opacity-50 bg-slate-50 grayscale pointer-events-none' : ''}\`}>`
);

content = content.replace(
  /\{item\.status === 'AVAILABLE' && \(user\?\.isSuperAdmin \|\| item\.ownerId === user\?\.organizationId\) && \(\s*<input type="checkbox" checked=\{selectedIds\.includes\(item\.id\)\} onChange=\{\(\) => toggleSelect\(item\.id\)\} className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer" \/>\s*\)\}/g,
  `{item.status === 'AVAILABLE' && (
                              <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => item.ownerId === user?.organizationId ? toggleSelect(item.id) : null} disabled={item.ownerId !== user?.organizationId} className={\`rounded border-slate-300 w-4 h-4 \${item.ownerId === user?.organizationId ? 'text-amber-600 focus:ring-amber-500 cursor-pointer' : 'text-slate-300 cursor-not-allowed'}\`} />
                            )}`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Done styling UI');
