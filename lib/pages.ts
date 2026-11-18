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
