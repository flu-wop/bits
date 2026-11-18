import type { ReactNode } from 'react';

// Root layout for everything under /admin (separate from the public pages' per-page layouts).
export const metadata = { title: 'BITS admin', robots: { index: false, follow: false } };

export default function AdminRoot({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-section="home">
      <head>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="theme-color" content="#000000" />
        <link rel="icon" href="/img/favicon.png" type="image/png" />
        <link rel="stylesheet" href="/css/site.css" />
        <link rel="stylesheet" href="/css/admin.css" />
      </head>
      <body data-page="admin" data-backdrop="">{children}</body>
    </html>
  );
}
