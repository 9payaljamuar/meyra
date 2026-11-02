// File storage: local disk by default, any S3-compatible bucket (AWS S3, Cloudflare R2, DigitalOcean Spaces)
// when S3_BUCKET is set. Returns the URL clients should use.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {PutObjectCommand, S3Client} from '@aws-sdk/client-s3';
import {put} from '@vercel/blob';

// Serverless file systems are read-only except /tmp; uploads must go to Blob/S3 there.
export const UPLOAD_DIR = process.env.VERCEL ? '/tmp/uploads' : path.resolve('uploads');
fs.mkdirSync(UPLOAD_DIR, {recursive: true});

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.S3_REGION ?? 'ap-south-1';
const PUBLIC_BASE = process.env.S3_PUBLIC_URL ?? (BUCKET ? `https://${BUCKET}.s3.${REGION}.amazonaws.com` : '');

export const s3Live = !!BUCKET || !!BLOB_TOKEN;

const s3 = BUCKET
  ? new S3Client({
      region: REGION,
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: !!process.env.S3_ENDPOINT,
    })
  : null;

const EXT: Record<string, string> = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf'};

export async function saveFile(buf: Buffer, mime: string, folder = 'uploads'): Promise<string> {
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${EXT[mime] ?? ''}`;
  if (BLOB_TOKEN) {
    const blob = await put(`${folder}/${name}`, buf, {access: 'public', contentType: mime, token: BLOB_TOKEN});
    return blob.url;
  }
  if (s3) {
    const key = `${folder}/${name}`;
    await s3.send(new PutObjectCommand({Bucket: BUCKET, Key: key, Body: buf, ContentType: mime, CacheControl: 'public, max-age=31536000'}));
    return `${PUBLIC_BASE}/${key}`;
  }
  await fs.promises.writeFile(path.join(UPLOAD_DIR, name), buf);
  return `/uploads/${name}`;
}
