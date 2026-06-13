const fs = require('fs');

async function main() {
  const content = fs.readFileSync('C:\\Users\\yoges\\.gemini\\antigravity-ide\\brain\\c37a3058-0e24-4dfa-bfa4-19ab823c7001\\.system_generated\\logs\\transcript.jsonl', 'utf8');
  const lines = content.split('\n');
  
  let matchCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    if (line.includes('migration.service.ts') && line.includes('tool_calls')) {
      try {
        const parsed = JSON.parse(line);
        const calls = parsed.tool_calls || [];
        for (const call of calls) {
          if (call.name === 'replace_file_content' || call.name === 'multi_replace_file_content') {
            matchCount++;
            console.log(`Match #${matchCount} at index ${i} | Tool: ${call.name} | Description: ${call.args.Description}`);
            
            if (call.args.ReplacementContent || call.args.replacementContent) {
              const rc = call.args.ReplacementContent || call.args.replacementContent;
              fs.writeFileSync(`scratch/write_${i}_replace.txt`, rc);
            }
            
            let chunks = call.args.ReplacementChunks || call.args.replacementChunks;
            if (chunks) {
              if (typeof chunks === 'string') {
                try {
                  chunks = JSON.parse(chunks);
                } catch (e) {
                  // ignore
                }
              }
              if (Array.isArray(chunks)) {
                chunks.forEach((chunk, cidx) => {
                  const rc = chunk.ReplacementContent || chunk.replacementContent;
                  if (rc) {
                    fs.writeFileSync(`scratch/write_${i}_chunk_${cidx}.txt`, rc);
                  }
                });
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error processing line ${i}:`, err.message);
      }
    }
  }
  console.log(`Found ${matchCount} matches editing migration.service.ts`);
}

main().catch(err => console.error(err));
