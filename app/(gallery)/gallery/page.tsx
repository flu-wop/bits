import GalleryView from '@/components/GalleryView';
import { listGallery } from '@/lib/gallery';

export const dynamic = 'force-dynamic'; // reads the database; never prerendered at build time

export default async function GalleryPage() {
  const items = await listGallery({ publishedOnly: true });
  return (
    <main id="main" className="main">
      <div className="panel">
        <h1 className="page-title">Gallery</h1>
        <p className="prose">Moments from BITS events, programming and community.</p>
        {items.length ? <GalleryView items={items.map((i) => ({ id: i.id, url: i.url, alt: i.alt, caption: i.caption, category: i.category }))} /> : <p className="prose" role="status">Photos are coming soon.</p>}
        <nav className="pager" aria-label="Back"><a className="pager__link pager__back" href="/"><span aria-hidden="true">&larr;</span> <span>Breaks In The Simulation</span></a></nav>
      </div>
    </main>
  );
}
