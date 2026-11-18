'use client';
import { useState } from 'react';

export type Pic = { id: string; url: string; alt: string; caption: string; category: string };

export default function GalleryView({ items }: { items: Pic[] }) {
  const cats = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));
  const [cat, setCat] = useState('');
  const shown = cat ? items.filter((i) => i.category === cat) : items;
  const rows = [0, 1, 2].map((r) => items.filter((_, i) => i % 3 === r));
  return (
    <>
      {items.length >= 6 ? (
        <div className="drift" aria-hidden="true">
          {rows.map((row, r) => (
            <div key={r} className={`drift__row drift__row--${r}`}>
              <div className="drift__track">
                {[...row, ...row].map((p, i) => <img key={i} src={p.url} alt="" loading="lazy" decoding="async" />)}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {cats.length ? (
        <div className="gal-chips" role="group" aria-label="Filter photos">
          <button type="button" className="chip" aria-pressed={cat === ''} onClick={() => setCat('')}>All</button>
          {cats.map((c) => <button key={c} type="button" className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
        </div>
      ) : null}
      <ul className="gal-grid">
        {shown.map((p) => (
          <li key={p.id} className="gal-item">
            <img src={p.url} alt={p.alt} loading="lazy" decoding="async" />
            {p.caption ? <p className="gal-item__cap">{p.caption}</p> : null}
          </li>
        ))}
      </ul>
    </>
  );
}
