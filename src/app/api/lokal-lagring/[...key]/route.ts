import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { harBucket } from '@/lib/lagring';

// Visningsruten for disk-backenden i lokal utvikling — produksjon (med bucket) har presignerte
// URL-er rett mot bucketen og skal aldri treffe denne.
export async function GET(req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  if (harBucket()) return new NextResponse(null, { status: 404 });

  const { key } = await ctx.params;
  const sammensatt = key.join('/');
  if (!/^[a-z0-9/_.-]+$/i.test(sammensatt) || sammensatt.includes('..')) return new NextResponse(null, { status: 400 });

  const dir = process.env.LOKAL_LAGRING_DIR || path.join(process.cwd(), '.lokal-lagring');
  try {
    const bytes = await readFile(path.join(dir, sammensatt));

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': sammensatt.endsWith('.webp') ? 'image/webp' : 'application/octet-stream',
        'Cache-Control': 'private, max-age=2592000, immutable',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
