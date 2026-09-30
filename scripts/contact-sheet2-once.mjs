import sharp from 'sharp';
import fs from 'fs';

const files = fs.readdirSync('frames_hi').filter(f => f.endsWith('.png')).sort();
const start = 27, end = 54; // 0-indexed items 27..53 -> h028..h054
const subset = files.slice(start, end);

const cw = 240, ch = 300;
const cols = 6;
const rows = Math.ceil(subset.length / cols);

const crops = [];
for (const f of subset) {
  const buf = await sharp('frames_hi/' + f).extract({ left: 0, top: 40, width: cw, height: ch }).toBuffer();
  crops.push(buf);
}

const composite = crops.map((input, i) => ({
  input,
  left: (i % cols) * cw,
  top: Math.floor(i / cols) * ch,
}));

await sharp({
  create: { width: cw * cols, height: ch * rows, channels: 3, background: { r: 0, g: 0, b: 0 } }
}).composite(composite).toFile('frames_hi/contact_sheet2.png');

console.log('done', subset.length, 'frames from', subset[0], 'to', subset[subset.length-1]);
