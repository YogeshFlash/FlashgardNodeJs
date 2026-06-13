const fs = require('fs');
const readline = require('readline');

async function main() {
  const fileStream = fs.createReadStream('C:\\Users\\yoges\\.gemini\\antigravity-ide\\brain\\c37a3058-0e24-4dfa-bfa4-19ab823c7001\\.system_generated\\logs\\transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let count = 0;
  for await (const line of rl) {
    if (line.includes('migrateMobileAppCuts') || line.includes('migrateDealerMasterQRs')) {
      count++;
      console.log(`Match #${count} - line length: ${line.length}`);
      // Find where "ReplacementContent" starts and print a chunk of it
      const index = line.indexOf('ReplacementContent');
      if (index !== -1) {
        console.log(line.substring(index, index + 1500));
      } else {
        console.log(line.substring(0, 500));
      }
      console.log('=====================================\n');
      if (count > 20) break;
    }
  }
}

main().catch(err => console.error(err));
