const fs = require('fs');

const file = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/flashgard-monorepo/apps/frontend/src/pages/LicensesPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add import
content = content.replace(
  /import \{ HasPermission \} from '\.\.\/components\/HasPermission';/g,
  "import { HasPermission } from '../components/HasPermission';\nimport { SearchableSelect } from '../components/SearchableSelect';"
);

// Replace select component
const selectRegex = /<div className="relative md:w-64">\s*<select[\s\S]*?<\/select>\s*<div className="absolute right-3 top-1\/2 -translate-y-1\/2 pointer-events-none">[\s\S]*?<\/div>\s*<\/div>/g;

content = content.replace(
  selectRegex,
  `<SearchableSelect
                className="w-full md:w-64"
                options={batches.map(b => ({ value: b.id, label: \`\${b.batchCode} (\${b.licenseType || b.planType})\` }))}
                value={selectedBatch}
                onChange={setSelectedBatch}
                placeholder="All Batches"
              />`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Replaced select with SearchableSelect');
