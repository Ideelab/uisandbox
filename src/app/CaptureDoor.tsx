/**
 * The tab a bookmarklet opens (`/?capture=1`), before its first screen
 * arrives: what is happening, and, for someone who came here by hand, the
 * bookmarklet to drag; the door links here as its step by step (decision 209).
 *
 * A bookmarklet is dragged, not clicked, and a link styled as a button reads
 * as one to click (Alexander clicked it, and nothing happened). So it looks
 * like a thing to pick up, a drawn bookmarks bar shows where it goes, and a
 * click here says so instead of doing nothing.
 */
import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Bookmark, Check, Copy, GripVertical, X } from 'lucide-react'
import { grab } from '../capture/grab'
import { bookmarklet, consoleLine } from '../capture/receive'

const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** The bookmarklet as a thing to pick up, and the line under it that says
 *  what to do with it (a click here only says "drag me"). */
export function BookmarkletChip({ onDragState }: { onDragState?: (dragging: boolean) => void }) {
  const link = useRef<HTMLAnchorElement>(null)
  const [state, setState] = useState<'idle' | 'clicked' | 'dragging' | 'dropped'>('idle')
  // React refuses a javascript: href (it would be an XSS sink in any other
  // link); this one is ours, so it is set on the element after render.
  useEffect(() => { link.current?.setAttribute('href', bookmarklet(grab.toString(), location.origin)) }, [])
  return (
    <>
      <a ref={link} className="capture__chip" title="Drag me to your bookmarks bar"
        onClick={(e) => { e.preventDefault(); setState('clicked') }}
        onDragStart={() => { setState('dragging'); onDragState?.(true) }}
        onDragEnd={(e) => { setState(e.dataTransfer.dropEffect === 'none' ? 'idle' : 'dropped'); onDragState?.(false) }}>
        <GripVertical size={14} strokeWidth={2} className="capture__grip" />
        <Bookmark size={14} strokeWidth={2} /> Take this screen along
      </a>
      <span className="capture__hint" role="status">
        {state === 'clicked' ? 'Not a button: drag it with the mouse up to the bookmarks bar, then click it on your app.'
          : state === 'dragging' ? 'Drop it on your bookmarks bar.'
          : state === 'dropped' ? 'In your bookmarks bar? Open your app and click it there.'
          : <>No bookmarks bar? Show it with <kbd>{mac ? '⌘' : 'Ctrl'}</kbd> <kbd>{mac ? '⇧' : 'Shift'}</kbd> <kbd>B</kbd>.</>}
      </span>
    </>
  )
}

/** The step by step itself: the drawn bookmarks bar, the two steps, the
 *  console line. On its own page (the tab a bookmarklet opens) and over the
 *  editor (the door's "Step by step"), with a way out in both. */
function CaptureSteps({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const [dragging, setDragging] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(consoleLine(grab.toString(), location.origin)); setCopied(true); setTimeout(() => setCopied(false), 1400) } catch { /* nothing to fall back to: the bookmarklet is the way */ }
  }
  return (
    <div className="card intake__card capture">
      <button type="button" className="btn btn--ghost btn--icon privacy__close" onClick={onClose} aria-label="Close"><X size={15} /></button>
      <h2 className="capture__title">Any screen your browser shows, here in one click</h2>
      <p className="capture__sub">Live, on staging, on localhost, behind a login: if you can open it, it comes along.</p>

      <div className={`capture__bar ${dragging ? 'capture__bar--hot' : ''}`} aria-hidden>
        <div className="capture__chrome"><i /><i /><i /><span className="capture__url" /></div>
        <div className="capture__marks">
          <span className="capture__mark" /><span className="capture__mark" />
          <span className="capture__slot"><Bookmark size={11} strokeWidth={2} /> Take this screen along</span>
        </div>
      </div>
      <div className="capture__arrow" aria-hidden><ArrowUp size={16} strokeWidth={2} /></div>

      <ol className="capture__steps">
        <li>
          <b>Drag this up to your bookmarks bar.</b>
          <BookmarkletChip onDragState={setDragging} />
        </li>
        <li>
          <b>Open your app and click the bookmark there.</b>
          <span className="capture__hint">The screen you see opens in a UISandbox tab. Click it again on the next screen, and it joins the first.</span>
        </li>
      </ol>

      <p className="intake__note">It copies the page as your browser renders it, with its styles, images and fonts. Tab to tab: nothing goes to a server, and no password field is ever copied.</p>
      <p className="intake__note">Does your app block bookmarklets? Paste this into its console instead. <button type="button" className="btn btn--secondary btn--sm" onClick={copy}>{copied ? <><Check size={13} strokeWidth={2} /> Copied</> : <><Copy size={13} strokeWidth={2} /> Copy the console line</>}</button></p>
    </div>
  )
}

/** The door's "Step by step", over the editor: Close, Escape or a click
 *  beside it returns to where you were, knobs and all. */
export function CaptureStepsDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="privacy capture-dialog" role="dialog" aria-modal="true" aria-label="Take this screen along, step by step" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <CaptureSteps onClose={onClose} />
    </div>
  )
}

export function CaptureDoor({ waiting }: { waiting: boolean }) {
  if (waiting) {
    return (
      <div className="intake intake--door"><div className="door"><div className="card intake__card">
        <p className="intake__copy" role="status">Waiting for a screen from your app. Keep its tab open: it is sending what it shows right now.</p>
      </div></div></div>
    )
  }
  // Reached by hand (a link opened in its own tab, or typed): Close leads to
  // the editor, since there is nothing behind this page to return to.
  return (
    <div className="intake intake--door">
      <div className="door">
        <CaptureSteps onClose={() => location.assign('/')} />
      </div>
    </div>
  )
}
