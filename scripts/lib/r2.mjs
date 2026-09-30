// Cliente del bucket R2 `top-secret-media` (S3 compatible). Credenciales desde .env / entorno.
// Lo que se sube acá lo sirve el Worker en `${WORKER_BASE}/media/<key>` (salvo `_fuentes/`,
// que el Worker no expone: son originales y referencias de trabajo).
import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { need, loadEnv } from './env.mjs';

const TYPES = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf',
  '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.html': 'text/html; charset=utf-8',
  '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mov': 'video/quicktime',
};
export const contentType = f => TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream';

let client;
export function r2() {
  if (client) return client;
  loadEnv();
  client = new S3Client({
    region: 'auto',
    endpoint: `https://${need('CF_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: need('R2_ACCESS_KEY_ID'), secretAccessKey: need('R2_SECRET_ACCESS_KEY') },
  });
  return client;
}
export const bucket = () => { loadEnv(); return process.env.R2_BUCKET || 'top-secret-media'; };

export async function putFile(localPath, key, type) {
  await r2().send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: fs.readFileSync(localPath), ContentType: type || contentType(localPath) }));
}
export async function putBuffer(buf, key, type) {
  await r2().send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: buf, ContentType: type || contentType(key) }));
}
export async function getFile(key, localPath) {
  const res = await r2().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  fs.writeFileSync(localPath, Buffer.from(await res.Body.transformToByteArray()));
}
export async function del(key) {
  await r2().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}
// Lista todos los objetos bajo un prefijo: [{ key, size, modified }]
export async function list(prefix = '') {
  const out = []; let token;
  do {
    const res = await r2().send(new ListObjectsV2Command({ Bucket: bucket(), Prefix: prefix, ContinuationToken: token }));
    for (const o of res.Contents || []) out.push({ key: o.Key, size: o.Size, modified: o.LastModified });
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return out;
}
