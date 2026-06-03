const fs = require('fs');
const readline = require('readline');
async function extract() {
  const fileStream = fs.createReadStream('C:/Users/yoges/.gemini/antigravity-ide/brain/846c4059-5fd5-4774-a563-818d68089dc3/.system_generated/logs/transcript.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.includes('"step_index":543')) {
      const parsed = JSON.parse(line);
      console.log(parsed.content);
    }
  }
}
extract();
