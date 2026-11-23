/**
 * Connect a running app (decision 220): top right, one click to the apps that
 * run on this machine. A page on uisandbox.org cannot read localhost itself,
 * so it asks the UISandbox helper (mcp/server.ts startHelper, 127.0.0.1:47319):
 * which dev servers answer, and open one, live, served from the helper's own
 * process. The helper runs inside the MCP server (whenever Claude Code has it)
 * or with `npx uisandbox-mcp start`. Not running: the one line that starts it,
 * and every other way in. Chrome asks once whether this site may reach the
 * local network; allowed, the list appears.
 */
import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Copy, Plug, RefreshCw } from 'lucide-react'

const HELPER = 'http://127.0.0.1:47319'
interface DevApp { url: string; port: number; title: string; fromProject: boolean }
type State = { at: 'looking' } | { at: 'apps'; apps: DevApp[] } | { at: 'none' } | { at: 'opening'; url: string } | { at: 'failed'; why: string }

async function helperApps(): Promise<DevApp[] | null> {
  try {
    const r = await fetch(`${HELPER}/apps`, { signal: AbortSignal.timeout(2500) })
    if (!r.ok) return null
    return ((await r.json()) as { apps: DevApp[] }).apps
  } catch { return null }
}

const useCopy = () => {
  const [copied, setCopied] = useState(false)
  return { copied, copy: async (text: string) => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1400) } catch { /* the text is on screen to select */ } } }
}
/** A carry token is long; on screen its first characters do, the copy is whole. */
const short = (text: string, carry?: string) => (carry ? text.split(carry).join(`${carry.slice(0, 6)}…`) : text)

function CopyLine({ cmd, carry }: { cmd: string; carry?: string }) {
  const { copied, copy } = useCopy()
  return (
    <div className="install__pill connect__line">
      <span className="install__prompt" aria-hidden>$</span>
      <code className="install__cmd">{short(cmd, carry)}</code>
      <button type="button" className="install__copy" aria-label="Copy" title="Copy" onClick={() => void copy(cmd)}>{copied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} />}</button>
    </div>
  )
}

/** For an agent with no uisandbox tools, the line that works is `open --detach`: it finds the app,
 *  opens the user's own browser and returns. An agent that read this menu ran `start` (a process to
 *  keep) and tried the site in its built-in browser, which never reaches localhost (decision 221). */
function AgentLine({ carry }: { carry?: string }) {
  const { copied, copy } = useCopy()
  const prompt = `Open my running app in UISandbox so I can try designs on it. If you have the uisandbox MCP tools, call try_designs${carry ? ` with carry ${carry}` : ''}. If not, run \`npx uisandbox-mcp@latest open${carry ? ` --carry=${carry}` : ''} --detach\`: it finds the app, opens it in my own browser and returns (your built-in browser cannot reach my localhost). When I press Send, show me the patch, and change my files only when I say yes.`
  return (
    <div className="agentprompt__box connect__agent">
      <p className="agentprompt__text">{short(prompt, carry)}</p>
      <button type="button" className="btn btn--secondary btn--sm agentprompt__copy" onClick={() => void copy(prompt)}>{copied ? <><Check size={13} strokeWidth={2.5} /> Copied</> : <><Copy size={13} /> Copy</>}</button>
    </div>
  )
}

export function ConnectMenu({ carry, onOther }: { carry?: string; onOther: () => void }) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<State>({ at: 'looking' })
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  // While open, keep asking: start the helper in a terminal and the list appears.
  useEffect(() => {
    if (!open) return
    let live = true
    const look = async () => { const apps = await helperApps(); if (live) setState((s) => (s.at === 'opening' ? s : apps ? { at: 'apps', apps } : { at: 'none' })) }
    setState({ at: 'looking' }); void look()
    const t = setInterval(() => void look(), 2500)
    return () => { live = false; clearInterval(t) }
  }, [open])
  const connect = async (app: DevApp) => {
    // The tab first, inside the click, or a popup blocker eats it after the await.
    const tab = window.open('about:blank', '_blank')
    setState({ at: 'opening', url: app.url })
    try {
      const r = await fetch(`${HELPER}/open`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: app.url, carry }) })
      const j = (await r.json()) as { url?: string; error?: string }
      if (!j.url) throw new Error(j.error ?? 'The helper could not open it.')
      if (tab) tab.location.href = j.url; else location.href = j.url
      setOpen(false)
    } catch (e) { tab?.close(); setState({ at: 'failed', why: (e as Error).message }) }
  }
  const name = (a: DevApp) => a.title || `localhost:${a.port}`
  return (
    <div className="mcp connect" ref={ref}>
      <button type="button" className={`btn btn--secondary btn--sm app__try ${open ? 'connect__btn--on' : ''}`} onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="dialog">
        <Plug size={14} strokeWidth={2} /><span className="app__try-long">Connect a running app</span><span className="app__try-short">Your app</span><ChevronDown size={12} />
      </button>
      {open && (
        <div className="card mcp__pop connect__pop" role="dialog" aria-label="Connect a running app">
          {state.at === 'looking' && <p className="connect__note"><RefreshCw size={13} className="connect__spin" /> Looking for apps running on this machine…</p>}
          {state.at === 'apps' && (state.apps.length ? (
            <>
              <div className="mcp__head"><b>Running on this machine</b><span>Pick one: it opens live in a new tab, every screen, hot reload kept{carry ? ', with what you turned here' : ''}.</span></div>
              <div className="connect__apps">
                {state.apps.map((a) => (
                  <button key={a.url} type="button" className="menu__item connect__app" onClick={() => void connect(a)}>
                    <span className="connect__dot" /><span className="connect__name">{name(a)}</span><span className="connect__url">localhost:{a.port}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="mcp__head"><b>No app is running yet</b><span>UISandbox is ready, but no dev server answers. Start yours (npm run dev) and it shows up here.</span></div>
          ))}
          {state.at === 'none' && (
            <div className="mcp__head">
              <b>Open your app from your machine</b>
              <span>A web page cannot see your localhost. One line in a terminal finds the app you are running and opens it, live, in a new tab:</span>
              <CopyLine cmd={`npx uisandbox-mcp@latest open${carry ? ` --carry=${carry}` : ''}`} carry={carry} />
              <span>Or let your agent do it (Claude Code, Cursor, Codex): paste this.</span>
              <AgentLine carry={carry} />
              <span>Claude Code? Add it once, and from then on "let me try some designs" is enough:</span>
              <CopyLine cmd="claude mcp add uisandbox -- npx -y uisandbox-mcp@latest" />
              <span className="connect__fine">To pick from this menu instead, run <code>npx uisandbox-mcp@latest start</code> and keep it open; Chrome asks once whether this site may reach your local network. Running and nothing shows (Safari does not let a site ask)? <a href={`${HELPER}/${carry ? `?carry=${carry}` : ''}`} target="_blank" rel="noopener">Open your apps from your machine</a>.</span>
            </div>
          )}
          {state.at === 'opening' && <p className="connect__note"><RefreshCw size={13} className="connect__spin" /> Opening {state.url}…</p>}
          {state.at === 'failed' && <p className="connect__note connect__note--err">{state.why}</p>}
          <button type="button" className="connect__other" onClick={() => { setOpen(false); onOther() }}>Other ways: a zip, a folder, a public repo, or the bookmark</button>
        </div>
      )}
    </div>
  )
}
