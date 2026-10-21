/** The editor's footer: one slim line, because the canvas needs the height,
 *  and under "More" the site's footer in columns, the same one the kit pages
 *  carry (SiteColumns, from src/site/links.json), sliding up over the canvas.
 *
 *  The columns are always in the page, folded when closed: they are the
 *  homepage's links to every kit page, and a crawler reads what is there,
 *  not what a click would open. Closed, they are inert. */
import { useEffect, useRef, useState } from 'react'
import { ChevronUp } from 'lucide-react'
import LINKS from '../site/links.json'
import { StarButton } from './StarButton'
import { SiteColumns } from './SiteFooter'

export function Footer({ onAbout }: { onAbout?: (section?: string) => void }) {
  const m = LINKS.maker
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    // A click in the canvas lands in its iframe; the window losing focus is how it shows here.
    const onBlur = () => setOpen(false)
    document.addEventListener('keydown', onKey); document.addEventListener('mousedown', onDown); window.addEventListener('blur', onBlur)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); window.removeEventListener('blur', onBlur) }
  }, [open])
  // Links that lead to where you already are stay here: the editor closes the
  // sheet, How it works opens over the editor instead of reloading it.
  const onSheetClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a')
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    const u = new URL(a.href, location.href)
    if (u.origin !== location.origin) return
    if (u.pathname === '/') { e.preventDefault(); setOpen(false) }
    else if (/^\/about\/?$/.test(u.pathname) && onAbout) { e.preventDefault(); setOpen(false); onAbout(u.hash.slice(1) || undefined) }
  }
  return (
    <footer ref={root} className={`foot foot--app ${open ? 'foot--open' : ''}`} aria-label="About UISandbox">
      <div className="foot__sheet sitefoot" inert={!open} onClick={onSheetClick}>
        <SiteColumns />
      </div>
      <span><b className="foot__name">UISandbox Design System Generator</b> · Play with your app's design, right in the browser · Made by <a href={m.href} target="_blank" rel="noopener author">{m.name}</a> at <a href={m.orgHref} target="_blank" rel="noopener">{m.org}</a> · © {new Date().getFullYear()} · <a href={m.licenceHref} target="_blank" rel="noopener license">{m.licence}</a></span>
      <span className="foot__sep" aria-hidden>·</span>
      <nav className="foot__links" aria-label="UISandbox links">
        <a href="/kits/">Kits</a>
        <a href="https://github.com/Ideelab/uisandbox" target="_blank" rel="noopener">Source</a>
        <a href="https://github.com/Ideelab/uisandbox/blob/main/notes/security.md" target="_blank" rel="noopener">Privacy and security</a>
      </nav>
      <button type="button" className="foot__more" onClick={() => setOpen((v) => !v)} aria-expanded={open} title={open ? 'Close' : 'Every link: the kits, the source, the decisions'}>
        More <ChevronUp size={13} strokeWidth={2} className="foot__more-chev" />
      </button>
      <StarButton label="Star on GitHub" />
    </footer>
  )
}
