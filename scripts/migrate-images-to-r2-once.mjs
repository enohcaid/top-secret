// One-shot: mirror Renders/ + logos/ into the R2 bucket top-secret-media.
// Non-destructive: does not touch git or existing site references.
import { readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const ACCESS_KEY = '193343f75da07692afb937f600d53fbb';
const SECRET_KEY = 'b3e498f4c5cdb0fac18f3b9dcca4586bae251b33f0a17e6ecf0162f694ed309d';
const ENDPOINT = 'https://505a1321519db1680cebe235e4e42808.r2.cloudflarestorage.com';
const BUCKET = 'top-secret-media';

const MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
};

const listFile = process.argv[2];
const files = readFileSync(listFile, 'utf8').split('\n').map(l => l.trim()).filter(Boolean);

let ok = 0, fail = 0, skipped = 0;
const failed = [];

for (const file of files) {
  let st;
  try { st = statSync(file); } catch (e) { skipped++; failed.push({ file, code: 'STAT_FAIL', err: e.message }); continue; }
  if (!st.isFile()) { skipped++; continue; }

  const ext = (file.split('.').pop() || '').toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';
  const key = file.split('/').map(encodeURIComponent).join('/');
  const url = `${ENDPOINT}/${BUCKET}/${key}`;

  const args = [
    '-s', '-o', '/dev/null', '-w', '%{http_code}',
    '-X', 'PUT',
    '--aws-sigv4', 'aws:amz:auto:s3',
    '--user', `${ACCESS_KEY}:${SECRET_KEY}`,
    '-H', `content-type: ${contentType}`,
    '--data-binary', `@${file}`,
    url,
  ];

  const res = spawnSync('curl', args, { encoding: 'utf8' });
  const code = (res.stdout || '').trim();

  if (code === '200') {
    ok++;
  } else {
    fail++;
    failed.push({ file, code, err: res.stderr });
  }
}

console.log(`OK: ${ok}  FAIL: ${fail}  SKIPPED: ${skipped}  TOTAL: ${files.length}`);
if (failed.length) {
  console.log('Failures:');
  for (const f of failed) console.log(` - ${f.file} -> ${f.code} ${f.err || ''}`);
  process.exit(1);
}
