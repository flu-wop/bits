import fs from 'node:fs';
import path from 'node:path';

// Page content ported from the flat site as-is (content/main/<slug>.html). Rendered once at build time.
export function readMain(slug: string) {
  return fs.readFileSync(path.join(process.cwd(), 'content', 'main', `${slug}.html`), 'utf8');
}

export default function MainHtml({ slug }: { slug: string }) {
  return <main id="main" className="main" dangerouslySetInnerHTML={{ __html: readMain(slug) }} />;
}
