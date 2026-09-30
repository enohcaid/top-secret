import sharp from 'sharp';
import fs from 'fs';

const files = fs.readdirSync('frames_hi').filter(f => f.endsWith('.png')).sort();
const cw = 220, ch = 60;
const cols = 7;
const rows = Math.ceil(files.length / cols);

const crops = [];
for (const f of files) {
  const buf = await sharp('frames_hi/' + f).extract({ left: 60, top: 55, width: cw, height: ch }).toBuffer();
  crops.push(buf);
}

const composite = crops.map((input, i) => ({
  input,
  left: (i % cols) * cw,
  top: Math.floor(i / cols) * ch,
}));

await sharp({
  create: { width: cw * cols, height: ch * rows, channels: 3, background: { r: 0, g: 0, b: 0 } }
}).composite(composite).resize({ width: cw * cols * 2 }).toFile('frames_hi/contact_sheet.png');

console.log('done', files.length, 'frames, cols', cols, 'rows', rows);
