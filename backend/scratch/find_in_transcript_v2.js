const fs = require('fs');

async function main() {
  const content = fs.readFileSync('C:\\Users\\yoges\\.gemini\\antigravity-ide\\brain\\c37a3058-0e24-4dfa-bfa4-19ab823c7001\\.system_generated\\logs\\transcript.jsonl', 'utf8');
  const lines = content.split('\n');

  console.log('Total transcript lines:', lines.length);

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (i < 2400 && line.includes('async migrateMobileAppCuts(')) {
      console.log(`Found migrateMobileAppCuts in line ${i}`);
      const parsed = JSON.parse(line);
      const calls = parsed.tool_calls || [];
      for (const call of calls) {
        if (call.args && call.args.ReplacementContent) {
          fs.writeFileSync('scratch/extracted_cuts.txt', call.args.ReplacementContent);
          console.log('Written cuts to scratch/extracted_cuts.txt');
        }
        if (call.args && (call.args.ReplacementChunks || call.args.replacementChunks)) {
          const chunks = call.args.ReplacementChunks || call.args.replacementChunks;
          const content = chunks.map(c => c.ReplacementContent || c.replacementContent).join('\n\n');
          fs.writeFileSync('scratch/extracted_cuts.txt', content);
          console.log('Written cuts chunks to scratch/extracted_cuts.txt');
        }
      }
      break;
    }
  }

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (i < 2400 && line.includes('async migrateDealerMasterQRs(')) {
      console.log(`Found migrateDealerMasterQRs in line ${i}`);
      const parsed = JSON.parse(line);
      const calls = parsed.tool_calls || [];
      for (const call of calls) {
        if (call.args && call.args.ReplacementContent) {
          fs.writeFileSync('scratch/extracted_qrs.txt', call.args.ReplacementContent);
          console.log('Written qrs to scratch/extracted_qrs.txt');
        }
        if (call.args && (call.args.ReplacementChunks || call.args.replacementChunks)) {
          const chunks = call.args.ReplacementChunks || call.args.replacementChunks;
          const content = chunks.map(c => c.ReplacementContent || c.replacementContent).join('\n\n');
          fs.writeFileSync('scratch/extracted_qrs.txt', content);
          console.log('Written qrs chunks to scratch/extracted_qrs.txt');
        }
      }
      break;
    }
  }
}

main().catch(err => console.error(err));
