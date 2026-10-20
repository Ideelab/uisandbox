import { useEffect, useRef, useState, type RefObject } from 'react'
import { ExternalLink, Info, RefreshCw, ShieldCheck, Star, X } from 'lucide-react'
import { ScreenPicker } from './ScreenPicker'
import type { SandboxProject, Screen } from '../sandbox/project'
import { identitySid, rawSid, sandboxUrl } from '../sandbox/host'
import { compareDocuments, loadHidden, type VerifyResult } from '../sandbox/verify'
import { pct, type Coverage } from '../sandbox/coverage'

interface StageProps {
  project: SandboxProject
  screen: Screen
  onScreen: (s: Screen) => void
  frameRef: RefObject<HTMLIFrameElement | null>
  /** Called after each load so the live sheet can be (re)applied. */
  onLoaded: () => void
  /** Add the frame's current route to the screens. */
  onPin: () => void
  pinnable?: () => string | null
  changedCount: number
  /** A doubt about the render worth saying out loud (a shell, not the app). */
  warning?: string | null
  /** The warning card's heading; default asks whether this is the built app. */
  warningTitle?: string
  /** How much of what is painted the knobs reach — measured on the frame. */
  coverage?: Coverage | null
  /** The "What we read from your code" card — shown in the top-right slot
   *  whenever the 1:1 check is not; one card at a time, never two on top of
   *  each other. */
  notes?: React.ReactNode
  /** The tabs (merge phase 3). On a kit: its components sheet, its screens,
   *  and "Your app", whose empty state is the door. */
  tab?: StageTab
  onTab?: (t: StageTab) => void
  /** Set when the stage shows a kit build of ours, not somebody's app. */
  kitName?: string
  /** The ways in, shown on the "Your app" tab while a kit is on the stage. */
  door?: React.ReactNode
  /** Canvas controls that sit with the widths (Light / Dark). */
  barExtra?: React.ReactNode
  /** The "What we read" card: shown or not, and its toggle in the foot. */
  onToggleNotes?: () => void
  notesOpen?: boolean
  notesLabel?: string
}

export type StageTab = 'components' | 'screens' | 'app'

/** A kit build's components sheet is its index page; every other page is a screen. */
export const isSheet = (s: Screen) => /^(index\.html?)?$/i.test(s.path.replace(/^\//, ''))

const WIDTHS: Array<{ id: string; label: string; w: number | null }> = [
  { id: 'fit', label: 'Fit', w: null },
  { id: 'desktop', label: '1280', w: 1280 },
  { id: 'tablet', label: '820', w: 820 },
  { id: 'phone', label: '390', w: 390 },
]

/** What a sandboxed document may do — everything a page needs, minus top navigation. */
export const SANDBOX_FLAGS = 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock allow-orientation-lock'

/** A prefilled GitHub issue: every wrong render should be one click from a
 *  report that carries the numbers instead of a screenshot. */
function reportUrl(project: SandboxProject, detail: string): string {
  const title = `Build report: ${project.name}`
  const body = [
    '**What I dropped:** (attach the zip, or paste the public repo/URL)',
    '',
    `**What UISandbox said:** ${detail}`,
    '',
    `**Numbers:** ${project.screens.length} screens · ${project.table.entries.length} values · platform ${project.platform.label}`,
    `**Browser:** ${typeof navigator !== 'undefined' ? navigator.userAgent : ''}`,
  ].join('\n')
  return `https://github.com/Ideelab/uisandbox/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=build-report`
}

export function Stage({ project, screen, onScreen, frameRef, onLoaded, onPin, pinnable, changedCount, warning, warningTitle, coverage, notes, tab = 'app', onTab, kitName, door, barExtra, onToggleNotes, notesOpen, notesLabel }: StageProps) {
  const [showCov, setShowCov] = useState(false)
  const [width, setWidth] = useState<string>('fit')
  const [verify, setVerify] = useState<VerifyResult | { busy: true } | null>(null)
  const [showVerify, setShowVerify] = useState(false)
  const [leftSandbox, setLeftSandbox] = useState(false)
  // A warning closed stays closed until it says something else.
  const [dismissedWarning, setDismissedWarning] = useState<string | null>(null)
  const hiddenHost = useRef<HTMLDivElement>(null)
  const w = WIDTHS.find((x) => x.id === width)?.w ?? null
  const src = sandboxUrl(project.id, screen.path, project.base)

  // A new project or screen invalidates the last measurement.
  useEffect(() => { setVerify(null); setLeftSandbox(false) }, [project.id, screen.path])

  const runVerify = async () => {
    setVerify({ busy: true })
    setShowVerify(true)
    const host = hiddenHost.current!
    host.replaceChildren()
    const frame = frameRef.current
    const fw = frame?.clientWidth ?? 1200, fh = frame?.clientHeight ?? 800
    try {
      const [raw, idn] = await Promise.all([
        loadHidden(sandboxUrl(rawSid(project.id), screen.path, project.base), host, fw, fh),
        loadHidden(sandboxUrl(identitySid(project.id), screen.path, project.base), host, fw, fh),
      ])
      let res = compareDocuments(raw.doc, idn.doc)
      // A carousel mid-slide (jQuery animating margin-left, no CSS transition
      // to freeze) is two moments, not two stylesheets: when the only
      // differences are a few layout offsets, look again after a beat and keep
      // what persists.
      const LAYOUT = /^(margin|padding|gap)/
      if (!res.ok && !res.refusal && res.mismatches.length <= 4 && res.mismatches.every((m) => LAYOUT.test(m.prop))) {
        await new Promise((r) => setTimeout(r, 900))
        const again = compareDocuments(raw.doc, idn.doc)
        const persistent = res.mismatches.filter((m) => again.mismatches.some((n) => n.index === m.index && n.prop === m.prop))
        res = { ...again, mismatches: persistent, ok: persistent.length === 0 }
      }
      setVerify(res)
    } catch (err) {
      setVerify({ ok: false, refusal: `Could not load both frames: ${(err as Error).message}`, elements: 0, unpaired: { raw: 0, sandbox: 0 }, mismatches: [] })
    } finally {
      host.replaceChildren()
    }
  }

  // On a kit the tabs pick the screen: the sheet, or one of the others.
  const sheet = kitName ? project.screens.find(isSheet) : undefined
  const others = kitName ? project.screens.filter((s) => !isSheet(s)) : project.screens
  const atDoor = !!kitName && tab === 'app'
  const pickTab = (t: StageTab) => {
    onTab?.(t)
    if (t === 'components' && sheet && screen !== sheet) onScreen(sheet)
    if (t === 'screens' && isSheet(screen) && others.length) onScreen(others.find((s) => /overview/i.test(s.path)) ?? others[0]!)
  }
  // Whatever the screen picker lands on decides the tab it belongs to.
  useEffect(() => { if (kitName && tab !== 'app') onTab?.(isSheet(screen) ? 'components' : 'screens') }, [screen, kitName]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="stage">
      <div className="stage__bar">
        {kitName && (
          <div className="stage__tabs" role="tablist" aria-label="What the stage shows">
            <button type="button" role="tab" aria-selected={tab === 'components'} className={`stage__tab ${tab === 'components' ? 'stage__tab--on' : ''}`} onClick={() => pickTab('components')}>Components</button>
            <button type="button" role="tab" aria-selected={tab === 'screens'} className={`stage__tab ${tab === 'screens' ? 'stage__tab--on' : ''}`} onClick={() => pickTab('screens')}>Screens</button>
          </div>
        )}
        {(!kitName || tab === 'screens') && <ScreenPicker screens={others} current={screen} onPick={onScreen} onPin={onPin} pinnable={pinnable} named={!!kitName} />}
        {!atDoor && <>
        <div className="seg" role="group" aria-label="Viewport width">
          {WIDTHS.map((x) => (
            <button key={x.id} className={`seg__opt ${x.id === width ? 'seg__opt--on' : ''}`} onClick={() => setWidth(x.id)}>{x.label}</button>
          ))}
        </div>
        {barExtra}
        <span className="stage__spacer" style={{ flex: 1 }} />
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => { const f = frameRef.current; if (f) f.src = src }} title="Reload the screen">
          <RefreshCw size={13} strokeWidth={2} /> Reload
        </button>
        <a className="btn btn--ghost btn--sm" href={src} target="_blank" rel="noreferrer" title="Open this screen in a new tab (same sandbox)">
          <ExternalLink size={13} strokeWidth={2} /> Open
        </a>
        </>}
      </div>
      <div className={`stage__frame ${w ? 'stage__frame--w' : ''} ${atDoor ? 'stage__frame--door' : ''}`}>
        {/* The door sits OVER the kit, which stays loaded and measured under
            it: the knobs, the reach and the export keep working while a
            visitor decides what to bring. */}
        {atDoor && <div className="stage__door">{door}</div>}
        <iframe
          key={project.id}
          name={`us:${project.id}`}
          ref={frameRef}
          className="stage__iframe"
          // Their scripts run same-origin (the worker serves them), so the one
          // thing the sandbox flag can still deny is worth denying: navigating
          // the TOP window (`top.location = …` in a hostile build hijacked the
          // whole app). No allow-top-navigation, no downloads.
          sandbox={SANDBOX_FLAGS}
          title={`${project.name} · ${screen.label}`}
          src={src}
          style={w ? { width: w, maxWidth: '100%' } : undefined}
          onLoad={() => {
            // A page that redirected to another origin is out of our hands.
            let away = false
            try { void frameRef.current?.contentDocument?.body } catch { away = true }
            if (!away && frameRef.current && !frameRef.current.contentDocument) away = true
            setLeftSandbox(away)
            if (!away) onLoaded()
          }}
        />
        {/* The door is its own card; nothing lies on top of it. */}
        {!showVerify && !atDoor && notes}
        <div className="stage__low">
        {showCov && coverage && (
          <div className="card popcard popcard--low verify" role="dialog" aria-label="Reach">
            <button type="button" className="btn btn--ghost btn--icon popcard__x" onClick={() => setShowCov(false)} aria-label="Close" title="Close"><X size={15} /></button>
            <h3>What the knobs reach on this screen</h3>
            <div>Of {coverage.elements} visible elements: <b>{coverage.colours.hit}/{coverage.colours.total}</b> painted colours (text, backgrounds, borders), <b>{coverage.fonts.hit}/{coverage.fonts.total}</b> text families, <b>{coverage.sizes.hit}/{coverage.sizes.total}</b> text sizes and <b>{coverage.radii.hit}/{coverage.radii.total}</b> corner radii come from your CSS literals and follow the knobs.</div>
            <div style={{ marginTop: 6 }}>Outside any knob: {coverage.outside.images} image{coverage.outside.images === 1 ? '' : 's'}, {coverage.outside.canvas} canvas, {coverage.outside.video} video, {coverage.outside.backgroundImages} background image{coverage.outside.backgroundImages === 1 ? '' : 's'}: pixels no CSS value can move.</div>
          </div>
        )}
        {warning && !leftSandbox && warning !== dismissedWarning && (
          <div className="card popcard popcard--low verify" role="status"><button type="button" className="btn btn--ghost btn--icon popcard__x" onClick={() => setDismissedWarning(warning)} aria-label="Close" title="Close"><X size={15} /></button><h3>{warningTitle ?? 'Is this the built app?'}</h3><div>{warning}</div><div style={{ marginTop: 12, display: 'flex', gap: 8 }}><a className="btn btn--ghost btn--sm" href={reportUrl(project, warning)} target="_blank" rel="noopener">This is wrong? Report it</a></div></div>
        )}
        {leftSandbox && (
          <div className="card popcard popcard--low verify" role="status">
            <h3>This screen left the sandbox</h3>
            <div>The page navigated to another origin (a redirect page, or a script that sends visitors elsewhere). Nothing there is yours to tune; pick another screen.</div>
          </div>
        )}
        </div>
        <div ref={hiddenHost} aria-hidden="true" />
        {showVerify && (
          <div className="card popcard verify" role="dialog" aria-label="1:1 check">
            <button type="button" className="btn btn--ghost btn--icon popcard__x" onClick={() => setShowVerify(false)} aria-label="Close" title="Close"><X size={15} /></button>
            <h3>1:1 check: untouched vs. tokenised, identity sheet</h3>
            {!verify || 'busy' in verify ? (
              <div>Loading both versions of this screen and comparing every element…</div>
            ) : verify.refusal ? (
              <div>⚠ {verify.refusal}</div>
            ) : verify.ok ? (
              <div>✓ <b>{verify.elements}</b> elements paired, <b>0</b> computed-style differences across 18 properties.{verify.unpaired.raw + verify.unpaired.sandbox > 0 ? ` ${verify.unpaired.raw + verify.unpaired.sandbox} elements differed between the two loads (ads, widgets) and were left out.` : ''} What you see is your CSS with its literals replaced by variables holding the very same values.</div>
            ) : (
              <div>
                ✗ {verify.mismatches.length}{verify.mismatches.length >= 40 ? '+' : ''} differences on {verify.elements} elements, a rewriter gap. Please report the first few:
                <ul className="verify__list">
                  {verify.mismatches.slice(0, 12).map((m, i) => (
                    <li key={i}>&lt;{m.tag}&gt;#{m.index} {m.prop}: {m.raw} → {m.sandbox}</li>
                  ))}
                </ul>
              </div>
            )}
            <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
              <button type="button" className="btn btn--secondary btn--sm" onClick={runVerify}>Run again</button>
              {verify && !('busy' in verify) && !verify.ok && !verify.refusal && (
                <a className="btn btn--ghost btn--sm" href={reportUrl(project, `1:1 differs — ${verify.mismatches.slice(0, 3).map((m) => `${m.prop}: ${m.raw} → ${m.sandbox}`).join('; ')}`)} target="_blank" rel="noopener">Report this build</a>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="stage__foot">
        <span><b>{project.name}</b>{project.root ? ` · root ${project.root}/` : ''} · {project.screens.length} screen{project.screens.length === 1 ? '' : 's'} · {project.table.entries.length} values tokenised from {Math.round(project.cssBytes / 1024)} KB of CSS</span>
        <span className="stage__spacer" />
        {coverage && (
          <button type="button" className={`chip ${pct(coverage.colours) < 80 ? 'chip--warn' : ''}`} onClick={() => setShowCov((v) => !v)} title="How much of what you see the knobs reach, measured on this screen">
            reach {pct(coverage.colours)}% colours · {pct(coverage.fonts)}% type · {pct(coverage.radii)}% radii{coverage.outside.images + coverage.outside.canvas + coverage.outside.backgroundImages ? ` · ${coverage.outside.images + coverage.outside.canvas + coverage.outside.backgroundImages} outside` : ''}
          </button>
        )}
        {changedCount > 0 ? <span className="chip chip--warn"><span className="chip__dot" />{changedCount} value{changedCount === 1 ? '' : 's'} moved</span> : <span className="chip chip--ok"><span className="chip__dot" />identity: nothing turned</span>}
        {onToggleNotes && (
          <button type="button" className={`chip ${notesOpen ? 'chip--on' : ''}`} onClick={onToggleNotes} aria-pressed={notesOpen} title={notesLabel}>
            <Info size={12} strokeWidth={2} /> What we read
          </button>
        )}
        <button type="button" className="chip" onClick={runVerify} title="Measure: compare the untouched page with the tokenised page, element by element">
          <ShieldCheck size={12} strokeWidth={2} /> {verify && !('busy' in verify) ? (verify.ok ? '1:1 verified' : verify.refusal ? '1:1 unmeasured' : '1:1 differs') : 'Check 1:1'}
        </button>
        {/* The ask, at the moment it has earned it: once something was turned or the check passed. */}
        {(changedCount > 0 || (verify && !('busy' in verify) && verify.ok)) && (
          <a className="chip stage__star" href="https://github.com/Ideelab/uisandbox" target="_blank" rel="noopener" title="Useful? A star on GitHub helps others find it"><Star size={12} strokeWidth={2} /> Useful? Star it</a>
        )}
      </div>
    </section>
  )
}
