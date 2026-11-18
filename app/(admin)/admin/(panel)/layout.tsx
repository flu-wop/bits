import type { ReactNode } from 'react';
import { logoutAction } from '../actions';
import { requireAdmin } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const email = await requireAdmin();
  return (
    <>
      <header className="adm-bar">
        <a className="adm-brand" href="/admin">BITS admin</a>
        <nav className="adm-nav" aria-label="Admin">
          <a href="/admin">Dashboard</a>
          <a href="/admin/events">Events</a>
          <a href="/admin/deposits">Deposits</a>
          <a href="/admin/orders">Orders</a>
          <a href="/admin/gallery">Gallery</a>
          <a href="/admin/checkin">Check-in</a>
        </nav>
        <span className="adm-who">{email}</span>
        <form action={logoutAction}><button className="adm-btn adm-btn--ghost" type="submit">Sign out</button></form>
      </header>
      {children}
    </>
  );
}
