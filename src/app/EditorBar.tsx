/**
 * The editor's top bar controls (merge phase 3): the Engine (which of the kits
 * the stage shows), Light / Dark, and Share. Undo / redo stay with the knobs,
 * Export stays the one primary button.
 */
import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Link2, Moon, Send, Sun } from 'lucide-react'
import DOOR from '../kits/door.json'
import type { KitId } from '../kits/engine/detect.mjs'
import { looks as LOOKS } from '../kits/looks'

const KITS = DOOR.filter((k) => k.renders)
const kitName = (id: string) => DOOR.find((k) => k.id === id)?.name ?? id

/** A field that opens a list, in the app's own menu language (.menu,
 *  .menu__item, the check on the current one) and its own motion, not the
 *  operating system's: the screen picker and the knob rows look this way, and
 *  a native <select> drew macOS's menu beside them. Keyboard: arrows, Enter,
 *  Escape; a click outside closes it. */
function Dropdown({ label, value, display, options, onPick, title, className = '' }: {
  label: string
  value: string
  display: string
  options: Array<{ value: string; label: string; hint?: string; swatch?: string }>
  onPick: (v: string) => void
  title: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    setHi(Math.max(0, options.findIndex((o) => o.value === value)))
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    // A click in the canvas lands in its iframe and never reaches this
    // document; the window losing focus is how that click shows up here.
    const onBlur = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('blur', onBlur)
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('blur', onBlur) }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (v: string) => { setOpen(false); if (v !== value) onPick(v) }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); return }
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setOpen(true); return }
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(options.length - 1, h + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); const o = options[hi]; if (o) choose(o.value) }
  }
  return (
    <div className={`ddm ${className}`} ref={root} onKeyDown={onKey}>
      <button type="button" className="ebar__engine ddm__btn" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open} title={title}>
        <span className="ebar__label">{label}</span>
        <span className="ddm__value">{display}</span>
        <ChevronDown size={13} strokeWidth={2} className="ddm__chev" />
      </button>
      {open && (
        <div className="menu menu--pop ddm__menu" role="listbox" aria-label={label}>
          {options.map((o, i) => (
            <button key={o.value || '_'} type="button" role="option" aria-selected={o.value === value} className={`menu__item ddm__item ${o.value === value ? 'menu__item--on' : ''} ${i === hi ? 'ddm__item--hi' : ''}`} style={{ ['--stagger-i' as string]: Math.min(i, 6) }} onMouseEnter={() => setHi(i)} onClick={() => choose(o.value)}>
              {o.swatch && <span className="ddm__swatch" style={{ background: o.swatch }} aria-hidden />}
              <span className="fmopt__text"><span className="fmopt__label">{o.label}</span>{o.hint && <span className="fmopt__sub ddm__hint">{o.hint}</span>}</span>
              {o.value === value && <Check size={14} strokeWidth={2.5} className="fmopt__check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Which kit is on the stage, and the others one pick away. On your own app it
 *  says which kit the page runs on, as measured, or that it runs on none. */
export function EngineSelect({ kitId, ownApp, detected, onPick }: {
  kitId?: string
  ownApp: boolean
  /** The kit detection read off the rendered page (coverage), or null. */
  detected?: KitId | null
  onPick: (id: string) => void
}) {
  const own = ownApp ? (detected ? `Your app · runs on ${kitName(detected)}` : detected === null ? 'Your app · none of the nine' : 'Your app') : ''
  const options = [...(ownApp ? [{ value: '', label: own }] : []), ...KITS.map((k) => ({ value: k.id, label: k.name, hint: k.version ? `v${k.version}, from its own package` : 'from its own registry' }))]
  return (
    <Dropdown label="Kit" value={ownApp ? '' : kitId ?? ''} display={ownApp ? 'Your app' : kitName(kitId ?? '')} options={options} onPick={(v) => { if (v) onPick(v) }}
      title="The UI kit on the canvas, built from its own package. Your own app stays what it is: picking a kit loads it in its place." />
  )
}

/** Light / Dark, through the page's OWN scheme: the same switch as the Dark
 *  mode knob, shown only when the CSS has a scheme to switch. */
export function SchemeSwitch({ value, onChange }: { value: 'light' | 'dark'; onChange: (v: 'light' | 'dark') => void }) {
  return (
    <div className="seg ebar__scheme" role="group" aria-label="Colour scheme">
      <button type="button" className={`seg__opt ${value === 'light' ? 'seg__opt--on' : ''}`} aria-pressed={value === 'light'} onClick={() => onChange('light')} title="Light"><Sun size={13} strokeWidth={2} /></button>
      <button type="button" className={`seg__opt ${value === 'dark' ? 'seg__opt--on' : ''}`} aria-pressed={value === 'dark'} onClick={() => onChange('dark')} title="Dark"><Moon size={13} strokeWidth={2} /></button>
    </div>
  )
}

/** A link that opens the same build with the same knobs. A build dropped from
 *  somebody's machine has no address, and the button says so instead of
 *  copying a link that would open something else. */
export function ShareButton({ url }: { url: string | null }) {
  const [said, setSaid] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const say = (s: string, ms: number) => { setSaid(s); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setSaid(null), ms) }
  const share = async () => {
    if (!url) { say('Your app came from your own machine, so there is no address to send. A link carries the knobs only for a build that has one: a public repo, or a zip URL.', 6000); return }
    try { await navigator.clipboard.writeText(url); say('Link copied: the same build, with these knobs.', 2200) }
    catch { say(url, 8000) }
  }
  return (
    <span className="ebar__share">
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => void share()} title="Copy a link to this build with these knobs">
        {said && url && said.startsWith('Link copied') ? <Check size={14} /> : <Link2 size={14} />} Copy link
      </button>
      {said && <span className="ebar__pop" role="status">{said}</span>}
    </span>
  )
}

/** Look: another kit's own start values on what the stage shows (kits/looks.ts).
 *  Shows the look while the knobs still stand where it put them. */
export function LookSelect({ current, onPick }: { current: string | null; onPick: (id: string) => void }) {
  const display = current ? `${LOOKS.find((l) => l.id === current)?.name ?? current} look` : current === '' ? 'Custom' : 'None'
  // What each look sets, in its own values: specific, so the list can be read.
  const fam = (stack?: string) => { const f = (stack ?? '').split(',')[0]!.trim().replace(/^["']|["']$/g, ''); return !f ? '' : /^(system-ui|-apple-system|blinkmacsystemfont|ui-sans-serif|sans-serif)$/i.test(f) ? 'system font' : f }
  const hint = (v: (typeof LOOKS)[number]['values']) => [v.brand, fam(v.fontBody), v.radius && `${v.radius} corners`].filter(Boolean).join(' · ')
  const options = [{ value: '', label: current ? 'Custom' : 'None', hint: 'the canvas as it stands' }, ...LOOKS.map((l) => ({ value: l.id, label: `${l.name} look`, hint: hint(l.values), swatch: l.values.brand }))]
  return (
    <Dropdown className="ebar__look" label="Preset" value={current ?? ''} display={display} options={options} onPick={(v) => { if (v) onPick(v) }}
      title="A preset: another kit's own start values (brand, background, status colours, body font, corners) on what the canvas shows. Undo, Reset and Export treat it like any knob." />
  )
}

/** Send: the user is done, and what they turned goes back to whoever opened
 *  this sandbox on their machine (an agent through the MCP server, or the
 *  terminal that ran `npx uisandbox-mcp open`). Only there: on uisandbox.org
 *  there is nobody to send to. */
export function SendButton({ to, onSend }: { to: 'agent' | 'terminal'; onSend: () => Promise<{ waiting: number } | null> }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const [note, setNote] = useState<string | null>(null)
  const send = async () => {
    setState('sending')
    const r = await onSend()
    if (!r) { setState('failed'); setNote('Could not reach the local server. Is the command that opened this still running?'); return }
    setState('sent')
    setNote(to === 'terminal'
      ? 'Sent: it is printed in the terminal that opened this. Keep turning and send again, or close this tab.'
      : r.waiting ? 'Sent to your agent: it has it now. Keep turning and send again, or close this tab.' : 'Sent. Your agent picks it up when it asks (wait_for_send). Keep turning and send again, or close this tab.')
  }
  return (
    <span className="ebar__share">
      <button type="button" className="btn btn--primary btn--sm" onClick={() => void send()} disabled={state === 'sending'} title={to === 'terminal' ? 'Print what you turned, and the patch, in the terminal' : 'Hand what you turned, and the patch, back to your agent'}>
        {state === 'sent' ? <Check size={14} /> : <Send size={14} />} {to === 'terminal' ? 'Send to the terminal' : 'Send to your agent'}
      </button>
      {note && <span className="ebar__pop" role="status">{note}</span>}
    </span>
  )
}
