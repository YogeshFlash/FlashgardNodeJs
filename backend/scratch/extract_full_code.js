const fs = require('fs');

async function main() {
  const content = fs.readFileSync('C:\\Users\\yoges\\.gemini\\antigravity-ide\\brain\\c37a3058-0e24-4dfa-bfa4-19ab823c7001\\.system_generated\\logs\\transcript.jsonl', 'utf8');
  const lines = content.split('\n');

  let output = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    if (line.includes('migration.service.ts')) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.tool_calls) {
          for (const call of parsed.tool_calls) {
            if (call.name === 'replace_file_content' || call.name === 'multi_replace_file_content') {
              const file = call.args.TargetFile;
              if (file && file.includes('migration.service.ts')) {
                output += `\n\n=== Match index ${i} | Tool: ${call.name} | Desc: ${call.args.Description} ===\n`;
                if (call.args.ReplacementContent) {
                  output += call.args.ReplacementContent + '\n';
                }
                if (call.args.ReplacementChunks) {
                  for (const chunk of call.args.ReplacementChunks) {
                    output += `--- Chunk StartLine: ${chunk.StartLine} ---\n`;
                    output += chunk.ReplacementContent + '\n';
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }

  fs.writeFileSync('scratch/extracted.txt', output);
  console.log('Done! Extracted contents written to scratch/extracted.txt');
}

main().catch(err => console.error(err));
