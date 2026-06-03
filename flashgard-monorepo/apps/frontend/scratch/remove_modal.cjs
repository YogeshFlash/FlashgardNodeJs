const fs = require('fs');
const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/flashgard-monorepo/apps/frontend/src/pages/DataMigration.tsx';
let code = fs.readFileSync(path, 'utf8');

// Remove setStatusModal calls
code = code.replace(/setStatusModal\(\{[\s\S]*?\}\);/g, '');

// Remove StatusModal state
code = code.replace(/const \[statusModal, setStatusModal\] = useState<.*?\}\);/s, '');

// Remove the StatusModal component rendering at the end of the file
// Find `<StatusModal\n` and remove it down to its closing tag `/>`
code = code.replace(/<StatusModal\s+isOpen=\{statusModal\.isOpen\}[\s\S]*?\/>/g, '');

fs.writeFileSync(path, code);
console.log('Removed StatusModal calls and component instance.');
