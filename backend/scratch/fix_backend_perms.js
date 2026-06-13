const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

const replacements = [
  ['organizations:read', 'orgs:read'],
  ['organizations:write', 'orgs:write'],
  ['organizations:delete', 'orgs:write'],
  ['organization_types:read', 'orgs:read'],
  ['organization_types:write', 'orgs:write'],
  ['organization_types:delete', 'orgs:write'],
  ['users:delete', 'users:write'],
  ['roles:delete', 'roles:write'],
  ['models:read', 'catalog:read'],
  ['models:write', 'catalog:write']
];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.controller.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = content;
      for (const [search, replace] of replacements) {
        modified = modified.split(search).join(replace);
      }
      if (content !== modified) {
        fs.writeFileSync(fullPath, modified, 'utf8');
        console.log('Updated:', fullPath);
      }
    }
  }
}

processDir(srcDir);
