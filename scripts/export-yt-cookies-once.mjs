import puppeteer from 'puppeteer-core';
import fs from 'fs';

const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222' });
const pages = await browser.pages();
let page = pages.find(p => /youtube\.com/.test(p.url()));
if (!page) {
  page = await browser.newPage();
  await page.goto('https://www.youtube.com/@TOPSecretFC', { waitUntil: 'domcontentloaded' });
}
const cookies = await page.cookies();

const lines = ['# Netscape HTTP Cookie File'];
for (const c of cookies) {
  if (!/youtube\.com|google\.com/.test(c.domain)) continue;
  const domain = c.domain.startsWith('.') ? c.domain : c.domain;
  const includeSub = domain.startsWith('.') ? 'TRUE' : 'FALSE';
  const path = c.path || '/';
  const secure = c.secure ? 'TRUE' : 'FALSE';
  const expires = c.expires && c.expires > 0 ? Math.floor(c.expires) : 0;
  lines.push([domain, includeSub, path, secure, expires, c.name, c.value].join('\t'));
}

fs.writeFileSync('scripts/.yt-cookies.txt', lines.join('\n') + '\n');
console.log('Cookies exported:', cookies.filter(c => /youtube\.com|google\.com/.test(c.domain)).length);
await browser.disconnect();
