import sharp from 'sharp';
import * as path from 'path';
import { mkdirp } from 'mkdirp';

export function hpglToSvg(hpgl: string): string {
  const commands = hpgl.split(';').map(c => c.trim()).filter(c => c.length > 0);
  let penDown = false;
  let currentPos = { x: 0, y: 0 };
  const paths: string[] = [];
  let currentPath: string[] = [];

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  const updateBounds = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };

  for (const cmdStr of commands) {
    const cmd = cmdStr.substring(0, 2).toUpperCase();
    // Support both comma and space separated parameters
    const params = cmdStr.substring(2).trim().split(/[, ]+/).map(p => parseFloat(p)).filter(p => !isNaN(p));

    if (cmd === 'IN') {
      // Initialize
    } else if (cmd === 'PA') {
      // Plot Absolute
      if (params.length >= 2) {
        for (let i = 0; i < params.length; i += 2) {
            currentPos = { x: params[i], y: params[i+1] };
            updateBounds(currentPos.x, currentPos.y);
            if (penDown) {
              if (currentPath.length === 0) currentPath.push(`M ${currentPos.x} ${currentPos.y}`);
              else currentPath.push(`L ${currentPos.x} ${currentPos.y}`);
            } else {
              if (currentPath.length > 0) paths.push(currentPath.join(' '));
              currentPath = [`M ${currentPos.x} ${currentPos.y}`];
            }
        }
      }
    } else if (cmd === 'PU') {
      // Pen Up
      penDown = false;
      if (params.length >= 2) {
        for (let i = 0; i < params.length; i += 2) {
          currentPos = { x: params[i], y: params[i+1] };
          updateBounds(currentPos.x, currentPos.y);
          if (currentPath.length > 0) paths.push(currentPath.join(' '));
          currentPath = [`M ${currentPos.x} ${currentPos.y}`];
        }
      }
    } else if (cmd === 'PD') {
      // Pen Down
      penDown = true;
      if (params.length >= 2) {
        for (let i = 0; i < params.length; i += 2) {
          currentPos = { x: params[i], y: params[i+1] };
          updateBounds(currentPos.x, currentPos.y);
          if (currentPath.length === 0) {
              currentPath.push(`M ${currentPos.x} ${currentPos.y}`);
          } else {
              currentPath.push(`L ${currentPos.x} ${currentPos.y}`);
          }
        }
      }
    }
  }
  if (currentPath.length > 0) paths.push(currentPath.join(' '));

  if (minX === Infinity) return '';

  const width = maxX - minX;
  const height = maxY - minY;
  const padding = 0; // Removed 5% padding to prevent shrinking sensation

  // HPGL Y increases upwards, SVG Y increases downwards.
  // We flip it by scaling and adjusting the viewBox.
  const svg = `
    <svg width="${width / 40}mm" height="${height / 40}mm" 
         viewBox="${minX} ${-maxY} ${width} ${height}" 
         xmlns="http://www.w3.org/2000/svg">
      <g transform="scale(1, -1)">
        <path d="${paths.join(' ')}" fill="none" stroke="#2563eb" stroke-width="${Math.max(width, height) / 200}" stroke-linecap="round" stroke-linejoin="round" />
      </g>
    </svg>
  `;
  return svg;
}

export async function saveHpglAsJpg(hpgl: string, outputDir: string, fileName: string): Promise<string> {
  console.log('[HPGL Parser] Converting HPGL to SVG...');
  const svg = hpglToSvg(hpgl);
  if (!svg) {
    console.error('[HPGL Parser] Failed to generate SVG from HPGL.');
    throw new Error('Invalid HPGL data');
  }

  console.log('[HPGL Parser] SVG generated (length:', svg.length, '). Saving to JPG...');
  await mkdirp(outputDir);
  const outputPath = path.join(outputDir, fileName);
  const relativePath = path.posix.join('uploads', 'designs', fileName);

  await sharp(Buffer.from(svg))
    .flatten({ background: { r: 255, g: 255, b: 255 } }) // White background for JPG
    .jpeg({ quality: 90 })
    .toFile(outputPath);

  console.log('[HPGL Parser] JPG saved to:', outputPath);
  return relativePath;
}
