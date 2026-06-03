const fs = require('fs');

async function run() {
    const stream = fs.createReadStream('backend/uploads/DatatoMigrate/ModelMaster.csv');
    let buffer = Buffer.alloc(0);
    let headerDone = false;
    let count = 0;

    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
        
        // Convert accumulated buffer to utf16le
        let text;
        if (!headerDone && buffer[0] === 0xFF && buffer[1] === 0xFE) {
            text = buffer.slice(2).toString('utf16le');
        } else {
            text = buffer.toString('utf16le');
        }

        const lines = text.split('\n');
        
        // Keep the last incomplete line in the buffer
        const lastLine = lines.pop();
        // Re-encode the last incomplete line back to buffer
        buffer = Buffer.from(lastLine || '', 'utf16le');

        for (const line of lines) {
            if (!headerDone) {
                console.log('HEADER:', line.trim().substring(0, 200));
                headerDone = true;
                continue;
            }
            
            if (line.includes('iPhone 16 Pro Max')) {
                count++;
                const parts = line.split(',');
                const modelName = parts[1] || '';
                const refName = parts[2] || '';
                const instruction = parts[3] || '';
                
                console.log(`\nRow ${count}: Model="${modelName.trim()}" Ref="${refName.trim()}"`);
                console.log(`  Instruction length: ${instruction.length} chars`);
                
                if (instruction.length > 20) {
                    try {
                        const hexStr = instruction.trim();
                        const pltBuf = Buffer.from(hexStr, 'hex');
                        const fullPlt = pltBuf.toString('utf-8');
                        console.log(`  PLT Snippet: ${fullPlt.substring(0, 100)}`);
                        
                        const coords = fullPlt.match(/(?:PU|PD)\s*(-?\d+\.?\d*)[,\s](-?\d+\.?\d*)/g) || [];
                        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                        coords.forEach(c => {
                            const nums = c.match(/-?\d+\.?\d*/g).map(Number);
                            const x = nums.length >= 3 ? nums[1] : nums[0];
                            const y = nums.length >= 3 ? nums[2] : nums[1];
                            if (x < minX) minX = x; if (x > maxX) maxX = x;
                            if (y < minY) minY = y; if (y > maxY) maxY = y;
                        });
                        console.log(`  ORIGINAL Width: ${maxX - minX} units (${((maxX - minX)/40).toFixed(1)}mm)`);
                        console.log(`  ORIGINAL Height: ${maxY - minY} units (${((maxY - minY)/40).toFixed(1)}mm)`);
                    } catch(e) {
                        console.log(`  Decode error: ${e.message}`);
                    }
                }
                
                if (count >= 3) {
                    stream.destroy();
                    return;
                }
            }
        }
    }
    console.log(`\nTotal found: ${count}`);
}
run();
