const fs = require('fs');

async function main() {
  const content = fs.readFileSync('C:\\Users\\yoges\\.gemini\\antigravity-ide\\brain\\c37a3058-0e24-4dfa-bfa4-19ab823c7001\\.system_generated\\logs\\transcript.jsonl', 'utf8');
  const lines = content.split('\n');
  const line = lines[2567];
  const parsed = JSON.parse(line);
  if (parsed.tool_calls) {
    const call = parsed.tool_calls[0];
    console.log('TargetFile:', call.args.TargetFile);
    fs.writeFileSync('scratch/extracted_chunk.txt', call.args.CodeContent);
  }
}

main().catch(err => console.error(err));
