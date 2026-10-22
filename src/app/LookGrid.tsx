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
import { Check, ChevronLeft, ChevronRight, Lock, Shuffle } from 'lucide-react'
import type { SandboxProject, Screen } from '../sandbox/project'
import { observeExtra, varsStyleTag } from '../sandbox/project'
import { sandboxUrl } from '../sandbox/host'
import { nestedDocs } from '../sandbox/verify'
import { applyScheme } from '../sandbox/scheme'
import { observeFrame } from '../sandbox/live'
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

/** Styles a page writes at runtime (a dev server's injected <style>, CSS-in-JS,
 *  style="" set by script) are rewritten in each look's frame too, as on the
 *  stage (sandbox/live.ts): unobserved, they kept their literals and the six
 *  ignored every knob on a live Vite app (decision 217). */
function useObserved(project: SandboxProject, onGrow: () => void) {
  const stop = useRef<(() => void) | null>(null)
  useEffect(() => () => { stop.current?.() }, [])
  return (doc: Document) => { stop.current?.(); stop.current = observeFrame(doc, project.table, onGrow, observeExtra(project)) }
}

function Card({ project, screen, look, picked, onOpen, onGrow }: { project: SandboxProject; screen: Screen; look: LookCard; picked: boolean; onOpen: () => void; onGrow: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const observe = useObserved(project, onGrow)
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
    <button type="button" className={`looks__card ${picked ? 'looks__card--on' : ''}`} onClick={onOpen} aria-pressed={picked} title={`${look.name}: open it full size`}>
      <div className="looks__shot" ref={box} style={{ height: FRAME_H * scale }}>
        {/* lazy: on a phone four of the six are below the fold, and each is a whole app rendering */}
        <iframe ref={frame} tabIndex={-1} aria-hidden="true" title={look.name} loading="lazy" src={sandboxUrl(project.id, screen.path, project.base)}
          sandbox={SANDBOX_FLAGS} style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${scale})` }}
          onLoad={() => { const doc = frame.current?.contentDocument; if (doc) { writeSheet(doc, project, look.sheet); observe(doc); setReady(true) } }} />
      </div>
      <span className="looks__name"><span className="looks__dot" style={{ background: look.brand }} />{look.name}{picked && <span className="looks__picked">picked</span>}</span>
      <span className="looks__what">{look.what}</span>
    </button>
  )
}

/** One look at full size, in the same room as the six (decision 216): look at
 *  it as the app it would be, step to the next, go back to all six, and only
 *  Pick this one makes it the choice. One frame for all six, its sheet
 *  rewritten on every step, so stepping through them is instant. */
function Focus({ project, screen, look, index, count, picked, onBack, onStep, onPick, onGrow }: {
  project: SandboxProject; screen: Screen; look: LookCard; index: number; count: number; picked: boolean
  onBack: () => void; onStep: (by: number) => void; onPick: () => void; onGrow: () => void
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  const observe = useObserved(project, onGrow)
  const [ready, setReady] = useState(false)
  useEffect(() => { const doc = frame.current?.contentDocument; if (ready && doc) writeSheet(doc, project, look.sheet) }, [look.id, look.key, ready]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="looks__focus">
      <div className="looks__focusbar">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onBack}><ChevronLeft size={14} /> All six</button>
        <span className="looks__focusnav">
          <button type="button" className="btn btn--ghost btn--icon" onClick={() => onStep(-1)} aria-label="Previous look" title="Previous look (←)"><ChevronLeft size={15} /></button>
          <span className="looks__name"><span className="looks__dot" style={{ background: look.brand }} />{look.name}</span>
          <span className="looks__what">{look.what}</span>
          <span className="looks__count">{index + 1} of {count}</span>
          <button type="button" className="btn btn--ghost btn--icon" onClick={() => onStep(1)} aria-label="Next look" title="Next look (→)"><ChevronRight size={15} /></button>
        </span>
        <button type="button" className="btn btn--primary btn--sm looks__pick" onClick={onPick}>{picked ? <><Check size={14} /> Picked, tune it</> : 'Pick this one'}</button>
      </div>
      <div className="looks__stage">
        <iframe ref={frame} title={`${look.name}, full size`} src={sandboxUrl(project.id, screen.path, project.base)} sandbox={SANDBOX_FLAGS}
          onLoad={() => { const doc = frame.current?.contentDocument; if (doc) { writeSheet(doc, project, look.sheet); observe(doc); setReady(true) } }} />
      </div>
    </div>
  )
}

export function LookGrid({ project, screen, looks, current, locks, onLocks, onShuffle, onPick, onClose, onGrow }: {
  project: SandboxProject; screen: Screen; looks: LookCard[]; current: string | null
  locks: LookLocks; onLocks: (l: LookLocks) => void; onShuffle: () => void; onPick: (id: string) => void; onClose: () => void
  /** The table grew from a look's frame: the sheets are computed again. */
  onGrow: () => void
}) {
  // The look open at full size, or null for all six.
  const [focus, setFocus] = useState<string | null>(null)
  const at = focus ? looks.findIndex((l) => l.id === focus) : -1
  const step = (by: number) => setFocus(looks[(at + by + looks.length) % looks.length]!.id)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName)
      // Escape steps back: from one look to the six, from the six to the screen
      if (e.key === 'Escape') { if (focus) setFocus(null); else onClose() }
      if (e.code === 'Space' && !typing) { e.preventDefault(); onShuffle() }
      if (focus && !typing && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); step(e.key === 'ArrowLeft' ? -1 : 1) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, onShuffle, focus, at]) // eslint-disable-line react-hooks/exhaustive-deps
  const name = screen.title?.split(' · ')[0] ?? (screen.label === '/' ? 'Your screen' : screen.label)
  return (
    <div className="looks" role="dialog" aria-label="Pick a look">
      <div className="looks__bar">
        <h2 className="looks__title">{name}, six ways</h2>
        <button type="button" className={`btn btn--sm ${locks.font ? 'btn--primary' : 'btn--secondary'}`} aria-pressed={locks.font} onClick={() => onLocks({ ...locks, font: !locks.font })}><Lock size={13} /> Keep my font</button>
        <button type="button" className="btn btn--secondary btn--sm" onClick={onShuffle}><Shuffle size={13} /> Shuffle <kbd>Space</kbd></button>
        {/* no cross: 1 in the bar above goes back to the screen, as Escape does */}
      </div>
      {/* the six stay loaded while one is open, so going back is instant */}
      <div className="looks__grid" hidden={!!focus}>
        {looks.map((l) => <Card key={l.id} project={project} screen={screen} look={l} picked={current === l.id} onOpen={() => setFocus(l.id)} onGrow={onGrow} />)}
      </div>
      {focus && at >= 0 && <Focus project={project} screen={screen} look={looks[at]!} index={at} count={looks.length} picked={current === focus}
        onBack={() => setFocus(null)} onStep={step} onPick={() => onPick(focus)} onGrow={onGrow} />}
      {!focus && <p className="looks__foot">Open one to see it full size, then Pick this one. A look sets {locks.font ? 'corners, spacing and depth around your font' : 'fonts, corners, spacing and depth'} through the knobs and leaves your colour alone: Undo takes it back, and you tune it next.</p>}
    </div>
  )
}
