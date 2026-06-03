const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'pages', 'Organizations.tsx');
let content = fs.readFileSync(file, 'utf8');

// Remove ShieldCheck
content = content.replace(/,\s*ShieldCheck/g, '');
content = content.replace(/ShieldCheck,\s*/g, '');

// Remove OrgRoleModal
content = content.replace(/,\s*OrgRoleModal/g, '');
content = content.replace(/OrgRoleModal,\s*/g, '');

fs.writeFileSync(file, content);
console.log('Removed unused imports');
