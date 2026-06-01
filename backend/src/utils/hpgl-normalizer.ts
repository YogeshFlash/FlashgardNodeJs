/**
 * HPGL Normalizer - Standardizes PLT files for cutting plotters.
 * 
 * This function is IDEMPOTENT - running it multiple times on the same
 * data will always produce the exact same output. It NEVER scales data.
 * 
 * What it does:
 * 1. Parses PU/PD commands and extracts coordinate pairs.
 * 2. Strips non-essential configuration commands (VS, PW, WU, SP, LT, etc.).
 * 3. Shifts all coordinates so the design starts at (0,0).
 * 4. Rebuilds with clean "IN;PA;" header and "PU;PD x,y;" syntax.
 */
export function normalizeHpgl(rawHpgl: string): string {
    // 1. Parse all PU/PD commands and their coordinates
    const commands: { type: string, x: number, y: number }[] = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // Split by semicolon and also by newlines (some files use \r\n)
    const rawCmds = rawHpgl.split(/[;\r\n]+/);

    for (let rawCmd of rawCmds) {
        rawCmd = rawCmd.trim();
        if (rawCmd.length < 2) continue;

        const type = rawCmd.substring(0, 2).toUpperCase();
        if (type !== 'PU' && type !== 'PD') continue;

        // Extract all numbers from the rest of the command
        const coords = rawCmd.substring(2).split(/[,\s]+/).filter(s => s.length > 0);
        
        // Group into X,Y pairs
        for (let i = 0; i < coords.length; i += 2) {
            if (i + 1 >= coords.length) break;
            
            const x = parseFloat(coords[i]);
            const y = parseFloat(coords[i+1]);
            
            if (isNaN(x) || isNaN(y)) continue;

            // Preserve the original command type (PU or PD) for ALL points in a chain
            commands.push({ type, x, y });
            
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }
    }
    
    if (commands.length === 0) return rawHpgl;

    // 2. Shift design to (0,0) origin — NO SCALING EVER
    const offsetX = -minX;
    const offsetY = -minY;
    
    const finalWidth = maxX - minX;
    const finalHeight = maxY - minY;
    console.log(`[HPGL Normalizer] Bounding Box: ${finalWidth}x${finalHeight} units (${(finalWidth/40).toFixed(1)}x${(finalHeight/40).toFixed(1)}mm)`);

    // 3. Rebuild with clean syntax
    let normalized = "IN;PA;";
    for (const cmd of commands) {
        normalized += `${cmd.type}${Math.round(cmd.x + offsetX)},${Math.round(cmd.y + offsetY)};`;
    }
    normalized += "PU0,0;!PG;";
    
    return normalized;
}
