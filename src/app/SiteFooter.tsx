/** The site's footer in columns: the brand and the three columns, from
 *  src/site/links.json. The editor's footer opens it under "More"
 *  (Footer.tsx); the kit pages carry the same, written by
 *  scripts/kit-pages.mjs from the same file, so the two cannot drift apart. */
import LINKS from '../site/links.json'
import DOOR from '../kits/door.json'
import { Mark } from './Mark'
import { StarButton } from './StarButton'

type Link = { label: string; href: string }
export const siteColumns = (): Array<{ title: string; links: Link[] }> => LINKS.columns.map((c) => ({
  title: c.title,
  links: c.links === 'kits'
    ? [...DOOR.filter((k) => k.renders).map((k) => ({ label: k.name, href: `/kits/${k.id}/` })), { label: 'All kits', href: '/kits/' }]
    : (c.links as Link[]),
}))
const external = (href: string) => /^https?:/.test(href)

export function SiteColumns() {
  return (
    <div className="sitefoot__inner">
      <div className="sitefoot__brand">
        <a href="/" className="sitefoot__mark"><Mark size={18} /> UISandbox Design System Generator</a>
        <p>Play with your app's design, right in the browser. Your files never leave it.</p>
        <StarButton label="Star on GitHub" />
      </div>
      {siteColumns().map((c) => (
        <nav key={c.title} className="sitefoot__col" aria-label={c.title}>
          <h2>{c.title}</h2>
          <ul>{c.links.map((l) => <li key={l.href}><a href={l.href} {...(external(l.href) ? { target: '_blank', rel: 'noopener' } : {})}>{l.label}</a></li>)}</ul>
        </nav>
      ))}
    </div>
  )
}
