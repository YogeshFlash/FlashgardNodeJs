const fs = require('fs');

const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Docs/Src/Database/AspNetUsers.csv';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split(/\r?\n/);

const targets = [
  '2a625437-5191-4578-b355-f33dee14e6fb',
  '4146a6fe-12a6-41e3-aa5e-a7e818182ef0'
];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  for (const t of targets) {
    if (line.includes(t)) {
      console.log(`Matched row for ${t} in AspNetUsers.csv:`);
      console.log(line);
    }
  }
}
