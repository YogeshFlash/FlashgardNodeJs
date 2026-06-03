const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'pages', 'Organizations.tsx');
let content = fs.readFileSync(file, 'utf8');

const startIdx = content.indexOf('// ─── Org Role Form Modal');
if (startIdx !== -1) {
  const endIdx = content.indexOf('// ───', startIdx + 10);
  if (endIdx !== -1) {
    content = content.substring(0, startIdx) + content.substring(endIdx);
    fs.writeFileSync(file, content);
    console.log('Removed OrgRoleModal');
  }
}
