const fs = require('fs');
const readline = require('readline');

async function reconstruct() {
  const fileStream = fs.createReadStream('C:/Users/yoges/.gemini/antigravity-ide/brain/846c4059-5fd5-4774-a563-818d68089dc3/.system_generated/logs/transcript.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  
  // Base file is the current file since we restored it to initial import
  let content = fs.readFileSync('flashgard-monorepo/apps/frontend/src/pages/Organizations.tsx', 'utf8');
  let lines = content.split('\n');

  let applied = 0;

  for await (const lineStr of rl) {
    try {
      const entry = JSON.parse(lineStr);
      if (entry.source === 'MODEL' && entry.tool_calls) {
        for (const call of entry.tool_calls) {
          if (call.name === 'default_api:replace_file_content' || call.name === 'default_api:multi_replace_file_content') {
            const args = call.arguments;
            const targetFile = args.TargetFile || args.AbsolutePath;
            if (targetFile && targetFile.includes('Organizations.tsx')) {
              // Wait, are there any edits that I shouldn't apply? 
              // The recent edits that broke it or removed the tabs.
              // Let's stop at step_index 2100 (which is right before I started).
              if (entry.step_index > 2100) continue;

              const chunks = call.name === 'default_api:replace_file_content' ? [args] : args.ReplacementChunks;
              
              // Apply chunks in reverse order to not mess up line numbers if possible.
              // Wait, the tool finds TargetContent within [StartLine, EndLine].
              // Our script needs to mimic exactly what the tool does.
              // Tool algorithm: 
              // find TargetContent in lines[StartLine-1 : EndLine]
              // replace it with ReplacementContent
              
              // Let's sort chunks by StartLine descending
              chunks.sort((a, b) => b.StartLine - a.StartLine);
              
              for (const chunk of chunks) {
                const target = chunk.TargetContent;
                const repl = chunk.ReplacementContent;
                const sl = chunk.StartLine - 1;
                const el = chunk.EndLine;
                
                const slice = lines.slice(sl, el).join('\n');
                if (slice.includes(target)) {
                   const newSlice = slice.replace(target, repl);
                   const newLines = newSlice.split('\n');
                   lines.splice(sl, el - sl, ...newLines);
                   applied++;
                } else {
                   // If target has carriage returns...
                   const targetCR = target.replace(/\r\n/g, '\n');
                   const sliceCR = slice.replace(/\r\n/g, '\n');
                   if (sliceCR.includes(targetCR)) {
                       const newSlice = sliceCR.replace(targetCR, repl.replace(/\r\n/g, '\n'));
                       const newLines = newSlice.split('\n');
                       lines.splice(sl, el - sl, ...newLines);
                       applied++;
                   } else {
                       console.log('Failed to match chunk in step', entry.step_index);
                   }
                }
              }
            }
          }
        }
      }
    } catch(e) {}
  }
  
  fs.writeFileSync('Organizations_reconstructed.tsx', lines.join('\n'));
  console.log('Reconstructed file! Applied', applied, 'chunks.');
}

reconstruct();
