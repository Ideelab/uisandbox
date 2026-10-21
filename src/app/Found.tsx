/**
 * What we found (decision 217): the second step of Try it on your own app,
 * once the app is in. What was read from it, in four numbers a maker can
 * check, and the one choice there is to make: start from the app as it is, or
 * bring what was turned on the kit. Asked only when something was turned.
 * Then the six, which is where the flow ends and the editor takes over.
 */
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import DOOR from '../kits/door.json'
import { BringSteps } from './Intake'

export interface FoundFacts {
  name: string
  /** The kit the page runs on, read from the rendered page; null for none, undefined while measuring. */
  kit: string | null | undefined
  screens: number
  values: number
  brand: string
  font: string
}

const kitLabel = (id: string) => DOOR.find((k) => k.id === id)?.name ?? id

export function Found({ facts, carry, onDone }: {
  facts: FoundFacts
  /** What was turned on the kit: its name and the knobs, by label. */
  carry: { from: string; names: string[] } | null
  /** bring: put the kit's knobs on; six: open the six (else the one screen). */
  onDone: (bring: boolean, six: boolean) => void
}) {
  const [bring, setBring] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDone(bring, false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [bring, onDone])
  const font = facts.font.replace(/^Custom: /, '')
  return (
    <div className="stage__door" role="dialog" aria-modal="true" aria-label="What we found">
      <div className="intake intake--door">
        <div className="door">
          <div className="card intake__card door__card">
            <div className="door__bar">
              <h2>Try it on your own app</h2>
              <BringSteps at={2} />
              <button type="button" className="btn btn--ghost btn--icon" onClick={() => onDone(bring, false)} aria-label="Close" title="To the editor"><X size={15} /></button>
            </div>
            <div className="bring">
              <div className="bring__head">
                <h3>{facts.kit ? `Your app runs on ${kitLabel(facts.kit)}` : 'Your app is in'}</h3>
                <p>Read in this tab from {facts.name}. Nothing turned yet: what you see is your own CSS, its literals replaced by variables holding the very same values.</p>
              </div>
              <dl className="found__facts">
                <div><dt>{facts.screens}</dt><dd>screen{facts.screens === 1 ? '' : 's'}</dd></div>
                <div><dt>{facts.values}</dt><dd>values the knobs reach</dd></div>
                <div><dt><span className="found__swatch" style={{ background: facts.brand }} />{facts.brand}</dt><dd>your brand</dd></div>
                <div><dt>{font}</dt><dd>your type</dd></div>
              </dl>
              {carry && (
                <fieldset className="found__carry">
                  <legend>You turned {carry.names.length} knob{carry.names.length === 1 ? '' : 's'} on {carry.from}. Bring {carry.names.length === 1 ? 'it' : 'them'}?</legend>
                  <label className={`found__opt ${!bring ? 'found__opt--on' : ''}`}>
                    <input type="radio" name="carry" checked={!bring} onChange={() => setBring(false)} />
                    <b>Start from your app as it is</b>
                    <span>Every knob where your code puts it. The six start from your own values.</span>
                  </label>
                  <label className={`found__opt ${bring ? 'found__opt--on' : ''}`}>
                    <input type="radio" name="carry" checked={bring} onChange={() => setBring(true)} />
                    <b>Bring what you tuned on the kit</b>
                    <span>{carry.names.join(', ')}, on your app. Reset puts it all back.</span>
                  </label>
                </fieldset>
              )}
              <div className="found__go">
                <button type="button" className="btn btn--secondary" onClick={() => onDone(bring, false)}>Tune it directly</button>
                <button type="button" className="btn btn--primary" onClick={() => onDone(bring, true)}>See it six ways</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
