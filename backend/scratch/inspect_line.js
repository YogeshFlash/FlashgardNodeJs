const fs = require('fs');

async function main() {
  const content = fs.readFileSync('C:\\Users\\yoges\\.gemini\\antigravity-ide\\brain\\c37a3058-0e24-4dfa-bfa4-19ab823c7001\\.system_generated\\logs\\transcript.jsonl', 'utf8');
  const lines = content.split('\n');
  
  const line = lines[2281];
  console.log('--- LINE 2281 ---');
  const parsed = JSON.parse(line);
  console.log('Source:', parsed.source);
  console.log('Type:', parsed.type);
  if (parsed.tool_calls) {
    console.log('Tool calls count:', parsed.tool_calls.length);
    for (const call of parsed.tool_calls) {
      console.log('Tool Name:', call.name);
      console.log('Args keys:', Object.keys(call.args || {}));
      if (call.args.ReplacementChunks) {
        console.log('ReplacementChunks count:', call.args.ReplacementChunks.length);
        for (let idx = 0; idx < call.args.ReplacementChunks.length; idx++) {
          const chunk = call.args.ReplacementChunks[idx];
          console.log(`Chunk ${idx} startLine: ${chunk.StartLine || chunk.startLine}`);
          console.log(`Chunk ${idx} target:`, String(chunk.TargetContent || chunk.targetContent).slice(0, 100));
          fs.writeFileSync(`scratch/chunk_${idx}.txt`, chunk.ReplacementContent || chunk.replacementContent);
        }
      }
    }
  }
}

main().catch(err => console.error(err));
