/** The editor's footer: one slim line, because the canvas needs the height.
 *  The full footer, in columns, is SiteFooter on /about and the kit pages. */
import LINKS from '../site/links.json'

export function Footer() {
  const m = LINKS.maker
  return (
    <footer className="foot" aria-label="About UISandbox">
      <span>Made by <a href={m.href} target="_blank" rel="noopener author">{m.name}</a> at <a href={m.orgHref} target="_blank" rel="noopener">{m.org}</a> · © {new Date().getFullYear()} · <a href={m.licenceHref} target="_blank" rel="noopener license">{m.licence}</a></span>
      <span className="foot__sep" aria-hidden>·</span>
      <nav className="foot__links" aria-label="UISandbox links">
        <a href="/kits/">Kits</a>
        <a href="https://github.com/Ideelab/uisandbox" target="_blank" rel="noopener">Source</a>
        <a href="https://github.com/Ideelab/uisandbox/blob/main/notes/security.md" target="_blank" rel="noopener">Privacy and security</a>
      </nav>
    </footer>
  )
}
