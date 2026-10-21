import { DropGlyph } from './Mark'
import { useEffect, useRef, useState } from 'react'
import { FileArchive, FolderOpen, GitBranch, Check, Copy, ShieldCheck, X, Bookmark, Plug } from 'lucide-react'
import { archiveFromFiles, isZip, openZip, type Archive } from '../audit/intake/readZip'
import { filesFromDrop } from '../audit/intake/readFiles'
import { STAGES, fmtBytes, type Progress } from './progress'

interface DoorProps {
  onArchive: (archive: Archive) => void
  /** A zip by URL — the repo route (App fetches, through the proxy when needed). */
  onUrl?: (url: string) => void
  /** A sample build shipped with the site (same origin) — for the visitor without a zip at hand. */
  onSample?: (path: string) => void
  busy: Progress | null
  error: string | null
  /** Over a kit, the door closes back to it: the cross top right, as every card has, and Escape. */
  onClose?: () => void
  /** No kit stands behind the door (a load failed): offer the kits here too. */
  standalone?: boolean
  /** What was turned on the kit, for the command line (state/carry.ts). */
  carry?: { token: string; kit: string; names: string[] } | null
}
type Way = 'zip' | 'folder' | 'repo' | 'live'

/** Three real open-source builds (MIT) served from this origin — names people know, with colour everywhere the knobs reach. */
import DOOR from '../kits/door.json'
import { BookmarkletChip, CaptureStepsDialog } from './CaptureDoor'
import { LiveAppDoor } from './LiveAppDoor'

const SAMPLES = [
  { path: '/samples/bootstrap-docs.zip', label: 'Bootstrap docs', title: 'getbootstrap.com: the Bootstrap 5.3 docs build (114 screens, 8 MB)' },
  { path: '/samples/vitepress-site.zip', label: 'VitePress site', title: 'vitepress.dev (259 screens, 5 MB)' },
  { path: '/samples/sb-admin-dashboard.zip', label: 'Admin dashboard', title: 'Start Bootstrap SB Admin 2 (13 screens, 6 MB)' },
]

/**
 * The door: "Try it on your own app", a takeover over the kit (decision 217),
 * and what a failed load falls back to; the story around it lives on /about.
 *
 * One way first: the app a builder has running, through one line in their
 * project (`npx uisandbox-mcp open http://localhost:3000`), live, every
 * screen, served from 127.0.0.1, with what was turned on the kit in the line.
 * A page on uisandbox.org cannot read their localhost itself: the dev server
 * sends no CORS for another origin, which is what the line is for. Then, for
 * who has no terminal or no localhost (Lovable, v0, Bolt, a login), the
 * bookmarklet (decision 209), and a build read into this tab (zip, folder,
 * repo), which the samples, Share links and agents' `?load=` still need.
 */
export function Door({ onArchive, onUrl, onSample, busy, error, standalone, onClose, carry }: DoorProps) {
  const [way, setWay] = useState<Way>('zip')
  const [more, setMore] = useState<'bookmark' | 'build' | null>(error || standalone ? 'build' : null)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showSteps, setShowSteps] = useState(false)
  const [over, setOver] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [repo, setRepo] = useState('')
  // The dev server's address: the line and the agent prompt both carry it.
  const [addr, setAddr] = useState('localhost:3000')
  const zipRef = useRef<HTMLInputElement>(null)
  const dirRef = useRef<HTMLInputElement>(null)
  // Escape closes the door, unless a card opened from it is up: that one closes first.
  useEffect(() => {
    if (!onClose || showPrivacy || showSteps) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, showPrivacy, showSteps])

  const takeFiles = async (files: File[]) => {
    setLocalError(null)
    try {
      if (files.length === 1 && isZip(files[0]!)) onArchive(await openZip(files[0]!))
      else if (files.length) onArchive(archiveFromFiles(files))
    } catch (err) { setLocalError((err as Error).message) }
  }
  const submitRepo = () => {
    setLocalError(null)
    const m = repo.trim().match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/(?:tree|commits?)\/([\w./-]+))?\/?$/i)
    const gl = repo.trim().match(/^(?:https?:\/\/)?(?:www\.)?gitlab\.com\/([\w./-]+?)(?:\.git)?(?:\/-\/(?:tree|commits?)\/([\w./-]+))?\/?$/i)
    if (m) onUrl?.(`https://github.com/${m[1]}/${m[2]}${m[3] ? `/tree/${m[3]}` : ''}`)
    else if (gl) onUrl?.(`https://gitlab.com/${gl[1]!.replace(/\/$/, '')}${gl[2] ? `/-/tree/${gl[2]}` : ''}`)
    else setLocalError('Paste a public GitHub or GitLab repository URL, like https://github.com/user/repo (a branch path is fine).')
  }

  const ways: Array<{ id: Way; label: React.ReactNode; icon: React.ReactNode }> = [
    { id: 'zip', label: <><span className="intake__way-long">Upload a </span>zip</>, icon: <FileArchive size={14} strokeWidth={1.75} /> },
    { id: 'folder', label: <><span className="intake__way-long">Upload a </span>codebase</>, icon: <FolderOpen size={14} strokeWidth={1.75} /> },
    { id: 'repo', label: <><span className="intake__way-long">Connect a </span>repo</>, icon: <GitBranch size={14} strokeWidth={1.75} /> },
    // Deployed somewhere, with one script line: its design system, no knobs (LiveAppDoor).
    { id: 'live', label: <><span className="intake__way-long">A </span>running app</>, icon: <Plug size={14} strokeWidth={1.75} /> },
  ]
  return (
    <div className="intake intake--door">
      {showPrivacy && <PrivacyCard onClose={() => setShowPrivacy(false)} />}
      {showSteps && <CaptureStepsDialog onClose={() => setShowSteps(false)} />}
      <div className="door">
      <div className="card intake__card door__card">
        <div className="door__bar">
          <h2>Try it on your own app</h2>
          <BringSteps at={1} />
          {onClose && <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Close" title="Back to the kit"><X size={15} /></button>}
        </div>

        {/* A failed load says why first, above every way to try again. */}
        {error && !busy && <div className="intake__error intake__error--top">{error}</div>}
        {busy ? (
          <div className="bring"><LoadStages busy={busy} /></div>
        ) : (
          <div className="bring">
            {/* One way first (Alexander): the app a builder has running,
                live, every screen. The others are for who has no terminal. */}
            <div className="bring__head">
              <h3>Open your app here, live</h3>
              <p>Run this in your project, next to your dev server. Every screen comes along, clickable, with hot reload.</p>
            </div>
            <LocalCommand addr={addr} setAddr={setAddr} carry={carry?.token} />
            <AgentPrompt addr={addr} carry={carry?.token} />
            <p className="bring__fine">A new tab opens with your app in it, served from <code>127.0.0.1</code>: your code never leaves your machine, not even to this site. Without an address the line finds your build (<code>dist/</code>, <code>build/</code>, <code>out/</code>). Needs Node 20.{carry ? ` What you turned on ${carry.kit} goes along in the line: ${carry.names.join(', ')}.` : ''}</p>
            <div className="bring__else">
              <span>No terminal, or not on localhost?</span>
              <div className="bring__links">
                <button type="button" className={`bring__link ${more === 'bookmark' ? 'bring__link--on' : ''}`} aria-expanded={more === 'bookmark'} onClick={() => setMore(more === 'bookmark' ? null : 'bookmark')}><Bookmark size={14} strokeWidth={1.75} /> Take a screen along with a bookmark</button>
                <button type="button" className={`bring__link ${more === 'build' ? 'bring__link--on' : ''}`} aria-expanded={more === 'build'} onClick={() => setMore(more === 'build' ? null : 'build')}><FileArchive size={14} strokeWidth={1.75} /> Bring a zip, a folder, a public repo or a running app</button>
              </div>
              <span className="bring__hint">Lovable, v0 or Bolt: open your app's preview and use the bookmark there.</span>
            </div>
            {more === 'bookmark' && <section className="way way--main way--capture bring__more">
              <p>Drag <b>Take this screen along</b> to your bookmarks bar, open your app (live, staging, localhost, behind a login) and click it. Your browser copies the screen into a UISandbox tab; click it on another page and that one joins it. Nothing goes to a server.</p>
              <div className="way__chip"><BookmarkletChip /></div>
              <p className="way__fine"><a href="/?capture=1" onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); setShowSteps(true) }}>Step by step</a></p>
            </section>}
            {more === 'build' && <div className="bring__more">
            <div className="intake__ways" role="tablist">
              {ways.map((w) => (
                <button key={w.id} type="button" role="tab" aria-selected={way === w.id} className={`intake__way ${way === w.id ? 'intake__way--on' : ''}`} onClick={() => { setWay(w.id); setLocalError(null) }}>{w.icon} {w.label}</button>
              ))}
            </div>
            {way === 'live' ? <LiveAppDoor /> : way !== 'repo' ? (
              <div
                className={`intake__drop ${over ? 'intake__drop--over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setOver(true) }}
                onDragLeave={() => setOver(false)}
                onDrop={async (e) => {
                  e.preventDefault(); setOver(false)
                  const dropped = Array.from(e.dataTransfer.files || [])
                  if (dropped.length === 1 && isZip(dropped[0]!)) { void takeFiles(dropped); return }
                  const files = await filesFromDrop(e.dataTransfer.items)
                  void takeFiles(files.length ? files : dropped)
                }}
              >
                <svg className="intake__ants" aria-hidden="true">
                  <rect className="intake__ants-dash" x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)" rx="12" ry="12" />
                  {/* a light that travels the edge: pathLength normalises the dash to any size */}
                  <rect className="intake__glow intake__glow--halo" x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)" rx="12" ry="12" pathLength={1000} />
                  <rect className="intake__glow intake__glow--head" x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)" rx="12" ry="12" pathLength={1000} />
                </svg>
                <DropGlyph kind={way === 'zip' ? 'zip' : 'folder'} />
                {way === 'zip' ? (
                  <>
                    <div className="intake__copy">Drop your <b>.zip</b> here. Its <code>dist/</code>, <code>build/</code> or <code>out/</code> folder, or a whole repo that carries the build inside.</div>
                    <div className="intake__safe">A copy is read into this tab. Your folder is never touched.</div>
                    <div className="intake__choices"><button type="button" className="btn btn--primary" onClick={() => zipRef.current?.click()}><FileArchive size={15} strokeWidth={1.75} /> Choose a zip</button></div>
                  </>
                ) : (
                  <>
                    <div className="intake__copy">Drop a <b>folder</b> here. The build folder renders 1:1; a source folder is read for the knob stand only.</div>
                    <div className="intake__safe">Read once, into this tab. Nothing is ever written back to it.</div>
                    <div className="intake__choices"><button type="button" className="btn btn--primary" onClick={() => dirRef.current?.click()}><FolderOpen size={15} strokeWidth={1.75} /> Choose a folder</button></div>
                  </>
                )}
              </div>
            ) : (
              <div className="intake__drop intake__drop--repo">
                <div className="intake__copy">Paste a <b>public</b> GitHub or GitLab repository. Its default branch (or a <code>/tree/branch</code> URL) is fetched as a zip and loaded here.</div>
                <form className="intake__repo" onSubmit={(e) => { e.preventDefault(); submitRepo() }}>
                  <input className="intake__input" type="url" placeholder="https://github.com/user/repo" value={repo} onChange={(e) => setRepo(e.target.value)} aria-label="GitHub or GitLab repository URL" spellCheck={false} />
                  <button type="submit" className="btn btn--primary"><GitBranch size={15} strokeWidth={1.75} /> Load</button>
                </form>
                <div className="intake__note">GitHub and GitLab do not allow the browser to fetch a repo zip directly, so the URL goes through uisandbox.org to fetch it. Public repos only, nothing stored. Everything else stays in your browser.</div>
              </div>
            )}
            {(way === 'zip' || way === 'folder') && (
              <button type="button" className="intake__privacy" onClick={() => setShowPrivacy(true)}>
                <ShieldCheck size={13} strokeWidth={2} /> Loaded into this tab, never sent to a server. No database, no account, no analytics. <u>How to verify</u>
              </button>
            )}
            {onSample && (<>
              <div className="intake__samples">
                <span>No build at hand? Try a sample:</span>
                {SAMPLES.map((x) => <button key={x.path} type="button" className="intake__sample" onClick={() => onSample(x.path)} title={x.title}>{x.label}</button>)}
              </div>
              {/* The kit door. Each is a build made from that kit's own package
                  (scripts/kit-builds.mjs): its classes, its compiled CSS, its
                  published defaults, so ×1 reads as "as the kit ships it".
                  Behind a kit the Engine menu has them; here only when no kit
                  stands behind the door. */}
              {standalone && <div className="intake__samples">
                <span>Or start from a kit:</span>
                {DOOR.filter((k) => k.renders).map((k) => (
                  <button key={k.id} type="button" className="intake__sample" onClick={() => onSample(`/kits/${k.id}.zip`)}
                    title={`${k.name}${k.version ? ` ${k.version}` : ''}: seven screens in its own components and its own defaults`}>{k.name}</button>
                ))}
              </div>}
            </>)}
            </div>}
            <input ref={zipRef} type="file" accept=".zip,application/zip" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void takeFiles([f]); e.target.value = '' }} />
            <input ref={dirRef} type="file" hidden {...({ webkitdirectory: '', directory: '' } as Record<string, string>)} onChange={(e) => { const fs = Array.from(e.target.files ?? []); if (fs.length) void takeFiles(fs); e.target.value = '' }} />
          </div>
        )}
        {localError && <div className="intake__error">{localError}</div>}
      </div>
      </div>
    </div>
  )
}

/** Where the takeover is: what you bring, what was read from it, the six.
 *  The last step is the editor itself, so the flow ends where work starts. */
export function BringSteps({ at }: { at: 1 | 2 | 3 }) {
  return (
    <ol className="bring__steps" aria-label="Steps">
      {['Bring it', 'What we found', 'Six ways'].map((label, i) => (
        <li key={label} className={i + 1 === at ? 'bring__step--on' : i + 1 < at ? 'bring__step--done' : ''} aria-current={i + 1 === at ? 'step' : undefined}>
          <span className="bring__n">{i + 1 < at ? <Check size={10} strokeWidth={3} /> : i + 1}</span>{label}
        </li>
      ))}
    </ol>
  )
}

/** The one line to run: with a dev server's address in it, live mode (the
 *  running app, hot reload included); without one, the build. The address is
 *  only put into the line; nothing here connects to it. */
const addrUrl = (addr: string) => {
  const clean = addr.trim().replace(/\/+$/, '')
  const ok = !clean || /^(https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\]|[\w-]+\.(localhost|test))(:\d+)?(\/[^\s]*)?$/i.test(clean)
  return { ok, url: clean && ok ? (/^https?:/i.test(clean) ? clean : `http://${clean}`) : '' }
}
const useCopy = () => {
  const [copied, setCopied] = useState(false)
  return { copied, copy: async (text: string) => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1400) } catch { /* the text is on screen to select */ } } }
}

function LocalCommand({ addr, setAddr, carry }: { addr: string; setAddr: (a: string) => void; carry?: string }) {
  const { copied, copy } = useCopy()
  const { ok, url } = addrUrl(addr)
  const cmd = `npx uisandbox-mcp open${url ? ` ${url}` : ''}${carry ? ` --carry=${carry}` : ''}`
  return (
    <div className="localcmd">
      <input className="intake__input" type="text" inputMode="url" placeholder="your dev server, e.g. localhost:5173 (empty: your build)" value={addr} onChange={(e) => setAddr(e.target.value)} aria-label="Your dev server's address, if it is running" spellCheck={false} />
      <div className="install install--compact">
        <div className="install__pill">
          <span className="install__prompt" aria-hidden>$</span>
          <code className="install__cmd">{cmd}</code>
          <button type="button" className="install__copy" onClick={() => void copy(cmd)} aria-label="Copy" title="Copy">{copied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} />}</button>
        </div>
      </div>
      {!ok && <p className="way__fine">That is not a local address. Live mode is for an app running on your own machine (localhost, 127.0.0.1, *.localhost, *.test).</p>}
    </div>
  )
}

/** The same, for an agent (Claude Code, Cursor, Codex): one paste that works
 *  whether or not it has the uisandbox MCP tools. With them it loads, opens
 *  and waits for Send; without, it runs the line in the background, where
 *  Send prints the patch (decision 217; "open this app in UISandbox" alone
 *  assumed the tools and named no address). */
function AgentPrompt({ addr, carry }: { addr: string; carry?: string }) {
  const { copied, copy } = useCopy()
  const { url } = addrUrl(addr)
  const what = url ? `my running app at ${url}` : "this project's build"
  const prompt = `Open ${what} in UISandbox so I can tune its design in the browser. If you have the uisandbox MCP tools, load it, open it${carry ? ` with carry ${carry}` : ''} and call wait_for_send. If not, run \`npx -y uisandbox-mcp open${url ? ` ${url}` : ''}${carry ? ` --carry=${carry}` : ''}\` in the background and keep its output. When I press Send, apply the patch you get to my source files.`
  return (
    <div className="agentprompt">
      <p className="agentprompt__q">Or let your agent do it: paste this in Claude Code, Cursor or Codex.</p>
      <div className="agentprompt__box">
        <p className="agentprompt__text">{prompt}</p>
        <button type="button" className="btn btn--secondary btn--sm agentprompt__copy" onClick={() => void copy(prompt)}>{copied ? <><Check size={13} strokeWidth={2.5} /> Copied</> : <><Copy size={13} /> Copy prompt</>}</button>
      </div>
    </div>
  )
}

/** What the load is doing, with its numbers: in the door, and in the editor's
 *  own skeleton while the first screen comes in. */
export function LoadStages({ busy }: { busy: Progress }) {
  return (
    <ol className="intake__stages" aria-live="polite">
      {STAGES.filter((s) => s.id !== 'fetch' || busy.fromUrl).map((s) => {
        const idx = STAGES.findIndex((x) => x.id === s.id), cur = STAGES.findIndex((x) => x.id === busy.stage)
        const state = idx < cur ? 'done' : idx === cur ? 'now' : 'next'
        let detail = ''
        if (state === 'now') {
          if (busy.stage === 'fetch') detail = busy.size ? `${fmtBytes(busy.bytes ?? 0)} of ${fmtBytes(busy.size)} from ${busy.what}` : `${fmtBytes(busy.bytes ?? 0)} from ${busy.what}`
          if (busy.stage === 'read') detail = `${busy.done ?? 0} / ${busy.total ?? 0} files · ${fmtBytes(busy.bytes ?? 0)} of CSS`
          if (busy.stage === 'derive') detail = `${busy.total ?? 0} values → the knobs on the stand of your code`
          if (busy.stage === 'open') detail = 'first paint…'
        }
        return (
          <li key={s.id} className={`intake__stage intake__stage--${state}`}>
            <span className="intake__stage-dot" aria-hidden>{state === 'done' ? <Check size={11} strokeWidth={3} /> : null}</span>
            <span className="intake__stage-label">{s.label}</span>
            {detail && <span className="intake__stage-detail">{detail}</span>}
          </li>
        )
      })}
    </ol>
  )
}

/** The claim, verifiable: what leaves the tab (nothing), and three checks a
 *  sceptic can run in a minute. Every line here is something a reader can go
 *  and check, which is the only reason it is safe to write it down. */
export function PrivacyCard({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="privacy" role="dialog" aria-modal="true" aria-label="How your files stay private" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="card privacy__card">
        <button type="button" className="btn btn--ghost btn--icon privacy__close" onClick={onClose} aria-label="Close"><X size={15} /></button>
        <h3><ShieldCheck size={16} strokeWidth={2} /> Your files never leave your browser</h3>
        <p>There is no server behind the sandbox, no account, no cookies and no analytics. Your files are read here, in the page, and served to the sandbox frame by a service worker on this origin. Exports are generated here too.</p>
        <p><b>You don't have to take my word for it:</b></p>
        <ul>
          <li><b>Watch the network tab</b> while you drop, turn knobs and export: no request carries your bytes anywhere.</li>
          <li><b>Go offline.</b> Load the page, switch off your network, then drop the zip: everything still works, because nothing needed the network.</li>
          <li><b>Read the code.</b> It is open source (MIT): <a href="https://github.com/Ideelab/uisandbox/blob/main/src/sandbox/host.ts" target="_blank" rel="noopener">the file that serves your files</a> and <a href="https://github.com/Ideelab/uisandbox/blob/main/notes/security.md" target="_blank" rel="noopener">the full security note</a>, including what a hostile archive can and cannot do here.</li>
        </ul>
        <p className="privacy__fine">The one exception, said plainly: <em>Connect a repo</em> sends that public GitHub/GitLab URL through uisandbox.org, because neither host lets a browser fetch an archive directly. Nothing is stored. Drop a zip or a folder and not even that leaves your browser.</p>
      </div>
    </div>
  )
}

