import type { ReactNode } from 'react';
import { preload } from 'react-dom';
import { PAGES, type PageInfo } from '@/lib/pages';
import Header from './Header';
import Footer from './Footer';

// Runs before first paint: marks JS as available and, when arriving from the warp transition, opens the iris.
const BOOT = "document.documentElement.classList.add('js');try{if(sessionStorage.getItem('bits-warp')&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('is-arriving')}catch(e){}";

// Each page has its own root layout (route group), so <html> and <body> carry the same data-* attributes the
// flat site used and public/css/site.css works unchanged. Navigating between pages is a full page load, as before.
export default function RootShell({ slug, page, children }: { slug?: string; page?: PageInfo; children: ReactNode }) {
  const p = page ?? PAGES[slug as string];
  preload('/fonts/MisterPixel.woff', { as: 'font', type: 'font/woff', crossOrigin: 'anonymous' });
  return (
    <html lang="en" data-section={p.section} suppressHydrationWarning>
      <head>
        <title>{p.title}</title>
        {p.metas.map((m, i) => <meta key={i} {...m} />)}
        <link rel="icon" href="/img/favicon.png" type="image/png" />
        <link rel="stylesheet" href="/css/site.css" />
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body data-page={p.page} data-backdrop={p.backdrop}>
        <div className="corridor" aria-hidden="true">
          <div className="corridor__floor"></div>
          <div className="corridor__wall corridor__wall--l"></div>
          <div className="corridor__wall corridor__wall--r"></div>
          <div className="corridor__glow"></div>
        </div>
        <div className="crt" aria-hidden="true"></div>
        <div className="warp" aria-hidden="true"></div>
        <a className="skip" href="#main">Skip to content</a>
        <Header page={p} />
        {children}
        <Footer page={p} />
        <script src="/js/site.js" defer></script>
      </body>
    </html>
  );
}
