import type { PageInfo } from '@/lib/pages';

const NAV = [
  { section: 'people', href: '/Build-People', text: 'Build People' },
  { section: 'communities', href: '/Programming-Events', text: 'Build Communities' },
  { section: 'systems', href: '/Build-Systems', text: 'Build Systems' },
  { section: 'support', href: '/Show-Your-Support', text: 'Show Your Support' },
];

export default function Header({ page }: { page: PageInfo }) {
  return (
    <header className="hud">
      <div className="hud__bar">
        <a className="brand" href="/">
          <img src="/img/bts-letters-80.webp" srcSet="/img/bts-letters-80.webp 2x, /img/bts-letters-120.webp 3x" width={112} height={40} alt="BITS" />
        </a>
        <p className="hud__where">
          <span className="hud__idx" data-idx={page.idx} aria-hidden="true"></span>
          <span className="hud__sep" aria-hidden="true"></span>
          <span className="hud__name">{page.hudName}</span>
        </p>
        <button className="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Menu" data-menu-btn="">
          <span className="menu-btn__bars" aria-hidden="true"></span>
        </button>
      </div>
      <nav className="site-nav levels" id="site-nav" aria-label="Main">
        <ol>
          {NAV.map((n) => (
            <li key={n.section}>
              <a className="site-nav__link" data-section={n.section} href={n.href} aria-current={page.current === n.href ? 'page' : undefined}>
                <span className="site-nav__text">{n.text}</span>
              </a>
            </li>
          ))}
        </ol>
        <div className="social social--nav">
          <a className="social__link" href="https://www.instagram.com/breaksinthesimulation/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <span className="icon" aria-hidden="true">{'︎'}</span>
          </a>
          <a className="social__link" href="https://open.spotify.com/user/ntixhuy6sld8s732reknd7vfs?si=122c0197351b423d&nd=1" target="_blank" rel="noopener noreferrer" aria-label="Spotify">
            <span className="icon" aria-hidden="true">{'︎'}</span>
          </a>
        </div>
      </nav>
    </header>
  );
}
