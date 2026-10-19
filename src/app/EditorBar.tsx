/**
 * The editor's top bar controls (merge phase 3): the Engine (which of the kits
 * the stage shows), Light / Dark, and Share. Undo / redo stay with the knobs,
 * Export stays the one primary button.
 */
import { useEffect, useRef, useState } from 'react'
import { Check, Link2, Moon, Send, Sun } from 'lucide-react'
import DOOR from '../kits/door.json'
import type { KitId } from '../kits/engine/detect.mjs'
import { looks as LOOKS } from '../kits/looks'

const KITS = DOOR.filter((k) => k.renders)
const kitName = (id: string) => DOOR.find((k) => k.id === id)?.name ?? id

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
  return (
    <label className="ebar__engine" title="Which kit the stage shows. Your own app stays what it is: switching loads a kit in its place.">
      <span className="ebar__label">Engine</span>
      <select value={ownApp ? '' : kitId ?? ''} onChange={(e) => { if (e.target.value) onPick(e.target.value) }} aria-label="Engine: the kit on the stage">
        {ownApp && <option value="">{own}</option>}
        {KITS.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
      </select>
    </label>
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
        {said && url && said.startsWith('Link copied') ? <Check size={14} /> : <Link2 size={14} />}<span className="ebar__txt"> Share</span>
      </button>
      {said && <span className="ebar__pop" role="status">{said}</span>}
    </span>
  )
}

/** Look: another kit's own start values on what the stage shows (kits/looks.ts).
 *  Shows the look while the knobs still stand where it put them. */
export function LookSelect({ current, onPick }: { current: string | null; onPick: (id: string) => void }) {
  return (
    <label className="ebar__engine ebar__look" title="Another kit's own start values on what the stage shows: its brand, background, status colours, body font and corners. Undo, Reset and Export treat it like any knob.">
      <span className="ebar__label">Look</span>
      <select value={current ?? ''} onChange={(e) => { if (e.target.value) onPick(e.target.value) }} aria-label="Look: another kit's start values">
        <option value="">{current ? 'Custom' : 'As it is'}</option>
        {LOOKS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
    </label>
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
