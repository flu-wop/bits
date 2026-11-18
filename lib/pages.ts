import data from '@/content/pages.json';

export type Meta = Record<string, string>;
export type PageInfo = {
  slug: string; path: string; title: string; metas: Meta[]; section: string; page: string; backdrop: string;
  idx: string; hudName: string; current: string | null; rir: string;
};

export const PAGES = data.pages as unknown as Record<string, PageInfo>;

export const NOT_FOUND: PageInfo = {
  slug: '404', path: '/404', title: 'Page not found - Breaks In The Simulation',
  metas: [{ name: 'robots', content: 'noindex' }, { name: 'theme-color', content: '#000000' }],
  section: 'home', page: '404', backdrop: 'gradient', idx: '00', hudName: 'Breaks In The Simulation',
  current: null, rir: PAGES.home.rir,
};

/** Synthetic page info for /gallery (not part of the flat-site migration). */
export const GALLERY: PageInfo = {
  slug: 'gallery', path: '/gallery', title: 'Gallery - Breaks In The Simulation',
  metas: [{ name: 'description', content: 'Moments from Breaks In The Simulation events, programming and community.' }, { name: 'theme-color', content: '#000000' }],
  section: 'communities', page: 'gallery', backdrop: 'gradient', idx: '00', hudName: 'Gallery',
  current: null, rir: PAGES.home.rir,
};
