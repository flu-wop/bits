import ActionForm from '@/components/admin/ActionForm';
import { deleteGalleryAction, updateGalleryAction, uploadGalleryAction } from '../../actions';
import { listGallery } from '@/lib/gallery';
import { requireAdmin } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function GalleryAdmin() {
  await requireAdmin();
  const items = await listGallery();
  const connected = !!process.env.BLOB_READ_WRITE_TOKEN;
  return (
    <main className="adm-wrap">
      <h1 className="adm-h1">Gallery</h1>
      <p className="adm-lede">Photos for the public Gallery page. New photos go to the front. Lower order numbers show first. Describe each photo in a few words: it is read aloud for people who cannot see it.</p>
      {!connected ? <p className="adm-msg adm-msg--err" role="status">Image storage is not connected yet, so uploads are off.</p> : null}
      <ActionForm action={uploadGalleryAction} submitLabel="Upload" className="adm-card adm-card--accent">
        <h3>Add a photo</h3>
        <div className="adm-field"><label className="adm-label">Photo (JPG, PNG or WebP, up to 4 MB)</label><input name="file" type="file" accept="image/jpeg,image/png,image/webp" required /></div>
        <div className="adm-field"><label className="adm-label">What the photo shows</label><input name="alt" type="text" required maxLength={160} /></div>
        <div className="adm-cols">
          <div className="adm-field"><label className="adm-label">Caption (optional)</label><input name="caption" type="text" maxLength={200} /></div>
          <div className="adm-field"><label className="adm-label">Category (optional, e.g. Events)</label><input name="category" type="text" maxLength={40} /></div>
        </div>
      </ActionForm>
      {items.map((g) => (
        <div key={g.id} className="adm-card">
          <img src={g.url} alt={g.alt} width={160} style={{ height: 'auto', maxWidth: '100%', marginBottom: 8 }} loading="lazy" />
          <ActionForm action={updateGalleryAction.bind(null, g.id)} submitLabel="Save">
            <div className="adm-field"><label className="adm-label">What the photo shows</label><input name="alt" type="text" required maxLength={160} defaultValue={g.alt} /></div>
            <div className="adm-cols">
              <div className="adm-field"><label className="adm-label">Caption</label><input name="caption" type="text" maxLength={200} defaultValue={g.caption} /></div>
              <div className="adm-field"><label className="adm-label">Category</label><input name="category" type="text" maxLength={40} defaultValue={g.category} /></div>
              <div className="adm-field"><label className="adm-label">Order</label><input name="sort" type="text" inputMode="numeric" defaultValue={g.sort} /></div>
            </div>
            <label className="adm-check"><input name="published" type="checkbox" defaultChecked={g.published} /> Shown on the site</label>
          </ActionForm>
          <ActionForm action={deleteGalleryAction.bind(null, g.id)} submitLabel="Delete photo" tone="danger" />
        </div>
      ))}
    </main>
  );
}
