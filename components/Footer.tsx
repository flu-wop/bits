import type { PageInfo } from '@/lib/pages';

// The Rooted in Rhythm link differs between pages on the flat site (rootedinrhythm.co vs the vercel.app URL).
// It is carried over per page exactly as it was; Rooted in Rhythm is a separate project and is not touched here.
export default function Footer({ page }: { page: PageInfo }) {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p className="site-footer__copy">
          &copy; 2026 Breaks In The Simulation. All rights reserved.<span aria-hidden="true"> &middot; </span>
          <a href={page.rir} target="_blank" rel="noopener noreferrer">Rooted in Rhythm</a>
          <span aria-hidden="true"> &middot; </span><a href="/privacy">Privacy</a>
          <span aria-hidden="true"> &middot; </span><a href="/terms">Terms</a>
        </p>
        <p className="site-footer__credit">
          Designed by <a href="https://in-flu-ential.vercel.app" target="_blank" rel="noopener noreferrer">IN-FLU-ENTIAL</a>
        </p>
      </div>
    </footer>
  );
}
