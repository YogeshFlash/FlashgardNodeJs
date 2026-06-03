const fs = require('fs');
const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/flashgard-monorepo/apps/frontend/src/lib/api.ts';
let code = fs.readFileSync(path, 'utf8');

// The file has duplicated code between 455 and 465
code = code.replace(`  dbConnect: (config: any) => \n    request<any>('/migration/db/connect', { method: 'POST', body: JSON.stringify(config) }),\n  dbRun: (data: any) =>\n    request<any>('/migration/db/run', { method: 'POST', body: JSON.stringify(data) }),\n    const formData = new FormData();\n    formData.append('mobileUsers', mobileUsers);\n    return request<any>('/migration/legacy/mobile-users', { method: 'POST', body: formData });\n  },`, 
`  dbConnect: (config: any) => 
    request<any>('/migration/db/connect', { method: 'POST', body: JSON.stringify(config) }),
  dbRun: (data: any) =>
    request<any>('/migration/db/run', { method: 'POST', body: JSON.stringify(data) }),`);

fs.writeFileSync(path, code);
console.log('Fixed api.ts');
