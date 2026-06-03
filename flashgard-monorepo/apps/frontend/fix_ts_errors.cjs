const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'pages', 'Organizations.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Remove OrgRoleModal declaration completely
const startIdx = content.indexOf('const OrgRoleModal = ({ role, orgId, onClose, onSave }: any) => {');
if (startIdx !== -1) {
  // Find the end: "// ─── Org Form Modal" or "// ─── Address Form Modal" ? Let's see what is next.
  // We can just find "};" followed by some empty lines and then the next component. 
  // Let's use regex to replace it.
  content = content.replace(/const OrgRoleModal = \(\{ role, orgId, onClose, onSave \}: any\) => \{[\s\S]*?^\};\n/m, '');
}

// 2. Fix 'text' implicitly has 'any' type
content = content.replace(/const sanitize = \(text\) =>/g, 'const sanitize = (text: string) =>');

fs.writeFileSync(file, content);
console.log('Fixed TS errors');
