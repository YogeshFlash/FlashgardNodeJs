const fs = require('fs');
const file = 'flashgard-monorepo/apps/frontend/src/pages/LicensesPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state variable
content = content.replace(
  /const \[selectedBatch, setSelectedBatch\] = useState<string>\(''\);/,
  "const [selectedBatch, setSelectedBatch] = useState<string>('');\n  const [showNonAvailable, setShowNonAvailable] = useState(false);"
);

// 2. Update useEffect dependencies
content = content.replace(
  /\[tab, page, debouncedSearch, selectedBatch\]\);/g,
  "[tab, page, debouncedSearch, selectedBatch, showNonAvailable]);"
);

// 3. Update fetchData calls
content = content.replace(
  /licensesApi\.getInventory\(undefined, skip, take, debouncedSearch, selectedBatch\)/g,
  "licensesApi.getInventory(undefined, skip, take, debouncedSearch, selectedBatch, showNonAvailable ? undefined : 'AVAILABLE')"
);
content = content.replace(
  /cutCreditsApi\.getInventory\(undefined, skip, take, debouncedSearch, selectedBatch\)/g,
  "cutCreditsApi.getInventory(undefined, skip, take, debouncedSearch, selectedBatch, showNonAvailable ? undefined : 'AVAILABLE')"
);

// 4. Add the checkbox in UI
const checkboxHtml = `
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={showNonAvailable}
                  onChange={(e) => setShowNonAvailable(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                Show Non-Available
              </label>
              <SearchableSelect`;

content = content.replace(
  /            <SearchableSelect/g,
  checkboxHtml
);

content = content.replace(
  /              \/>\s*<\/div>\s*<div className="bg-white/g,
  "              />\n            </div>\n          </div>\n          <div className=\"bg-white"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Updated LicensesPage.tsx');
