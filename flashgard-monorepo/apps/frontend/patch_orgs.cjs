const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'pages', 'Organizations.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Remove RolesTab usage
content = content.replace(/\{activeTab === 'Roles' && <RolesTab orgId=\{selected\.id\} \/>\}/g, '');
content = content.replace(/, 'Roles'/g, '');

// 2. Sanitize AddressesTab
content = content.replace(
  /const load = useCallback\(async \(\) => \{\s*setLoading\(true\);\s*try \{ setItems\(await addressesApi\.getAll\(String\(orgId\)\)\); \}/,
  `const load = useCallback(async () => {
    setLoading(true);
    try { 
      const res = await addressesApi.getAll(String(orgId));
      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
      const legacyRegex = /legacy( address| city| state)?/gi;
      const sanitize = (text) => text ? text.replace(uuidRegex, '').replace(legacyRegex, '').trim() : '';
      
      setItems(res.map(a => {
        const l1 = sanitize(a.streetLine1), l2 = sanitize(a.streetLine2);
        const city = sanitize(a.city), state = sanitize(a.state), zip = sanitize(a.postalCode), country = sanitize(a.country);
        return { 
          ...a, 
          formattedLine1: [l1, l2].filter(Boolean).join(', ') || 'Address not provided', 
          formattedLine2: [city, state, zip, country].filter(Boolean).join(', ') 
        };
      }));
    }`
);

// 3. Update rendering of Addresses
content = content.replace(
  /\{a\.streetLine1\}\{a\.streetLine2 \? \`, \$\{a\.streetLine2\}\` : ''\}/g,
  '{a.formattedLine1}'
);
content = content.replace(
  /\{a\.city\}, \{a\.state\} \{a\.postalCode\}, \{a\.country\}/g,
  '{a.formattedLine2}'
);

fs.writeFileSync(file, content);
console.log('Patched Organizations.tsx');
