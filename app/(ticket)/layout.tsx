import type { ReactNode } from 'react';

export const metadata = { robots: { index: false, follow: false } };

export default function TicketRoot({ children }: { children: ReactNode }) {
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
