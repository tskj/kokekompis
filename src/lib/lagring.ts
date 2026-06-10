import 'server-only';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nowMs } from '@/lib/clock';

// Objektlagring for rettbilder: Railways S3-kompatible bucket i produksjon, en lokal disk-mappe
// i utvikling og test (ingen bucket å sette opp lokalt). Nøkler — ikke URL-er — lagres i
// oppskriftens content; visningen veksler dem inn i (kortlevde, presignerte) URL-er ved rendring.

const envSchema = z.object({
  AWS_ENDPOINT_URL:      z.string().url(),
  AWS_S3_BUCKET_NAME:    z.string().min(1),
  AWS_ACCESS_KEY_ID:     z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_DEFAULT_REGION:    z.string().default('auto'),
});

function bucketKonfig() {
  const parsed = envSchema.safeParse(process.env);

  return parsed.success ? parsed.data : null;
}

export function harBucket(): boolean {
  return bucketKonfig() != null;
}

let cachedClient: S3Client | null = null;

function client(): S3Client {
  if (cachedClient) return cachedClient;

  const cfg = bucketKonfig();
  if (!cfg) throw new Error('objektlagring: AWS_*-variablene er ikke satt');

  cachedClient = new S3Client({
    endpoint: cfg.AWS_ENDPOINT_URL,
    region:   cfg.AWS_DEFAULT_REGION,
    credentials: {
      accessKeyId:     cfg.AWS_ACCESS_KEY_ID,
      secretAccessKey: cfg.AWS_SECRET_ACCESS_KEY,
    },
    // Path-style (`<endpoint>/<bucket>/<key>`) — virtual-host-style krever DNS per bucket,
    // som S3-kompatible tjenester (Railway inkludert) ikke alltid har.
    forcePathStyle: true,
  });

  return cachedClient;
}

// Lokal-backend: filer under .lokal-lagring/ (gitignorert), servert av /api/lokal-lagring/[...key].
// Testene overstyrer mappen med LOKAL_LAGRING_DIR.
function lokalDir(): string {
  return process.env.LOKAL_LAGRING_DIR || path.join(process.cwd(), '.lokal-lagring');
}

function trygKey(key: string): string {
  // nøklene er våre egne (`oppskrift/<uuid>/<uuid>.webp`), men de går i filstier og URL-er —
  // slipp bare gjennom det mønsteret
  if (!/^[a-z0-9/_.-]+$/i.test(key) || key.includes('..')) throw new Error(`objektlagring: ugyldig nøkkel: ${key}`);

  return key;
}

export async function lagreBilde(key: string, bytes: Buffer, mimeType: string): Promise<void> {
  trygKey(key);

  if (!harBucket()) {
    const fil = path.join(lokalDir(), key);
    await mkdir(path.dirname(fil), { recursive: true });
    await writeFile(fil, bytes);
    return;
  }

  await client().send(new PutObjectCommand({
    Bucket:       bucketKonfig()!.AWS_S3_BUCKET_NAME,
    Key:          key,
    Body:         bytes,
    ContentType:  mimeType,
    // nøkkelen er en uuid — innholdet bak den endres aldri
    CacheControl: 'private, max-age=2592000, immutable',
  }));
}

export async function hentBilde(key: string): Promise<Buffer> {
  trygKey(key);

  if (!harBucket()) return readFile(path.join(lokalDir(), key));

  const res = await client().send(new GetObjectCommand({ Bucket: bucketKonfig()!.AWS_S3_BUCKET_NAME, Key: key }));
  const chunks: Buffer[] = [];
  for await (const chunk of (res.Body ?? []) as AsyncIterable<Uint8Array>) chunks.push(Buffer.from(chunk));

  return Buffer.concat(chunks);
}

export async function slettBilde(key: string): Promise<void> {
  trygKey(key);

  if (!harBucket()) {
    await unlink(path.join(lokalDir(), key)).catch(() => {});
    return;
  }

  await client().send(new DeleteObjectCommand({ Bucket: bucketKonfig()!.AWS_S3_BUCKET_NAME, Key: key }));
}

// Presignerte GET-URL-er caches i prosessen til de nærmer seg utløp, så samme bilde gir samme URL
// på tvers av rendringer og nettleserens egen cache får virke.
const SIGNERT_TTL_SEKUNDER = 3600;
const SIGNERT_MARGIN_MS = 5 * 60 * 1000;
const signertCache = new Map<string, { url: string; utløperMs: number }>();

export async function bildeUrl(key: string): Promise<string> {
  // gamle rader kan ha rene URL-er liggende — de er allerede visningsklare
  if (key.startsWith('http://') || key.startsWith('https://')) return key;

  trygKey(key);

  if (!harBucket()) return `/api/lokal-lagring/${key}`;

  const cached = signertCache.get(key);
  if (cached && cached.utløperMs - nowMs() > SIGNERT_MARGIN_MS) return cached.url;

  const cmd = new GetObjectCommand({ Bucket: bucketKonfig()!.AWS_S3_BUCKET_NAME, Key: key });
  const url = await getSignedUrl(client(), cmd, { expiresIn: SIGNERT_TTL_SEKUNDER });

  signertCache.set(key, { url, utløperMs: nowMs() + SIGNERT_TTL_SEKUNDER * 1000 });
  if (signertCache.size > 500) signertCache.clear();

  return url;
}
