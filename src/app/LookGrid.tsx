/**
 * Pick a look: the screen on stage, six times, each in one direction
 * (sandbox/directions.ts, decision 216). Side by side because novices choose
 * better from parallel options than by tweaking one; on their own screen
 * because "the preview isn't my app" is the complaint every theme tool gets.
 *
 * Each card is the same sandboxed page the stage shows, at desktop width,
 * scaled down, with that look's sheet written into it once it has loaded.
 * Nothing in a card can be clicked but the card itself: picking it puts the
 * look on the knobs, where Undo, Reset and Export treat it like any turn.
 */
import { useEffect, useRef, useState } from 'react'
import { Lock, Shuffle, X } from 'lucide-react'
import type { SandboxProject, Screen } from '../sandbox/project'
import { varsStyleTag } from '../sandbox/project'
import { sandboxUrl } from '../sandbox/host'
import { nestedDocs } from '../sandbox/verify'
import { applyScheme } from '../sandbox/scheme'
import type { LookLocks } from '../sandbox/directions'
import { SANDBOX_FLAGS } from './Stage'

export interface LookSheet { vars: Record<string, string>; fonts: string; dark: 'dark' | 'light' | null }
export interface LookCard { id: string; name: string; what: string; key: string; brand: string; sheet: LookSheet }

/* rendered at 1000px and cut at 620: the head, the figures and the first
   chart, where a look shows most, at a size a card can still be read */
const FRAME_W = 1000
const FRAME_H = 620

function writeSheet(doc: Document, project: SandboxProject, sheet: LookSheet) {
  for (const d of [doc, ...nestedDocs(doc)]) {
    let el = d.getElementById('us-vars')
    if (!el) { el = d.createElement('style'); el.id = 'us-vars'; (d.head ?? d.documentElement).prepend(el) }
    const css = varsStyleTag(sheet.vars)
    el.textContent = css.slice(css.indexOf('>') + 1, css.lastIndexOf('<'))
    let fonts = d.getElementById('us-fonts')
    if (!fonts) { fonts = d.createElement('style'); fonts.id = 'us-fonts'; el.after(fonts) }
    fonts.textContent = sheet.fonts
    try { applyScheme(d, project.scheme, sheet.dark) } catch { /* mid-navigation */ }
  }
}

function Card({ project, screen, look, picked, onPick }: { project: SandboxProject; screen: Screen; look: LookCard; picked: boolean; onPick: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.3)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setScale(el.clientWidth / FRAME_W))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // A new roll or lock is a new sheet for a page that is already there.
  useEffect(() => { const doc = frame.current?.contentDocument; if (ready && doc) writeSheet(doc, project, look.sheet) }, [look.key, ready]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <button type="button" className={`looks__card ${picked ? 'looks__card--on' : ''}`} onClick={onPick} aria-pressed={picked} title={`${look.name}: ${look.what}`}>
      <div className="looks__shot" ref={box} style={{ height: FRAME_H * scale }}>
        <iframe ref={frame} tabIndex={-1} aria-hidden="true" title={look.name} src={sandboxUrl(project.id, screen.path, project.base)}
          sandbox={SANDBOX_FLAGS} style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${scale})` }}
          onLoad={() => { const doc = frame.current?.contentDocument; if (doc) { writeSheet(doc, project, look.sheet); setReady(true) } }} />
      </div>
      <span className="looks__name"><span className="looks__dot" style={{ background: look.brand }} />{look.name}</span>
      <span className="looks__what">{look.what}</span>
    </button>
  )
}

export function LookGrid({ project, screen, looks, current, locks, onLocks, onShuffle, onPick, onClose }: {
  project: SandboxProject; screen: Screen; looks: LookCard[]; current: string | null
  locks: LookLocks; onLocks: (l: LookLocks) => void; onShuffle: () => void; onPick: (id: string) => void; onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.code === 'Space' && !(e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName))) { e.preventDefault(); onShuffle() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, onShuffle])
  return (
    <div className="looks" role="dialog" aria-label="Pick a look">
      <div className="looks__bar">
        <h2 className="looks__title">Your {screen.title?.split(' · ')[0] ?? (screen.label === '/' ? 'screen' : screen.label)}, six ways</h2>
        <button type="button" className={`btn btn--sm ${locks.colour ? 'btn--primary' : 'btn--secondary'}`} aria-pressed={locks.colour} onClick={() => onLocks({ ...locks, colour: !locks.colour })}><Lock size={13} /> Keep my colour</button>
        <button type="button" className={`btn btn--sm ${locks.font ? 'btn--primary' : 'btn--secondary'}`} aria-pressed={locks.font} onClick={() => onLocks({ ...locks, font: !locks.font })}><Lock size={13} /> Keep my font</button>
        <button type="button" className="btn btn--secondary btn--sm" onClick={onShuffle}><Shuffle size={13} /> Shuffle <kbd>Space</kbd></button>
        <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Close" title="Back to the screen"><X size={15} /></button>
      </div>
      <div className="looks__grid">
        {looks.map((l) => <Card key={l.id} project={project} screen={screen} look={l} picked={current === l.id} onPick={() => onPick(l.id)} />)}
      </div>
      <p className="looks__foot">A look sets brand, grey tint, fonts, corners, spacing and depth, through the knobs: Undo takes it back, and you tune it next.</p>
    </div>
  )
}
