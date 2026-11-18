import type { Client } from '@libsql/client';
import { db } from '@/lib/db';
import type { Result } from '@/lib/validate';
import { cleanText } from '@/lib/validate';

export type GalleryItem = { id: string; url: string; pathname: string; alt: string; caption: string; category: string; sort: number; published: boolean; createdAt: string };
const toItem = (r: Record<string, unknown>): GalleryItem => ({ id: String(r.id), url: String(r.url), pathname: String(r.pathname), alt: String(r.alt), caption: String(r.caption), category: String(r.category), sort: Number(r.sort), published: Number(r.published) === 1, createdAt: String(r.created_at) });

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // Vercel functions accept ~4.5 MB request bodies

/** Identifies an image by its first bytes (the browser-supplied type is not trusted). */
export function sniffImage(b: Uint8Array): { ext: 'jpg' | 'png' | 'webp'; type: string } | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: 'png', type: 'image/png' };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { ext: 'webp', type: 'image/webp' };
  return null;
}

export async function listGallery(opts: { publishedOnly?: boolean } = {}, c?: Client): Promise<GalleryItem[]> {
  const client = c ?? (await db());
  const r = await client.execute(`SELECT * FROM gallery_items ${opts.publishedOnly ? 'WHERE published = 1' : ''} ORDER BY sort, created_at DESC`);
  return r.rows.map(toItem);
}

export async function addGalleryItem(i: { url: string; pathname: string; alt: string; caption: string; category: string }, c?: Client): Promise<Result<{ id: string }>> {
  const client = c ?? (await db());
  const alt = cleanText(i.alt, 160, 'Description', true); if (!alt.ok) return alt;
  const cap = cleanText(i.caption, 200, 'Caption'); if (!cap.ok) return cap;
  const cat = cleanText(i.category, 40, 'Category'); if (!cat.ok) return cat;
  const id = crypto.randomUUID();
  const min = Number((await client.execute('SELECT COALESCE(MIN(sort), 0) AS m FROM gallery_items')).rows[0].m);
  await client.execute({ sql: 'INSERT INTO gallery_items (id, url, pathname, alt, caption, category, sort, published, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)', args: [id, i.url, i.pathname, alt.value, cap.value, cat.value, min - 1, new Date().toISOString()] });
  return { ok: true, id };
}

export async function updateGalleryItem(id: string, f: { alt: string; caption: string; category: string; sort: number; published: boolean }, c?: Client): Promise<Result> {
  const client = c ?? (await db());
  const alt = cleanText(f.alt, 160, 'Description', true); if (!alt.ok) return alt;
  const cap = cleanText(f.caption, 200, 'Caption'); if (!cap.ok) return cap;
  const cat = cleanText(f.category, 40, 'Category'); if (!cat.ok) return cat;
  if (!Number.isInteger(f.sort) || Math.abs(f.sort) > 100000) return { ok: false, error: 'Order must be a whole number.' };
  const r = await client.execute({ sql: 'UPDATE gallery_items SET alt=?, caption=?, category=?, sort=?, published=? WHERE id=?', args: [alt.value, cap.value, cat.value, f.sort, f.published ? 1 : 0, id] });
  return r.rowsAffected ? { ok: true } : { ok: false, error: 'Image not found.' };
}

/** Returns the stored pathname so the caller can remove the file too. */
export async function deleteGalleryItem(id: string, c?: Client): Promise<string | null> {
  const client = c ?? (await db());
  const r = await client.execute({ sql: 'DELETE FROM gallery_items WHERE id = ? RETURNING pathname', args: [id] });
  return r.rows[0] ? String(r.rows[0].pathname) : null;
}
