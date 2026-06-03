const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'pages', 'Organizations.tsx');
let content = fs.readFileSync(file, 'utf8');

// Find the start of RolesTab
const startIndex = content.indexOf('const RolesTab = ({ orgId }: { orgId: number }) => {');
if (startIndex !== -1) {
  // Find the end of RolesTab which is before "// ─── Main Organizations Page ──────────────────────────"
  const endIndex = content.indexOf('// ─── Main Organizations Page ──────────────────────────', startIndex);
  if (endIndex !== -1) {
    // Remove it completely
    content = content.substring(0, startIndex) + content.substring(endIndex);
    fs.writeFileSync(file, content);
    console.log('Removed RolesTab definition');
  }
}
