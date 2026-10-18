/**
 * The third way in: an app that is RUNNING, wherever it runs, through the one
 * script line of public/live.js.
 *
 * It frames the app, hears which kit it runs on, and hands over the app's own
 * design system in that kit's names. It does not turn knobs: the app is on
 * another origin, so there is no stylesheet here to tokenise, and turning a
 * live app is the one-screen layout's job (phase 3). Said on the page, so
 * nobody looks for knobs that are not there.
 */
import { useRef, useState } from 'react'
import { Copy, Check, Download, Plug } from 'lucide-react'
import { liveSnippet, refuseAddress, connectApp, liveExport, type AppHello } from '../kits/bridge'
import { kitPackage } from '../kits/kitExport'
import { zipSync } from '../export/zip'
import DOOR from '../kits/door.json'

type State = { at: 'idle' } | { at: 'connecting' } | { at: 'connected'; hello: AppHello } | { at: 'failed'; why: string }

const kitName = (id: string) => { const k = DOOR.find((d) => d.id === id); return k ? `${k.name}${k.version ? ` ${k.version}` : ''}` : id }

export function LiveAppDoor() {
  const [url, setUrl] = useState('')
  const [state, setState] = useState<State>({ at: 'idle' })
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const snippet = liveSnippet(location.origin)

  const copy = async () => {
    try { await navigator.clipboard.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 1400) } catch { /* the line is on screen to select */ }
  }
  const connect = async () => {
    const r = refuseAddress(url, location.origin)
    if ('why' in r) { setState({ at: 'failed', why: r.why }); return }
    setUrl(r.url); setExportError(null)
    setState({ at: 'connecting' })
    try { setState({ at: 'connected', hello: await connectApp(frame.current!, r.url) }) }
    catch (e) { setState({ at: 'failed', why: e instanceof Error ? e.message : String(e) }) }
  }
  const download = async () => {
    if (state.at !== 'connected' || !state.hello.kit) return
    setBusy(true); setExportError(null)
    try {
      const name = state.hello.title.trim() || new URL(state.hello.href).host
      const files = kitPackage(await liveExport(frame.current!, state.hello.kit, name))
      const blob = zipSync(Object.entries(files).map(([n, text]) => ({ name: n, text })))
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob); a.download = `${name.replace(/[^\w.-]+/g, '-').replace(/^-|-$/g, '') || 'app'}-design-system.zip`
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    } catch (e) { setExportError(e instanceof Error ? e.message : String(e)) }
    setBusy(false)
  }

  const shown = state.at === 'connecting' || state.at === 'connected'
  return (
    <div className="intake__drop intake__drop--repo intake__drop--live">
      <div className="intake__copy">Put this line in your app's <code>&lt;head&gt;</code>, then paste the address it runs on.</div>
      <div className="live__snippet">
        <code>{snippet}</code>
        <button type="button" className="btn btn--secondary btn--sm" onClick={copy}>{copied ? <><Check size={13} strokeWidth={2} /> Copied</> : <><Copy size={13} strokeWidth={2} /> Copy</>}</button>
      </div>
      <form className="intake__repo" onSubmit={(e) => { e.preventDefault(); void connect() }}>
        <input className="intake__input" type="url" placeholder="http://localhost:3000" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="The address your app runs on" spellCheck={false} />
        <button type="submit" className="btn btn--primary" disabled={state.at === 'connecting'}><Plug size={15} strokeWidth={1.75} /> Connect</button>
      </form>

      <p className="live__status" role="status" aria-live="polite">
        {state.at === 'connecting' && 'Waiting for your app to say hello…'}
        {state.at === 'failed' && state.why}
        {state.at === 'connected' && (state.hello.kit
          ? <>Connected · runs on <b>{kitName(state.hello.kit)}</b>.</>
          : <>Connected. This page runs on none of the nine kits as far as it shows, so there is no kit vocabulary to write its design system in. Drop its build instead, and the sandbox reads it directly.</>)}
      </p>

      {state.at === 'connected' && state.hello.kit && (
        <div className="intake__choices">
          <button type="button" className="btn btn--primary" onClick={() => void download()} disabled={busy}><Download size={15} strokeWidth={1.75} /> {busy ? 'Reading your app…' : 'Its design system (.zip)'}</button>
        </div>
      )}
      {exportError && <p className="live__status live__status--error">{exportError}</p>}

      {/* Sandboxed without allow-top-navigation, so the framed app cannot
          navigate this page away. Scripts and its own origin are allowed, or
          its login and its API calls break; an address on THIS origin is
          refused before it gets here (bridge.ts refuseAddress). */}
      <iframe ref={frame} className="live__frame" hidden={!shown} title="Your running app"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals" referrerPolicy="no-referrer" />

      <div className="intake__note">
        Your app stays where it runs. The script answers only this page, and only with the values of the kit variables it is asked for by name, never your markup or your data. Nothing is sent to a server. Turning the knobs on a running app comes with the next version of this screen.
      </div>
    </div>
  )
}
