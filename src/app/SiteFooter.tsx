/** The site's footer, in columns: on /about (the kit pages carry the same,
 *  written by scripts/kit-pages.mjs from the same src/site/links.json, so the
 *  two cannot drift apart). The editor keeps one slim line (Footer.tsx): a
 *  tall footer there would take height the canvas needs. */
import LINKS from '../site/links.json'
import DOOR from '../kits/door.json'
import { Mark } from './Mark'

type Link = { label: string; href: string }
export const siteColumns = (): Array<{ title: string; links: Link[] }> => LINKS.columns.map((c) => ({
  title: c.title,
  links: c.links === 'kits'
    ? [...DOOR.filter((k) => k.renders).map((k) => ({ label: k.name, href: `/kits/${k.id}/` })), { label: 'All kits', href: '/kits/' }]
    : (c.links as Link[]),
}))
const external = (href: string) => /^https?:/.test(href)

export function SiteFooter() {
  const m = LINKS.maker
  return (
    <footer className="sitefoot" aria-label="About UISandbox">
      <div className="sitefoot__inner">
        <div className="sitefoot__brand">
          <a href="/" className="sitefoot__mark"><Mark size={18} /> UISandbox Design System Generator</a>
          <p>Play with your app's design, right in the browser. Your files never leave it.</p>
        </div>
        {siteColumns().map((c) => (
          <nav key={c.title} className="sitefoot__col" aria-label={c.title}>
            <h2>{c.title}</h2>
            <ul>{c.links.map((l) => <li key={l.href}><a href={l.href} {...(external(l.href) ? { target: '_blank', rel: 'noopener' } : {})}>{l.label}</a></li>)}</ul>
          </nav>
        ))}
      </div>
      <div className="sitefoot__base">
        Made by <a href={m.href} target="_blank" rel="noopener author">{m.name}</a> at <a href={m.orgHref} target="_blank" rel="noopener">{m.org}</a> · © {new Date().getFullYear()} {m.org} · <a href={m.licenceHref} target="_blank" rel="noopener license">{m.licence}</a>
      </div>
    </footer>
  )
}
