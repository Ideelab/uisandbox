import { DropGlyph } from './Mark'
import { useEffect, useRef, useState } from 'react'
import { FileArchive, FolderOpen, GitBranch, Check, Copy, ShieldCheck, X, Plug, ChevronRight, Laptop, Bookmark } from 'lucide-react'
import { archiveFromFiles, isZip, openZip, type Archive } from '../audit/intake/readZip'
import { filesFromDrop } from '../audit/intake/readFiles'
import { STAGES, fmtBytes, type Progress } from './progress'
import { InstallLine } from './InstallLine'

interface DoorProps {
  onArchive: (archive: Archive) => void
  /** A zip by URL — the repo route (App fetches, through the proxy when needed). */
  onUrl?: (url: string) => void
  /** A sample build shipped with the site (same origin) — for the visitor without a zip at hand. */
  onSample?: (path: string) => void
  busy: Progress | null
  error: string | null
  /** Said when knobs were turned on the kit behind the door: they come along. */
  carryNote?: string
  /** No kit stands behind the door (a load failed): offer the kits here too. */
  standalone?: boolean
}
type Way = 'zip' | 'folder' | 'repo'

/** Three real open-source builds (MIT) served from this origin — names people know, with colour everywhere the knobs reach. */
import DOOR from '../kits/door.json'
import { LiveAppDoor } from './LiveAppDoor'
import { BookmarkletChip, CaptureStepsDialog } from './CaptureDoor'

const SAMPLES = [
  { path: '/samples/bootstrap-docs.zip', label: 'Bootstrap docs', title: 'getbootstrap.com: the Bootstrap 5.3 docs build (114 screens, 8 MB)' },
  { path: '/samples/vitepress-site.zip', label: 'VitePress site', title: 'vitepress.dev (259 screens, 5 MB)' },
  { path: '/samples/sb-admin-dashboard.zip', label: 'Admin dashboard', title: 'Start Bootstrap SB Admin 2 (13 screens, 6 MB)' },
]

/**
 * The door: the empty state of the stage's "Your app" tab, and what a failed
 * load falls back to; the story around it lives on /about.
 *
 * First the easiest way (decision 209): a bookmarklet that copies the screen
 * the visitor's own browser shows into a UISandbox tab, any app, any address,
 * logged in or not, tab to tab. Then in the order people trust it (decision
 * 197): the way where nothing leaves their machine at all, one command in their project, the sandbox
 * served from 127.0.0.1. Then the running app, one script line. Then, folded
 * away, loading a build into this page (zip, folder, repo): it never leaves
 * the tab either, but "drop your code on a website" is what people hear, and
 * the samples, Share links and agents' `?load=` still need it.
 */
export function Door({ onArchive, onUrl, onSample, busy, error, carryNote, standalone }: DoorProps) {
  const [way, setWay] = useState<Way>('zip')
  const [more, setMore] = useState<'running' | 'build' | null>(error || standalone ? 'build' : null)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showSteps, setShowSteps] = useState(false)
  const [over, setOver] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [repo, setRepo] = useState('')
  const zipRef = useRef<HTMLInputElement>(null)
  const dirRef = useRef<HTMLInputElement>(null)

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
  ]
  const fold = (id: 'running' | 'build', title: string, sub: string, icon: React.ReactNode) => (
    <button type="button" className={`way__fold ${more === id ? 'way__fold--open' : ''}`} aria-expanded={more === id} onClick={() => setMore(more === id ? null : id)}>
      <span className="way__icon">{icon}</span>
      <span className="way__text"><b>{title}</b><span>{sub}</span></span>
      <ChevronRight size={15} className="way__chev" />
    </button>
  )

  return (
    <div className="intake intake--door">
      {showPrivacy && <PrivacyCard onClose={() => setShowPrivacy(false)} />}
      {showSteps && <CaptureStepsDialog onClose={() => setShowSteps(false)} />}
      <div className="door">
      <div className="card intake__card">

        {/* A failed load says why first, above every way to try again. */}
        {error && !busy && <div className="intake__error intake__error--top">{error}</div>}
        {busy ? (
          <LoadStages busy={busy} />
        ) : (
          <>
            {carryNote && <p className="intake__carry">{carryNote}</p>}
            <section className="way way--main way--capture">
              <h3><Bookmark size={16} strokeWidth={1.75} /> Any screen your browser shows, here in one click</h3>
              <p>Drag <b>Take this screen along</b> to your bookmarks bar, open your app (live, on staging, on localhost, behind a login) and click it on each screen you want. Your browser copies the page as you see it into a UISandbox tab. Nothing goes to a server.</p>
              <div className="way__chip"><BookmarkletChip /></div>
              <p className="way__fine">A snapshot of what you see: the knobs and the export work on it; to click through the app itself, bring its build. <a href="/?capture=1" onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); setShowSteps(true) }}>Step by step</a></p>
            </section>
            <section className="way way--main way--next">
              <h3><Laptop size={16} strokeWidth={1.75} /> Run it on your machine</h3>
              <p>Is your dev server running? Paste its address and run the line in your project's terminal: the sandbox opens on your live app, hot reload included. Without an address it finds your build (<code>dist/</code>, <code>build/</code>, <code>out/</code>). Served from <code>127.0.0.1</code>: your code never leaves your machine, not even to this site. Needs Node 20.</p>
              <LocalCommand />
              <p className="way__fine">From Claude Code, Cursor or any MCP client: say "open this app in UISandbox". <a href="/about#agents">How</a></p>
            </section>
            {fold('running', 'Deployed somewhere? Add one line', 'Your app on any address: we read which kit it runs on and write its design system', <Plug size={15} strokeWidth={1.75} />)}
            {more === 'running' && <div className="way__body"><LiveAppDoor /></div>}
            {fold('build', 'Or load a build here', 'A zip, a folder or a public repo, read into this tab. Or try a sample', <FileArchive size={15} strokeWidth={1.75} />)}
            {more === 'build' && <div className="way__body">
            <div className="intake__ways" role="tablist">
              {ways.map((w) => (
                <button key={w.id} type="button" role="tab" aria-selected={way === w.id} className={`intake__way ${way === w.id ? 'intake__way--on' : ''}`} onClick={() => { setWay(w.id); setLocalError(null) }}>{w.icon} {w.label}</button>
              ))}
            </div>
            {way !== 'repo' ? (
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
            {way !== 'repo' && (
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
                    title={`${k.name}${k.version ? ` ${k.version}` : ''}: six screens in its own components and its own defaults`}>{k.name}</button>
                ))}
              </div>}
            </>)}
            </div>}
            <input ref={zipRef} type="file" accept=".zip,application/zip" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void takeFiles([f]); e.target.value = '' }} />
            <input ref={dirRef} type="file" hidden {...({ webkitdirectory: '', directory: '' } as Record<string, string>)} onChange={(e) => { const fs = Array.from(e.target.files ?? []); if (fs.length) void takeFiles(fs); e.target.value = '' }} />
          </>
        )}
        {localError && <div className="intake__error">{localError}</div>}
      </div>
      </div>
    </div>
  )
}

/** The one line to run: with a dev server's address in it, live mode (the
 *  running app, hot reload included); without one, the build. The address is
 *  only put into the line; nothing here connects to it. */
function LocalCommand() {
  const [addr, setAddr] = useState('')
  const [copied, setCopied] = useState(false)
  const clean = addr.trim().replace(/\/+$/, '')
  const ok = !clean || /^(https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\]|[\w-]+\.(localhost|test))(:\d+)?(\/[^\s]*)?$/i.test(clean)
  const url = clean && ok ? (/^https?:/i.test(clean) ? clean : `http://${clean}`) : ''
  const cmd = `npx uisandbox-mcp open${url ? ` ${url}` : ''}`
  const copy = async () => { try { await navigator.clipboard.writeText(cmd); setCopied(true); setTimeout(() => setCopied(false), 1400) } catch { /* the line is on screen to select */ } }
  return (
    <div className="localcmd">
      <input className="intake__input" type="text" inputMode="url" placeholder="http://localhost:3000 (optional)" value={addr} onChange={(e) => setAddr(e.target.value)} aria-label="Your dev server's address, if it is running" spellCheck={false} />
      <div className="install install--compact">
        <div className="install__pill">
          <span className="install__prompt" aria-hidden>$</span>
          <code className="install__cmd">{cmd}</code>
          <button type="button" className="install__copy" onClick={() => void copy()} aria-label="Copy" title="Copy">{copied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} />}</button>
        </div>
      </div>
      {!ok && <p className="way__fine">That is not a local address. Live mode is for an app running on your own machine (localhost, 127.0.0.1, *.localhost, *.test).</p>}
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

/** The story: what it does, what moves, how it stays honest, for agents.
 *  Plain, black and white, no claims the meter would contradict. On /about. */
export function Landing() {
  // CSS can suppress an animation but not an autoplaying video, so the clip
  // asks here and hands over the controls instead of starting on its own.
  const [stillPlease] = useState(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  return (
    <div className="landing">
      <section className="landing__sec">
        <h2>How it works</h2>
        {/* What the visitor gets, before what the tool does. The four steps
            below used to open the section, and every one of them described the
            MECHANISM — bring, see, turn, export. A stranger who has not yet
            decided to hand over a folder is asking a different question. */}
        <p className="landing__lead">What would your app look like in a different brand colour, at a bigger type scale, or in dark mode? Find out in about a minute, on the real app, instead of guessing or spending an afternoon on it. Keep what you see and it comes out as code. Close the tab and nothing happened.</p>
        <ol className="steps">
          <li><b>Start on a kit, then bring your own app.</b> The editor opens on shadcn/ui as it ships, so you can turn a knob before you hand over anything, and seven more kits are one pick away. Your own app comes in through the Your app tab: a zip of <code>dist/</code>, <code>build/</code> or <code>out/</code>, a folder, a public GitHub or GitLab repo, or your running app with one script line. What you turned on the kit comes along. It is read here in the page and served to the frame by a service worker; nothing is sent to a server.</li>
          <li><b>It is your actual app, not a preview of one.</b> Every CSS literal becomes a variable holding that same value, so the page renders exactly as it was, runtime styles, CDN stylesheets and nested frames included. There is a button that proves it.</li>
          <li><b>Turn one knob, the whole app follows.</b> A colour used 144 times moves once. Brand and the colour families your CSS actually contains, background, fonts, size, spacing, radius, elevation, motion, hue, saturation, contrast, your own dark mode. Every dial has <em>×1 = as in your code</em> at its centre, so you always know your way back. Or pick a Look: another kit's own brand, background, font and corners, through the same knobs.</li>
          <li><b>Keep it, or bin it.</b> Keep it and you get code. When your app runs on one of the kits, that is a design system and a <code>SKILL.md</code> in the kit's own names, so your agent builds the next screen the same way. Or your own files patched in place, design tokens (CSS, Tailwind, shadcn), Swift and Android constants. Share sends the same build with the same knobs as a link. Bin it by closing the tab.</li>
        </ol>
        {/* The boundary, drawn. People have read "drop your build" as "connect
            your project" and expected their own folder to change under them.
            That is a picture problem, and denying it in prose does not fix it:
            two sides, one arrow each way, and the rule that nothing crosses on
            its own. */}
        <div className="cross" aria-label="What crosses between your machine and this tab">
          <div className="cross__side">
            <b>Your folder</b>
            <span>Where your build lives. It is read once, and never written to. UISandbox cannot change a file on your machine.</span>
          </div>
          <div className="cross__mid" aria-hidden>
            <span className="cross__arrow"><span className="cross__label">a copy of your build</span><svg viewBox="0 0 64 8" preserveAspectRatio="none"><path d="M0 4h56M52 1l4 3-4 3" /></svg></span>
            <span className="cross__rule">nothing crosses on its own</span>
            <span className="cross__arrow cross__arrow--back"><svg viewBox="0 0 64 8" preserveAspectRatio="none"><path d="M64 4H8M12 1L8 4l4 3" /></svg><span className="cross__label">only when you press Export</span></span>
          </div>
          <div className="cross__side">
            <b>This browser tab</b>
            <span>Where the copy is read, rendered and turned. Close the tab and it is gone: nothing is stored, nothing is sent to a server.</span>
          </div>
        </div>
      </section>
      {/* Wider than the 760px column on purpose: this is the one picture on
          the page and a stranger decides from it. It replaced a still of the
          same thing, and a still cannot show a knob being turned, which is the
          only part that is hard to believe in prose. The drop zone stays the
          page's focus, so the clip sits below it rather than in the gap above
          it, where it pushed the door off the first screen. */}
      <figure className="clip clip--wide">
        <video
          className="clip__vid"
          src="/how-it-works.mp4"
          poster="/how-it-works-poster.png"
          width={1280}
          height={720}
          autoPlay={!stillPlease}
          controls={stillPlease}
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="Four builds in the sandbox: a dashboard's brand colour swept through the spectrum, a documentation site switched to its own dark mode, a docs page's hue rotated and its type swapped to monospace, then the 1:1 check reporting no differences and the export panel"
        />
        <figcaption>Four real builds from public repos, one knob each. Nothing staged.</figcaption>
      </figure>
      {/* The objection an experienced developer reaches for first, in their own
          words, answered where they are rather than in a launch comment they
          may never read. It concedes the half that is true: DevTools needs no
          build and works on any page on the internet. */}
      <section className="landing__sec">
        <h2>Isn't this just Inspect?</h2>
        <p>Same instinct, different scale. DevTools changes one declaration on one element. Here every literal in the build becomes a variable first, so a colour used 144 times moves once and moves everywhere it is used, including the runtime styles a framework injects and the stylesheets it pulls from a CDN.</p>
        <p>And Inspect forgets. Reload the page and your afternoon is gone. What you turn here comes out as code: your own files patched in place, a find and replace list, design tokens, or a <code>DESIGN.md</code> your agent reads on every task.</p>
        <p><b>What Inspect does better:</b> it is already open, it needs no build, and it works on any page on the internet. This needs a built app. When you have one, you get the whole design at once instead of one rule at a time, and a measurement that it still renders as it did.</p>
      </section>
      <section className="landing__sec landing__cols">
        <div>
          <h2>How to check it yourself</h2>
          <p><b>"1:1" is measured.</b> <em>Check 1:1</em> loads the untouched build and the tokenised build side by side and diffs the computed styles of every element (18 properties, shadow roots and nested frames included). Zero differences, or it says what differs.</p>
          <p><b>A reach meter</b> says how much of what you see the knobs touch (painted colours, families, sizes, radii) and what lies outside: images, canvas, video.</p>
          <p><b>It says so when it can't help.</b> iOS and Android projects, WordPress themes and source without a build get a clear message at the door; a page that asks for files the archive does not hold says so.</p>
        </div>
        <figure className="shot shot--stack" aria-label="Three things the tool says out loud">
          <picture><source srcSet="/shot-verify-dark.png" media="(prefers-color-scheme: dark)" /><img src="/shot-verify.png" alt="The 1:1 check card: 67 elements paired, zero computed-style differences across 18 properties" loading="lazy" width="880" height="296" /></picture>
          <picture><source srcSet="/shot-reach-dark.png" media="(prefers-color-scheme: dark)" /><img src="/shot-reach.png" alt="The reach card: of 66 visible elements, how many colours, type and radii the knobs touch, and what lies outside" loading="lazy" width="880" height="376" /></picture>
          <picture><source srcSet="/shot-refusal-dark.png" media="(prefers-color-scheme: dark)" /><img src="/shot-refusal.png" alt="A refusal at the door: web source without a built page. Build it first, then drop the output folder" loading="lazy" width="1148" height="110" /></picture>
          <figcaption>The check, the reach meter, a refusal. Each a real screenshot.</figcaption>
        </figure>
      </section>
      <section className="landing__sec">
        <h2 id="privacy">Your files never leave your browser</h2>
        <p>There is no server behind the sandbox, no account, no cookies and no analytics. Your files are read in the page and served to the frame by a service worker on this origin; the knobs are a URL hash; exports are generated here. You can check this yourself: watch the network tab while you drop and export (no request carries your bytes), or load the page, go offline and drop the zip: everything still works. The one exception is <em>Connect a repo</em>: a public GitHub or GitLab URL goes through uisandbox.org to fetch the zip, because neither host lets a browser fetch it directly; nothing is stored. A hostile archive cannot navigate this page away, register its own worker, or smuggle a path out of an export. <a href="https://github.com/Ideelab/uisandbox/blob/main/notes/security.md" target="_blank" rel="noopener">The full security note.</a></p>
      </section>
      <section className="landing__sec">
        <h2 id="agents">From your terminal, or from your agent</h2>
        <p>The same engine runs as an MCP server, and as a <b>Claude Code skill</b>, <code>/uisandbox</code>. Say <em>"open this app in UISandbox"</em> and it builds, loads and opens the real sandbox in your browser; what you turn comes back, so <em>"export what I changed"</em> just works. The plugin installs the skill and the server in one step; any MCP client (Cursor, Claude Desktop, Codex) gets the server and its own <code>/uisandbox:open</code> prompt. Or <code>npx uisandbox-mcp open</code> inside your project, without any agent.</p>
        <InstallLine />
        <p className="landing__more"><b>Or a link.</b> <code>uisandbox.org/?load=</code> followed by a public GitHub or GitLab repository URL, or a direct link to a <code>.zip</code> that allows CORS, opens straight into the sandbox. It is how the samples load, and it is a way to show somebody a build without asking them to find it: <a href="https://uisandbox.org/?load=https://github.com/edwardtufte/tufte-css" target="_blank" rel="noopener">uisandbox.org/?load=https://github.com/edwardtufte/tufte-css</a>.</p>
      </section>
      <section className="landing__sec landing__sec--quiet">
        <h2>Who made this</h2>
        <p>I'm <a href="https://github.com/AlexanderKaan" target="_blank" rel="noopener">Alexander Kaan</a>, and I build open-source tooling for user interfaces. UISandbox came out of the design system generator I made before it: I could hand somebody a finished kit, but I could not show them what their own app would look like in it. This does that other half.</p>
        <p>I won't pretend I knew what I was doing at the start. Every decision, and every trap I fell into on the way, is written down in the repo's <a href="https://github.com/Ideelab/uisandbox/blob/main/notes/decisions.md" target="_blank" rel="noopener">notes</a>, including the ones I had to undo. It's <a href="https://github.com/Ideelab/uisandbox" target="_blank" rel="noopener">MIT</a>, and issues and pull requests are welcome.</p>
      </section>
    </div>
  )
}
