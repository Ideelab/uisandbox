import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Pin, Search } from 'lucide-react'
import type { Screen } from '../sandbox/project'

interface ScreenPickerProps {
  screens: Screen[]
  current: Screen
  onPick: (s: Screen) => void
  onPin: () => void
  /** The page the frame is on now, when it is NOT one of `screens` (you
   *  clicked through to it inside the app); null when it is in the list. */
  pinnable?: () => string | null
  /** A kit's screens: shown by the names their pages carry, not by path. */
  named?: boolean
}

/**
 * The screen picker — one shape for 3 screens and for 300.
 *
 * A tab strip stops working around a dozen; a searchable, folder-grouped list
 * never does. Arrows + Enter to choose, `[` / `]` anywhere on the page for
 * previous / next. Each entry says where it came from (a file in the build, a
 * link found on a page, added by hand) so a route that only an SPA knows about
 * is not mistaken for a page in the archive.
 *
 * Quiet by default (Alexander could not read "overview/ 2/5" or "Pin current
 * route"): the button says the screen's name and nothing else, the search
 * appears only for a list too long to scan, the shortcuts live in the
 * tooltip, and "add this page" appears only when the frame is on a page the
 * list does not have, saying which one.
 */
export function ScreenPicker({ screens, current, onPick, onPin, pinnable, named }: ScreenPickerProps) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(0)
  const [pinPath, setPinPath] = useState<string | null>(null)
  const searchable = screens.length > 8
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // The order a person steps through: a kit's own, else the list as found.
  const ordered = useMemo(() => (named ? [...screens].sort((a, b) => (a.order ?? 99) - (b.order ?? 99)) : screens), [screens, named])
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return needle ? screens.filter((s) => s.label.toLowerCase().includes(needle) || s.path.toLowerCase().includes(needle)) : screens
  }, [screens, q])

  // Group by the folder above the leaf: `/docs/5.3/about/brand` → `docs/5.3/about`.
  const groups = useMemo(() => {
    const m = new Map<string, Screen[]>()
    for (const s of filtered) {
      const parts = s.label.split('/').filter(Boolean)
      const g = parts.length > 1 ? parts.slice(0, -1).join('/') : ''
      if (!m.has(g)) m.set(g, [])
      m.get(g)!.push(s)
    }
    // A kit's screens come in the order the kit build gives them (overview
    // first), not by file name; anything else by folder.
    if (named) for (const list of m.values()) list.sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered, named])
  const flat = useMemo(() => groups.flatMap(([, list]) => list), [groups])

  useEffect(() => { if (open) { setQ(''); setPinPath(pinnable?.() ?? null); setHi(Math.max(0, flat.findIndex((s) => s.path === current.path))); setTimeout(() => (inputRef.current ?? listRef.current)?.focus(), 0) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setHi(0) }, [q])
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])
  // `[` / `]` step through screens from anywhere (not while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return
      if (e.key !== '[' && e.key !== ']') return
      const i = ordered.findIndex((s) => s.path === current.path)
      const n = ordered[(i + (e.key === ']' ? 1 : ordered.length - 1)) % ordered.length]
      if (n) onPick(n)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ordered, current, onPick])

  const choose = (s: Screen) => { onPick(s); setOpen(false) }
  const tag = (s: Screen) => (s.source === 'link' ? 'link' : s.source === 'pinned' ? 'added' : null)
  const idx = ordered.findIndex((s) => s.path === current.path)
  /** What a person calls the screen: a kit's own name for it ("An overview"),
   *  else the page's path, the root as Home. */
  const nameOf = (s: Screen) => (named && s.title ? s.title.split(' · ')[0]! : s.label === '/' ? 'Home' : s.label.replace(/^\//, ''))
  const leafOf = (s: Screen) => (named && s.title ? nameOf(s) : s.label.split('/').filter(Boolean).pop() ?? 'Home')
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(flat.length - 1, h + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); const s = flat[hi]; if (s) choose(s) }
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="spick" ref={rootRef}>
      <button type="button" className="spick__btn" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open} title={`Screen ${idx + 1} of ${screens.length}${named ? '' : ` (${current.path})`}. [ and ] step through them.`}>
        <span className="spick__cur">{nameOf(current)}</span>
        <ChevronDown size={13} strokeWidth={2} />
      </button>
      {open && (
        <div className="menu menu--pop spick__menu" role="listbox">
          {searchable && <div className="spick__search">
            <Search size={13} strokeWidth={2} />
            <input
              ref={inputRef}
              className="spick__input"
              value={q}
              placeholder={`Search ${screens.length} screens…`}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={keys}
            />
          </div>}
          <div className="spick__list" ref={listRef} tabIndex={-1} onKeyDown={searchable ? undefined : keys}>
            {groups.map(([g, list]) => (
              <div key={g}>
                {g && !named && <div className="menu__label">/{g}</div>}
                {list.map((s) => {
                  const i = flat.indexOf(s)
                  return (
                    <button key={s.path} type="button" role="option" aria-selected={s.path === current.path}
                      className={`menu__item spick__item ${s.path === current.path ? 'menu__item--on' : ''} ${i === hi ? 'spick__item--hi' : ''}`}
                      onMouseEnter={() => setHi(i)} onClick={() => choose(s)} title={s.path}>
                      <span className="spick__leaf">{leafOf(s)}</span>
                      {tag(s) && <span className="spick__tag">{tag(s)}</span>}
                    </button>
                  )
                })}
              </div>
            ))}
            {!flat.length && <div className="spick__empty">No screen matches “{q}”.</div>}
          </div>
          {pinPath && (
            <div className="spick__foot">
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => { onPin(); setOpen(false) }} title="You clicked through to a page this list does not have yet"><Pin size={12} strokeWidth={2} /> Add {pinPath === '/' ? 'Home' : pinPath} to the list</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
