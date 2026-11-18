import { beforeEach, describe, expect, it } from 'vitest';
import type { Client } from '@libsql/client';
import { freshDb } from './helpers';
import { addGalleryItem, deleteGalleryItem, listGallery, sniffImage, updateGalleryItem } from '@/lib/gallery';

let c: Client;
beforeEach(async () => { c = await freshDb(); });
const item = (n: string) => ({ url: `https://blob.test/${n}.jpg`, pathname: `gallery/${n}.jpg`, alt: `Photo ${n}`, caption: '', category: 'Events' });

describe('gallery', () => {
  it('identifies images by content, not by claimed type', () => {
    expect(sniffImage(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe('jpg');
    expect(sniffImage(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d]))?.ext).toBe('png');
    expect(sniffImage(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))?.ext).toBe('webp');
    expect(sniffImage(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull();
    expect(sniffImage(new TextEncoder().encode('GIF89a'))).toBeNull();
  });
  it('needs a description, puts new photos first, hides unpublished ones from the public list', async () => {
    expect((await addGalleryItem({ ...item('x'), alt: '  ' }, c)).ok).toBe(false);
    const a = await addGalleryItem(item('a'), c); const b = await addGalleryItem(item('b'), c);
    if (!a.ok || !b.ok) throw new Error('add failed');
    expect((await listGallery({}, c)).map((i) => i.alt)).toEqual(['Photo b', 'Photo a']);
    expect((await updateGalleryItem(a.id, { alt: 'Photo a', caption: '', category: '', sort: 5, published: false }, c)).ok).toBe(true);
    expect((await listGallery({ publishedOnly: true }, c)).map((i) => i.alt)).toEqual(['Photo b']);
    expect((await updateGalleryItem(a.id, { alt: 'x', caption: '', category: '', sort: 1.5, published: true }, c)).ok).toBe(false);
  });
  it('delete returns the stored path so the file can be removed too', async () => {
    const a = await addGalleryItem(item('a'), c); if (!a.ok) throw new Error('x');
    expect(await deleteGalleryItem(a.id, c)).toBe('gallery/a.jpg');
    expect(await deleteGalleryItem(a.id, c)).toBeNull();
  });
});
