import RootShell from '@/components/RootShell';
import { NOT_FOUND } from '@/lib/pages';

export default function GlobalNotFound() {
  return (
    <RootShell page={NOT_FOUND}>
      <main id="main" className="main">
        <div className="panel">
          <h1 className="page-title">Page not found</h1>
          <p className="prose"><a className="inline-link" href="/">Breaks In The Simulation</a></p>
        </div>
      </main>
    </RootShell>
  );
}
