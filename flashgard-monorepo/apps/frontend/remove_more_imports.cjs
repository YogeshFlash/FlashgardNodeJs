const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'pages', 'Organizations.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/,\s*Check/g, '');
content = content.replace(/Check,\s*/g, '');

content = content.replace(/,\s*rolesApi/g, '');
content = content.replace(/rolesApi,\s*/g, '');

content = content.replace(/,\s*permissionsApi/g, '');
content = content.replace(/permissionsApi,\s*/g, '');

fs.writeFileSync(file, content);
console.log('Removed more unused imports');
