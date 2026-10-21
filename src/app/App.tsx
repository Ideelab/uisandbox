import DOOR from '../kits/door.json'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Download, PanelLeftOpen, X, BookOpen } from 'lucide-react'
import { SandboxPanel } from '../panel/SandboxPanel'
import type { Config } from '../tokens/types'
import { useConfig } from '../state/useConfig'
import { shuffle } from '../sandbox/shuffle'
import { openZip, type Archive } from '../audit/intake/readZip'
import { buildProject, discoverRoutes, type SandboxProject, type Screen } from '../sandbox/project'
import { refusalFor } from '../sandbox/platform'
import { Mark } from './Mark'
import { McpButton } from './McpButton'
import { StarButton } from './StarButton'
import { Footer } from './Footer'
import type { Progress } from './progress'
import { varName } from '../sandbox/table'
import { codeFonts, deriveBaseline, refineFromDocument, refineFromTable, type BaselineReport } from '../sandbox/baseline'
import { buildTokens } from '../tokens/buildTokens'
import { computeVars, familiesOf } from '../sandbox/mapping'
import { disown, ensureWorker, own, onSheetGrow, onMissing, missingFor, purgeGuestStorage } from '../sandbox/host'
import { varsStyleTag } from '../sandbox/project'
import { observeFrame } from '../sandbox/live'
import { measureCoverage, type Coverage } from '../sandbox/coverage'
import { nestedDocs } from '../sandbox/verify'
import { applyScheme } from '../sandbox/scheme'
import { fontCssFor } from './fontCss'
import { LookGrid, type LookCard } from './LookGrid'
import { measureTells, type Tell } from '../sandbox/tells'
import { DIRECTIONS, applyDirection, firstRoll, reroll, type LookLocks, type LookRoll } from '../sandbox/directions'
import { Door, LoadStages } from './Intake'
import { Found } from './Found'
import { CaptureDoor } from './CaptureDoor'
import { captureArchive, readCapture, sanitizeHtml, screenPath, type CapturedScreen } from '../capture/receive'
import { AboutDialog } from './AboutDialog'
import { Stage, isSheet, type StageTab } from './Stage'
import { ExportDialog } from './ExportDialog'
import { EngineSelect, PresetSelect, SchemeSwitch, SendButton, ViewSwitch } from './EditorBar'
import { encode, readHash } from '../state/hash'
import { carryOver, carryToken, differingKeys, isShownKnob, knobLabel, readCarryToken, withKeys } from '../state/carry'
import { genPatch, genPatchedFiles } from '../export/genSheet'

interface Loaded {
  project: SandboxProject
  report: BaselineReport
  screen: Screen
  /** Kept so a different root can be chosen without dropping the file again. */
  archive: Archive
  /** The rendered page has had its one chance to decide the brand. */
  brandSeen?: boolean
  /** A build WE made from a kit (the kit door, /kits/<id>.zip on this origin),
   *  not somebody's code: the panel and the notes say "the kit", not "your code". */
  kit?: { id: string; name: string }
  /** Knobs carried over from the kit it was brought after (state/carry.ts),
   *  waiting for the first render: the baseline is corrected from the
   *  UNTOUCHED page, and only then are they put on top, as a hand would. */
  pendingCarry?: { cfg: Config; keys: string[]; from: string; ask?: boolean }
  /** What `?load=` would need to open this build again (a zip URL, a repo
   *  URL); none for a build dropped from somebody's machine. Share uses it. */
  source?: string
  /** Screens taken along from a running app by the bookmarklet (capture/):
   *  a snapshot, so no routes to discover; the origin they came from. */
  captured?: { origin: string }
}

const carryNote = (from: string, keys: string[]) => `Carried over from ${from}: ${keys.filter(isShownKnob).map(knobLabel).join(', ')}. Every other knob starts where your code puts it; Reset puts it all back.`

/** Where a visitor lands: the editor, on this kit as it ships (merge phase 3).
 *  Nothing to upload before the first knob; their own app is a tab away. */
const DEFAULT_KIT = 'shadcn'
const isAbout = () => /^\/about\/?$/.test(location.pathname)

export function App() {
  return <Editor />
}

/** How it works opens over the editor at /about (AboutDialog): a click there
 *  pushes /about, Close and Back return to the editor as it stood; opened cold,
 *  /about is the editor with the dialog over it. Its own title and canonical
 *  while it is open: two URLs claiming to be "/" is one page too many. */
function useAbout() {
  const [about, setAbout] = useState<{ section?: string } | null>(() => isAbout() ? { section: /^#[a-z]+$/.test(location.hash) ? location.hash.slice(1) : undefined } : null)
  useEffect(() => {
    const onPop = () => setAbout(isAbout() ? {} : null)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  useEffect(() => {
    if (!about) return
    const canon = document.querySelector('link[rel="canonical"]')
    const was = canon?.getAttribute('href')
    canon?.setAttribute('href', 'https://uisandbox.org/about')
    return () => { if (was) canon?.setAttribute('href', was) }
  }, [!!about]) // eslint-disable-line react-hooks/exhaustive-deps
  // The knobs ride in the hash; a section anchor (#agents) is not knob state.
  const keep = () => location.search + (/^#[a-z]+$/.test(location.hash) ? '' : location.hash)
  const open = (section?: string) => { if (!isAbout()) history.pushState(null, '', '/about' + keep()); setAbout({ section }) }
  // Not history.back(): the knobs turned while it was open live in this
  // entry's hash, and going back would hand the editor an older one.
  const close = () => { if (isAbout()) history.replaceState(null, '', '/' + keep()); setAbout(null) }
  return { about, open, close }
}

function Editor() {
  const { cfg, tokens, dispatch, undo, redo, reset, canUndo, canRedo } = useConfig()
  const aboutDialog = useAbout()
  const openAbout = (e: React.MouseEvent) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); aboutDialog.open() }
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [busy, setBusyRaw] = useState<Progress | null>(null)
  const fromUrlRef = useRef(false)
  const setBusy = (p: Progress | null) => setBusyRaw(p ? { ...p, fromUrl: fromUrlRef.current } : null)
  const [error, setError] = useState<string | null>(null)
  // On a phone the stage needs the full width first; the knobs open on demand.
  const [panelOpen, setPanelOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 820)
  const [showExport, setShowExport] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  // The stage's tabs, on a kit: its screens and its components sheet.
  const [tab, setTab] = useState<StageTab>('screens')
  // Try it on your own app (decision 217): the takeover over the kit, step 1
  // of three; What we found is step 2, once an app is in; the six are step 3.
  // `?tab=app` (from /about) opens on it.
  const [bringOpen, setBringOpen] = useState(() => new URLSearchParams(location.search).get('tab') === 'app')
  const [foundOpen, setFoundOpen] = useState(false)
  // A shared link's knobs: read before the first load resets them, applied
  // once that load is in (onArchive), then forgotten.
  const sharedCfg = useRef<Config | null>(readHash())
  // Live mode: the local server opened a RUNNING dev server (`npx uisandbox-mcp
  // open http://localhost:3000`). Only the first load, only from 127.0.0.1:
  // the files it lacks are fetched from the dev server behind /__dev/.
  const liveFirst = useRef(new URLSearchParams(location.search).get('live') === '1' && /^(127\.0\.0\.1|localhost)$/.test(location.hostname))
  // What was turned on a kit at uisandbox.org, brought along in the command
  // line (`--carry=`, state/carry.ts): offered on the first load, as a kit's
  // knobs are when an app is brought after it in the same tab.
  const carryFirst = useRef(new URLSearchParams(location.search).get('carry'))
  // Read once, then off the address: a reload or a copied link must not offer it again.
  useEffect(() => {
    const u = new URL(location.href)
    if (u.searchParams.has('carry')) { u.searchParams.delete('carry'); history.replaceState(history.state, '', u.pathname + u.search + u.hash) }
  }, [])
  // A first visit lands on the six (decision 217): the kit, six ways, is the
  // first thing to see. Not for a link that names what to open.
  const sixFirst = useRef(!['load', 'tab', 'capture', 'live', 'screen'].some((k) => new URLSearchParams(location.search).has(k)) && !location.hash)
  // `?capture=1`: the tab the bookmarklet opened (capture/grab.ts). It waits
  // for screens instead of loading a kit, and every screen that arrives is
  // added to the same project.
  const captureMode = useRef(new URLSearchParams(location.search).get('capture') === '1')
  const capStore = useRef({ pages: new Map<string, string>(), files: new Map<string, Blob>(), notes: [] as string[] })
  const [captureWaiting, setCaptureWaiting] = useState(false)
  const frameRef = useRef<HTMLIFrameElement | null>(null)
  const cfgRef = useRef(cfg)
  cfgRef.current = cfg
  const loadedRef = useRef(loaded)
  loadedRef.current = loaded
  // Bumped when the live observer adds entries to the sheet (runtime styles).
  const [sheetVersion, setSheetVersion] = useState(0)
  const stopObserver = useRef<(() => void) | null>(null)

  // The live sheet — pure function of (table, baseline, cfg). One source: the
  // iframe writer below, the HTML injector in host.ts and the export all read it.
  const vars = useMemo(
    () => (loaded ? computeVars(loaded.project.table, loaded.report.baseline, cfg, tokens) : {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loaded, cfg, tokens, sheetVersion],
  )
  const varsRef = useRef(vars)
  varsRef.current = vars
  // Hold to see your original (decision 216): while held, the frame gets the
  // identity sheet, the values their own CSS had, and none of the chosen
  // fonts or the chosen scheme. Nothing is reloaded; letting go puts it back.
  const [peek, setPeek] = useState(false)
  // Pick a look (decision 216): open or not, which brand and type pair each
  // direction shows, what is locked, and which direction the knobs stand on.
  const [looksOpen, setLooksOpen] = useState(false)
  const [roll, setRoll] = useState<LookRoll>(firstRoll)
  const [locks, setLocks] = useState<LookLocks>({ font: false })
  const [lookOn, setLookOn] = useState<string | null>(null)
  // What on this screen reads as the AI look (sandbox/tells.ts), measured
  // again after a load and after every turn, never while the original shows.
  const [tells, setTells] = useState<Tell[] | null>(null)
  // What a look last set, so its fonts are not taken for yours.
  const [lookApplied, setLookApplied] = useState<{ id: string; cfg: Config; setFont: boolean } | null>(null)
  /** A font is yours when you turned it, not when a look did. */
  const yours = (): LookLocks => {
    if (!loaded) return { font: false }
    const b = loaded.report.baseline.cfg, la = lookApplied
    const font = (cfg.fontDisplay !== b.fontDisplay || cfg.fontBody !== b.fontBody) && !(la?.setFont && la.cfg.fontDisplay === cfg.fontDisplay && la.cfg.fontBody === cfg.fontBody)
    return { font }
  }
  /** One direction on the knobs as they stand, with the dials a look turns
   *  put back to the app's own first, so one look never inherits another's. */
  const directionCfg = (id: string, lk: LookLocks): Config | null => {
    const d = DIRECTIONS.find((x) => x.id === id)
    if (!d || !loaded) return null
    const base = loaded.report.baseline.cfg
    const reset = Object.fromEntries([...new Set(DIRECTIONS.flatMap((x) => Object.keys(x.sb)))].map((k) => [k, (base.sb as unknown as Record<string, number>)[k]]))
    return applyDirection({ ...cfg, sb: { ...cfg.sb, ...reset } }, d, roll[d.id], lk)
  }
  // The six open holding on to what was chosen: a font turned away from the
  // kit's is kept by default, so the looks vary the style around it. Colour
  // a look never sets: all six wear yours. Unlocking the font is one click.
  const openLooks = () => {
    setLocks(yours())
    setLooksOpen(true)
  }
  const looksOpenRef = useRef(looksOpen)
  looksOpenRef.current = looksOpen
  const peekRef = useRef(peek)
  peekRef.current = peek
  const fontCss = useMemo(() => (loaded ? fontCssFor(cfg, loaded.report.baseline.cfg) : ''), [cfg.fontDisplay, cfg.fontBody, loaded]) // eslint-disable-line react-hooks/exhaustive-deps
  const coverageRef = useRef<Coverage | null>(null)
  const fontCssRef = useRef(fontCss)
  fontCssRef.current = fontCss
  // Debug/agent hook: the live state, readable from the console — DEV only:
  // a sandboxed page runs same-origin and could reach `parent.__us`.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    ;(window as unknown as { __us?: unknown }).__us = loaded
      // `coverage` is a getter: the walk finishes after this effect runs, so a
      // snapshot here always read null and the handle looked broken.
      ? { project: loaded.project, baseline: loaded.report.baseline, cfg, vars, get coverage() { return coverageRef.current }, identity: loaded.project.table.identityVars(), dispatch, patch: () => genPatch(loaded.project.table, vars), patched: () => genPatchedFiles(loaded.project.raw, loaded.project.table, vars, fontCss) }
      : null
  }, [loaded, cfg, vars, dispatch, fontCss])
  // The tab title says which project is open (a hostile page may rewrite it —
  // security.md — so it is set from here on every load, not trusted).
  // One place sets it, so How it works (open over the editor) keeps its own.
  const aboutOpen = !!aboutDialog.about
  useEffect(() => {
    document.title = aboutOpen ? "How UISandbox works · Play with your app's design, right in the browser"
      : loaded && !loaded.kit ? `UISandbox · ${loaded.project.name}` : "UISandbox · Play with your app's design. Right in the browser"
  }, [loaded, aboutOpen])
  // Each direction on the knobs as they stand, with the dials a look turns
  // put back to the app's own first, so one look never inherits another's.
  const lookCards = useMemo<LookCard[]>(() => {
    if (!loaded || !looksOpen) return []
    const base = loaded.report.baseline.cfg
    return DIRECTIONS.map((d) => {
      const c = directionCfg(d.id, locks)!
      return { id: d.id, name: d.name, what: d.what, brand: c.cPrimary, // the whole of what the card wears: a knob turned while the six are
        // open (the colour, with it kept) rewrites the sheet, not only a shuffle
        key: `${JSON.stringify(c)}|${loaded.project.table.entries.length}`, // and what a runtime style added to the table since
        sheet: { vars: computeVars(loaded.project.table, loaded.report.baseline, c, buildTokens(c)), fonts: fontCssFor(c, base), dark: c.sb.dark ?? null }, cfg: c }
    })
  }, [loaded, looksOpen, cfg, roll, locks, sheetVersion])
  const pickDirection = (id: string) => {
    const card = lookCards.find((l) => l.id === id) as (LookCard & { cfg: Config }) | undefined
    if (!card) return
    dispatch({ type: 'REPLACE', cfg: card.cfg })
    setLookApplied({ id, cfg: card.cfg, setFont: !locks.font })
    setLookOn(id)
    setLooksOpen(false)
  }
  // Preset: the same six, from the panel, applied as Pick this one would.
  const pickPreset = (id: string) => {
    const lk = yours()
    const next = directionCfg(id, lk)
    if (!next) return
    dispatch({ type: 'REPLACE', cfg: next })
    setLookApplied({ id, cfg: next, setFont: !lk.font })
    setLookOn(id)
  }
  const changedCount = useMemo(() => {
    if (!loaded) return 0
    const id = loaded.project.table.identityVars()
    return Object.keys(vars).filter((k) => vars[k] !== id[k]).length
  }, [vars, loaded])

  // Write the sheet into the frame's document on every change (same origin,
  // served by our worker) — the whole point: no reload, no flash, live.
  const applyVars = useCallback(() => {
    const top = frameRef.current?.contentDocument
    if (!top) return
    // Their page may hold same-origin frames of its own (Storybook's manager
    // renders every story inside iframe.html): the sheet applies to each.
    for (const doc of [top, ...nestedDocs(top)]) applyTo(doc)
    function applyTo(doc: Document) {
    const cur = loadedRef.current
    const original = peekRef.current && cur
    let el = doc.getElementById('us-vars')
    if (!el) {
      el = doc.createElement('style')
      el.id = 'us-vars'
      ;(doc.head ?? doc.documentElement).prepend(el)
    }
    const css = varsStyleTag(original ? cur.project.table.identityVars() : varsRef.current)
    const inner = css.slice(css.indexOf('>') + 1, css.lastIndexOf('<'))
    if (el.textContent !== inner) el.textContent = inner
    // A font the knob chose has to LOAD in their document: Google Fonts by
    // @import, an uploaded font by its blob URL (same origin, so it resolves).
    let fonts = doc.getElementById('us-fonts')
    if (!fonts) {
      fonts = doc.createElement('style')
      fonts.id = 'us-fonts'
      el.after(fonts)
    }
    const fcss = original ? '' : fontCssRef.current
    if (fonts.textContent !== fcss) fonts.textContent = fcss
    // Their dark mode, switched on their own hooks (sandbox/scheme.ts).
    if (cur) { try { applyScheme(doc, cur.project.scheme, (original ? cur.report.baseline.cfg.sb.dark : cfgRef.current.sb.dark) ?? null) } catch { /* mid-navigation */ } }
    }
  }, [])
  useEffect(() => { applyVars() }, [vars, fontCss, cfg.sb.dark, peek, applyVars])
  const remeasureTells = useCallback(() => {
    const doc = frameRef.current?.contentDocument
    const cur = loadedRef.current
    if (!doc || !cur || peekRef.current) return
    try { setTells(measureTells(doc, cfgRef.current.cPrimary, { hasScheme: !!cur.project.scheme })) } catch { /* mid-navigation */ }
  }, [])
  useEffect(() => { const t = setTimeout(remeasureTells, 450); return () => clearTimeout(t) }, [vars, fontCss, peek, remeasureTells])
  // Opened by the local MCP server (`&sync=<id>`): the knobs flow back to it,
  // so an agent can export/verify what the user turned by hand. Same origin,
  // 127.0.0.1, debounced; nothing else ever receives the state.
  // Opened by the local server: it says where Send goes (an agent, or the
  // terminal). No answer, no button: on uisandbox.org there is no one to send to.
  const [sendTo, setSendTo] = useState<'agent' | 'terminal' | null>(null)
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('sync')
    if (!id || !/^(127\.0\.0\.1|localhost)$/.test(location.hostname)) return
    fetch(`/__session/${encodeURIComponent(id)}`).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j?.to === 'agent' || j?.to === 'terminal') setSendTo(j.to) }).catch(() => {})
  }, [])
  const sendBack = async (): Promise<{ waiting: number } | null> => {
    const id = new URLSearchParams(location.search).get('sync')
    if (!id) return null
    // The page sends its own account: it saw everything the build styled,
    // runtime and hot-reloaded styles included, which the server never does.
    const report = (() => {
      if (!loaded) return undefined
      const base = loaded.report.baseline.cfg
      const at = (c: Config, k: string) => k.startsWith('sb.') ? (c.sb as unknown as Record<string, unknown>)[k.slice(3)] : (c as unknown as Record<string, unknown>)[k]
      const turned = differingKeys(base, cfg).filter(isShownKnob).map((k) => ({ knob: knobLabel(k), from: at(base, k) ?? 'as in the code', to: at(cfg, k) ?? 'as in the code' }))
      return { turned, moved: changedCount, of: loaded.project.table.entries.length, patch: genPatch(loaded.project.table, vars) }
    })()
    try { const r = await fetch(`/__send/${encodeURIComponent(id)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cfg, report }) }); return r.ok ? await r.json() : null } catch { return null }
  }
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('sync')
    // Only the app the server opened: a kit picked in the Engine menu is not its project.
    if (!id || !loaded || loaded.kit || !/^(127\.0\.0\.1|localhost)$/.test(location.hostname)) return
    const t = setTimeout(() => { void fetch(`/__state/${encodeURIComponent(id)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cfg }) }).catch(() => {}) }, 400)
    return () => clearTimeout(t)
  }, [cfg, loaded])

  // After each load: apply the sheet, then watch what their JS styles at runtime.
  /* Let the SCREEN and the GROWN sheet correct the baseline — but only while
     every knob still stands where the baseline put it. Runs after each load and
     after runtime rules arrived (styled-components inserts after `load` on a
     slow frame); a correction is idempotent, so running twice is harmless. */
  const refineBaseline = useCallback(() => {
    const cur = loadedRef.current
    const doc = frameRef.current?.contentDocument
    if (!cur || !doc || !doc.body) return
    const base = cur.report.baseline.cfg
    const untouched = (Object.keys(base) as (keyof Config)[]).every((k) => cfgRef.current[k] === base[k])
    if (!untouched) return
    const fromTable = refineFromTable(cur.project.table, base)
    const mid = { ...base, ...(fromTable ?? {}) }
    // The paint may decide the brand once per project — freely when nothing is
    // declared; over a declared one only when that colour is painted nowhere.
    const brandFromPaint = cur.brandSeen ? false : cur.report.brandDeclared ? 'if-absent' as const : true
    cur.brandSeen = true
    const fromDoc = refineFromDocument(doc, mid, { brand: brandFromPaint })
    // The canvas the page PAINTS (html/body computed) corrects a body rule from
    // a shipped-but-inactive theme sheet.
    let paintedCanvas: string | undefined
    try {
      const w = doc.defaultView!
      const bodyBg = w.getComputedStyle(doc.body).backgroundColor, htmlBg = w.getComputedStyle(doc.documentElement).backgroundColor
      const pick = [bodyBg, htmlBg].find((c) => c && !/^rgba\(0, 0, 0, 0\)$|^transparent$/.test(c))
      if (pick) paintedCanvas = pick
    } catch { /* mid-navigation */ }
    const cfg2 = { ...mid, ...(fromDoc ?? {}) }
    const fams2 = familiesOf(cur.project.table, cfg2.cPrimary, { paintedCanvas })
    const canvasMoved = fams2.canvasId !== cur.report.baseline.families?.canvasId
    if (!fromTable && !fromDoc && !canvasMoved) return
    cur.report.baseline = { cfg: cfg2, tokens: buildTokens(cfg2), families: fams2 }
    if (fromTable) cur.report.notes.push(`Corrected from rules inserted by JS at runtime: ${Object.entries(fromTable).map(([k, v]) => `${k} ${v}`).join(', ')}.`)
    if (fromDoc) cur.report.notes.push(`Corrected from the rendered page: ${Object.entries(fromDoc).map(([k, v]) => `${k} ${v}`).join(', ')}.`)
    // The refined baseline is still the starting point, not a step to undo.
    reset(cfg2)
    setLoaded({ ...cur })
  }, [reset])
  // Screens an SPA only reveals once rendered: its links. Merged into the picker.
  const discoverScreens = useCallback(() => {
    const cur = loadedRef.current
    const doc = frameRef.current?.contentDocument
    if (!cur || !doc?.body || cur.captured) return
    const found = discoverRoutes(doc, cur.project.screens)
    if (!found.length) return
    cur.project.screens = [...cur.project.screens, ...found]
    setLoaded({ ...cur })
  }, [])
  // The page the frame is on now, when the screen list does not have it yet
  // (somebody clicked through inside their app): what "Add … to the list" adds.
  const unlistedRoute = useCallback((): string | null => {
    const cur = loadedRef.current
    let path: string
    try { path = frameRef.current?.contentWindow?.location.pathname ?? '' } catch { return null }
    if (!cur || !path) return null
    path = path.replace(/^\/__sb\/[^/]+\//, '/').replace(/\/+$/, '') || '/'
    if (cur.project.base && path.startsWith('/' + cur.project.base)) path = path.slice(cur.project.base.length + 1) || '/'
    const asFile = path.replace(/^\//, '')
    return cur.project.screens.some((s) => s.label === path || s.path === asFile || s.path === asFile + '.html' || s.path === (asFile ? asFile + '/' : '') + 'index.html') ? null : path
  }, [])
  const pinCurrent = useCallback(() => {
    const cur = loadedRef.current
    const path = unlistedRoute()
    if (!cur || !path) return
    cur.project.screens = [...cur.project.screens, { path: path.replace(/^\//, ''), label: path, source: 'pinned' }]
    setLoaded({ ...cur })
  }, [unlistedRoute])
  const [thin, setThin] = useState<string | null>(null)
  // A Flutter web build renders to a canvas: the sandbox shows it 1:1, the knobs find no CSS.
  const flutterWeb = !!loaded && loaded.project.archive.entries.some((e) => /(^|\/)(main\.dart\.js|flutter_bootstrap\.js)$/.test(e.path)) && loaded.project.table.entries.length < 40
  const [missingFiles, setMissingFiles] = useState<string[]>([])
  useEffect(() => onMissing((project) => { if (loadedRef.current?.project.id === project.id) setMissingFiles(missingFor(project)) }), [])
  useEffect(() => { setMissingFiles(loaded ? missingFor(loaded.project) : []) }, [loaded])
  const [coverage, setCoverage] = useState<Coverage | null>(null)
  coverageRef.current = coverage
  const coverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // The kit export asks the live page for exactly the variables its theme
  // writes, at the moment it writes them, so a build's own values can win.
  const readPageVars = useCallback((names: string[]): Record<string, string> => {
    const doc = frameRef.current?.contentDocument
    if (!doc?.documentElement) return {}
    const cs = (doc.defaultView ?? window).getComputedStyle(doc.documentElement)
    return Object.fromEntries(names.map((n) => [n, cs.getPropertyValue(n).trim()]).filter(([, v]) => v))
  }, [])
  const remeasure = useCallback(() => {
    if (coverTimer.current) clearTimeout(coverTimer.current)
    coverTimer.current = setTimeout(() => {
      const cur = loadedRef.current
      const doc = frameRef.current?.contentDocument
      if (!cur || !doc?.body) return
      try { setCoverage(measureCoverage(doc, cur.project.table, varsRef.current)) } catch { /* mid-navigation */ }
    }, 900)
  }, [])
  const onFrameLoaded = useCallback(() => {
    applyVars()
    setTimeout(remeasureTells, 600)
    stopObserver.current?.()
    const doc = frameRef.current?.contentDocument
    // A shell with nothing in it is not "your app": say so rather than let a
    // half-empty page pass for the real thing.
    if (doc?.body) {
      // Nested same-origin frames count as content (Storybook's manager is a
      // shell around iframe.html); a slow manager is empty at 1.2 s and full at
      // 4 s, so a shell verdict needs a second look before it is said.
      const measure = () => {
        const docs = [doc, ...nestedDocs(doc)]
        const els = docs.reduce((n, d) => n + d.body.querySelectorAll('*').length, 0)
        const rules = docs.reduce((n, d) => n + Array.from(d.styleSheets).reduce((m, sh) => { try { return m + sh.cssRules.length } catch { return m } }, 0), 0)
        const text = docs.reduce((n, d) => n + (d.body.innerText ?? '').trim().length, 0)
        const media = docs.reduce((n, d) => n + d.body.querySelectorAll('img, svg, canvas, video, picture').length, 0)
        // A canvas/WebGL page is three elements and no text — and not a shell.
        // No text is suspicious only on a small DOM: 172 animated <div>s (anime.js) are an app.
        const shell = media === 0 && (els < 6 || rules < 3 || (text < 20 && els < 40))
        return { shell, els, rules, text }
      }
      setTimeout(() => {
        const first = measure()
        if (!first.shell) { setThin(null); return }
        setTimeout(() => {
          const m = measure()
          setThin(m.shell ? `This screen rendered ${m.els} element${m.els === 1 ? '' : 's'}, ${m.rules} style rules and ${m.text} characters of visible text. It looks like a shell, not the app (a page the server fills in, a build that needs its API, or a folder without its CSS). What you see here is not what your users see.` : null)
        }, 2800)
      }, 1200)
    }
    if (doc && loaded) stopObserver.current = observeFrame(doc, loaded.project.table, () => { setSheetVersion((v) => v + 1); refineBaseline(); remeasure() })
    refineBaseline()
    // The knobs carried from a kit land now: after the untouched page had its
    // chance to correct the baseline, on top of the corrected one.
    const cur = loadedRef.current
    if (cur?.pendingCarry && !cur.pendingCarry.ask) {
      const { cfg: carried, keys } = cur.pendingCarry
      cur.pendingCarry = undefined
      dispatch({ type: 'REPLACE', cfg: withKeys(cur.report.baseline.cfg, carried, keys) })
    }
    discoverScreens()
    remeasure()
    // A router renders after load; look once more.
    setTimeout(discoverScreens, 800)
  }, [applyVars, loaded, refineBaseline, discoverScreens, remeasure])
  useEffect(() => () => { stopObserver.current?.() }, [])
  // Runtime rules (insertRule) that grew the sheet — coalesced, then re-map.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null
    return onSheetGrow(() => { if (t) clearTimeout(t); t = setTimeout(() => { setSheetVersion((v) => v + 1); refineBaseline() }, 80) })
  }, [refineBaseline])

  const onArchive = async (archive: Archive, root?: string, kit?: Loaded['kit'], source?: string, extra?: { screen?: string; captured?: Loaded['captured']; notes?: string[] }) => {
    setError(null)
    if (!busy) fromUrlRef.current = false
    try {
      setBusy({ stage: 'read', done: 0, total: archive.entries.length, bytes: 0, what: archive.rootName })
      await ensureWorker()
      let lastAt = 0
      const project = await buildProject(archive, {
        root,
        onProgress: (d, t, css) => { const now = Date.now(); if (now - lastAt > 120 || d === t) { lastAt = now; setBusy({ stage: 'read', done: d, total: t, bytes: css, what: archive.rootName }) } },
      })
      // The door opens for what renders 1:1, and for nothing else.
      // A running dev server's page is source by design (live mode): that is
      // what the build refusal guards against, and what live mode is for.
      const liveNow = liveFirst.current && !kit
      if (!liveNow && (!project.platform.renders || !project.screens.length)) throw new Error(refusalFor(project.platform, { files: archive.entries.length }))
      // The dev server's page is the one screen to start on; its links are
      // discovered once it renders, as for any SPA.
      if (liveNow && !project.screens.length) project.screens.push({ path: 'index.html', label: '/', source: 'file' })
      setBusy({ stage: 'derive', total: project.table.entries.length, what: archive.rootName })
      const report = await deriveBaseline(archive, project.table)
      setBusy({ stage: 'open', what: archive.rootName })
      // What was turned on a kit travels to the app brought after it (state/carry.ts).
      // A screen taken along after others keeps what was turned on them.
      const prev = loadedRef.current
      const from = prev && (prev.kit || (extra?.captured && prev.captured)) ? { name: prev.kit?.name ?? 'the screens taken before', base: prev.report.baseline.cfg, cfg: cfgRef.current } : null
      // The knobs from the command line, on the first load only.
      const token = !kit && carryFirst.current ? readCarryToken(carryFirst.current) : null
      carryFirst.current = null
      // What we found: for an app that came in now, not for one more screen
      // taken along to the ones before it.
      const ask = !kit && !(extra?.captured && prev?.captured)
      if (loaded) disown(loaded.project)
      // A previous tenant's leftovers, before the next one renders: the frame
      // is same-origin, so what the last app wrote to localStorage is still
      // there and would make this drop look like a cached one.
      purgeGuestStorage()
      own(project, () => varsRef.current, { live: liveNow })
      liveFirst.current = false
      // A fresh project is a fresh start: no history, no hash from the last one.
      reset(report.baseline.cfg)
      setLookOn(null)
      // A shared link's knobs, once; else what was turned on the kit before
      // (in this tab, or in the command line). An app that came in now is
      // asked first, in What we found; one more screen keeps what was turned.
      let pendingCarry: Loaded['pendingCarry']
      if (sharedCfg.current) { dispatch({ type: 'REPLACE', cfg: sharedCfg.current }); sharedCfg.current = null }
      else if ((from || token) && !kit) {
        const carried = token ? { cfg: withKeys(report.baseline.cfg, token.cfg, token.keys), keys: token.keys } : carryOver(from!.base, from!.cfg, report.baseline.cfg)
        const name = token?.name ?? from!.name
        if (carried.keys.some(isShownKnob)) {
          pendingCarry = { cfg: carried.cfg, keys: carried.keys, from: name, ask }
          if (!ask) report.notes.unshift(carryNote(name, carried.keys))
        }
      }
      if (extra?.notes) report.notes.push(...extra.notes)
      // From one kit to the next on a screen, the next opens on that screen:
      // the same Dashboard in another kit is the comparison worth making, and
      // every kit build has the same pages.
      const stay = kit && prev?.kit && tab === 'screens' ? prev.screen.path : null
      if (sixFirst.current && kit) { setLocks({ font: false }); setLooksOpen(true) }
      sixFirst.current = false
      const wanted = extra?.screen ?? stay ?? new URLSearchParams(location.search).get('screen')
      // A kit opens on its Dashboard: a screen says more than the sheet of
      // every control, which is a drill-down (Alexander). Coming from the
      // sheet in another kit, the sheet it stays.
      const kitStart = kit ? (prev?.kit && tab === 'components' ? project.screens.find(isSheet) : project.screens.find((s) => /overview/i.test(s.path))) : undefined
      const first = (wanted && project.screens.find((s) => s.path === wanted || s.label === wanted)) || kitStart || project.screens[0]!
      setLoaded({ project, report, screen: first, archive, kit, source, pendingCarry, captured: extra?.captured })
      // Their own app is what they came for: what was read from it, step 2.
      // A kit opens quietly on its Dashboard.
      if (kit) setTab(isSheet(first) ? 'components' : 'screens')
      else { setBringOpen(false); setLooksOpen(false); setShowExport(false); if (ask) setFoundOpen(true); else setShowNotes(true) }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  // `?load=<url-to-zip>` opens an archive fetched from a URL (same-origin or
  // CORS-enabled) — for demos, tests and agents; the drop zone stays the door.
  const loadedFromUrl = useRef(false)
  /** A zip by URL — `?load=` (same-origin or CORS) or the repo proxy. */
  const loadFromUrl = async (url: string) => {
    setError(null)
    fromUrlRef.current = true
    try {
      const host = (() => { try { const u = new URL(url, location.href); return u.pathname.startsWith('/__repo/') ? (new URL(u.searchParams.get('u') ?? '', location.href).host || 'github.com') : u.host } catch { return url } })()
      setBusy({ stage: 'fetch', what: host, bytes: 0 })
      let res: Response
      try { res = await fetch(url) } catch {
        throw new Error(`The browser could not fetch that URL from ${host}: the server must allow CORS (or it is offline). A public GitHub repository URL works regardless: it goes through this site's repo route.`)
      }
      if (!res.ok) throw new Error(res.status === 404 ? `Nothing at ${host} for that URL (${res.status}).` : `${res.status} fetching from ${host}.`)
      const ct = res.headers.get('content-type') || ''
      if (/text\/html/i.test(ct)) throw new Error(`That URL answered with a web page, not a zip. Check the link (a direct link to a .zip file, or a public GitHub repository).`)
      // Read the body in chunks so the door can count the megabytes coming in.
      const size = Number(res.headers.get('content-length') || 0) || undefined
      const chunks: BlobPart[] = []
      let got = 0
      const reader = res.body?.getReader()
      if (reader) {
        for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); got += value.byteLength; setBusy({ stage: 'fetch', what: host, bytes: got, size }) }
      }
      const blob = reader ? new Blob(chunks) : await res.blob()
      const name = decodeURIComponent((res.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/)?.[1]) || url.split('/').pop() || 'archive.zip')
      // The kit door's own builds, and only from this origin: a zip somebody
      // names shadcn.zip is still their code.
      const kitId = (() => { try { const u = new URL(url, location.href); return u.origin === location.origin ? u.pathname.match(/^\/kits\/([a-z0-9]+)\.zip$/)?.[1] : undefined } catch { return undefined } })()
      const door = kitId ? DOOR.find((d) => d.id === kitId) : undefined
      // What a link needs to open this again: the repo URL behind the proxy route, or the zip URL itself.
      const source = (() => { try { const u = new URL(url, location.href); return u.pathname.startsWith('/__repo/') ? u.searchParams.get('u') ?? undefined : u.pathname.startsWith('/__archive/') ? undefined /* the local server's, gone when it stops */ : u.origin === location.origin ? u.pathname : u.href } catch { return undefined } })()
      await onArchive(await openZip(new File([blob], name.endsWith('.zip') ? name : `${name}.zip`, { type: 'application/zip' })), undefined, door ? { id: door.id, name: door.name } : undefined, source)
    } catch (err) { setError((err as Error).message); setBusy(null) }
  }
  useEffect(() => {
    if (loadedFromUrl.current) return
    if (captureMode.current) { loadedFromUrl.current = true; return }
    // No `?load`: the default kit, so the first screen is the editor itself.
    const url = new URLSearchParams(location.search).get('load') ?? `/kits/${DEFAULT_KIT}.zip`
    loadedFromUrl.current = true
    // A GitHub or GitLab repository URL works too — `?load=https://github.com/user/repo[/tree/branch]`
    // goes through the repo route — so any agent can say a working link.
    const gh = url.match(/^(?:https?:\/\/)?(?:www\.)?(github|gitlab)\.com\/[\w.-]+\/[\w.-]+/i) && !/\.zip($|\?)/i.test(url) && !/\/archive\//i.test(url)
    void loadFromUrl(gh ? `/__repo/?u=${encodeURIComponent(url.startsWith('http') ? url : `https://${url}`)}` : url)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A screen from the bookmarklet: filed beside the ones before it, and the
  // project rebuilt from them all, the way a dropped build is read.
  const takeScreen = async (screen: CapturedScreen) => {
    const store = capStore.current
    const path = screenPath(screen.href, new Set(store.pages.keys()))
    store.pages.set(path, sanitizeHtml(screen.html))
    for (const f of screen.files) store.files.set(f.path, f.blob)
    const s = screen.stats
    const label = '/' + path.replace(/(^|\/)index\.html$/, '')
    const notTaken = s.sheetsRefused + s.assetsRefused
    store.notes.push(`Taken along from ${screen.href} as ${label}: ${screen.bytes >= 1048576 ? `${(screen.bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(screen.bytes / 1024))} KB`} in ${screen.files.length + 1} files, read in ${screen.captureMs} ms, handed over in ${screen.transferMs} ms, at ${screen.viewport.w}×${screen.viewport.h}. ${s.sheets} linked sheets${s.sheetsFromCssom ? ` (${s.sheetsFromCssom} from the CSSOM)` : ''}, ${s.styles} <style>${s.stylesFromCssom ? ` (${s.stylesFromCssom} from the CSSOM: rules JS inserted)` : ''}, ${s.assets} images and fonts${s.shadowRoots ? `, ${s.shadowRoots} shadow roots` : ''}${s.canvases ? `, ${s.canvases} canvases as images` : ''}.${notTaken ? ` Not taken: ${screen.refused.slice(0, 4).map((r) => `${r.url.slice(0, 80)} (${r.why})`).join('; ')}${screen.refused.length > 4 ? ` and ${screen.refused.length - 4} more` : ''}; those load from where they live, or not at all.` : ''}${s.maybeClosedShadow ? ` ${s.maybeClosedShadow} custom elements show nothing to copy (a closed shadow root, or empty).` : ''}${s.frames ? ` ${s.frames} frames left empty.` : ''}`)
    const name = (() => { try { return new URL(screen.origin).host } catch { return 'your app' } })()
    await onArchive(captureArchive(name, store.pages, store.files), '', undefined, undefined, { screen: path, captured: { origin: screen.origin }, notes: store.notes })
    setCaptureWaiting(false)
  }
  const takeScreenRef = useRef(takeScreen)
  takeScreenRef.current = takeScreen
  useEffect(() => {
    if (!captureMode.current) return
    // The bookmarklet finds this tab again by name; a cross-site navigation cleared the one it gave.
    window.name = 'uisandbox-capture'
    let queue = Promise.resolve()
    const on = (e: MessageEvent) => {
      // Only the tab that opened this one, and only by its own origin.
      if (!window.opener || e.source !== window.opener) return
      const type = (e.data as { type?: unknown } | null)?.type
      if (type === 'uisandbox:ping') { (e.source as Window).postMessage({ type: 'uisandbox:ready' }, e.origin); return }
      if (type !== 'uisandbox:capture') return
      const screen = readCapture(e.data, e.origin)
      const reply = (msg: object) => { try { (e.source as Window).postMessage({ type: 'uisandbox:ack', ...msg }, e.origin) } catch { /* the app tab went away */ } }
      if (typeof screen === 'string') { reply({ ok: false, why: screen }); setError(`A screen from ${e.origin} was refused: ${screen}.`); return }
      reply({ ok: true, screen: new URL(screen.href).pathname })
      setCaptureWaiting(true)
      queue = queue.then(() => takeScreenRef.current(screen)).catch((err) => setError((err as Error).message))
    }
    window.addEventListener('message', on)
    return () => window.removeEventListener('message', on)
  }, [])

  // Register the worker as soon as the page is idle, not on the first drop:
  // it makes the drop instant, and it makes "go offline, it still works" true
  // (offline, sw.js can no longer be fetched). Failure is fine here — the
  // drop path explains it properly.
  useEffect(() => {
    const t = setTimeout(() => { ensureWorker().catch(() => {}) }, 800)
    return () => clearTimeout(t)
  }, [])

  // Space, held, shows the original; not while typing or on a focused control,
  // where Space means what it always means.
  useEffect(() => {
    const busy = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(t.tagName))
    // (with the looks open, Space shuffles them instead: LookGrid)
    const down = (e: KeyboardEvent) => { if (e.code === 'Space' && !e.repeat && !busy(e.target) && loadedRef.current && !looksOpenRef.current) { e.preventDefault(); setPeek(true) } }
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') setPeek(false) }
    const off = () => setPeek(false)
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', off)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', off) }
  }, [])

  // Keyboard: ⌘Z / ⇧⌘Z for the knobs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return
      e.preventDefault()
      if (e.shiftKey) redo(); else undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])


  // Start over: the default kit, in place. Not a page load, and never an
  // empty stage in between: the screen on show stays until the kit replaces it
  // (a reload, or loaded → null, put the door on screen for a moment, and it
  // read as the old landing page flashing past).
  const startOver = () => {
    if (location.search || location.hash) history.replaceState(null, '', '/')
    if (loaded?.kit?.id === DEFAULT_KIT && !busy) { dispatch({ type: 'REPLACE', cfg: loaded.report.baseline.cfg }); return }
    void loadFromUrl(`/kits/${DEFAULT_KIT}.zip`)
  }
  const closeProject = startOver
  // Share: the default kit is `/`; anything else with an address is `?load=`;
  // the knobs ride along as the hash, unless nothing was turned.
  const shareUrl = (() => {
    if (!loaded) return null
    const base = loaded.kit?.id === DEFAULT_KIT ? `${location.origin}/` : loaded.source ? `${location.origin}/?load=${encodeURIComponent(loaded.source)}` : null
    if (!base) return null
    const same = encode(cfg) === encode(loaded.report.baseline.cfg)
    return same ? base : `${base}#${encode(cfg)}`
  })()
  const pickKit = (id: string) => {
    if (loaded && !loaded.kit && !confirm(`Switch to ${DOOR.find((d) => d.id === id)?.name ?? id}? Your app was only in this tab: switching closes it, and you can bring it again with Try it on your own app.`)) return
    void loadFromUrl(`/kits/${id}.zip`)
  }
  useEffect(() => { setLookApplied(null) }, [loaded?.project.id])
  // The look while the knobs stand where it put them; "As it is" at the
  // baseline; "Custom" once something was turned on top of a look.
  const lookNow = !loaded || encode(cfg) === encode(loaded.report.baseline.cfg) ? null : lookApplied && encode(lookApplied.cfg) === encode(cfg) ? lookApplied.id : lookApplied ? '' : null
  const hasScheme = !!loaded && (loaded.project.scheme.media || loaded.project.scheme.hooks.length > 0)
  // One card at a time: Export or How it works, opened from the top bar or
  // the footer, closes the takeover under it.
  useEffect(() => { if (showExport || aboutOpen) setBringOpen(false) }, [showExport, aboutOpen])
  // What was turned on the kit, for the command line in the takeover.
  const kitCarry = (() => {
    if (!loaded?.kit) return null
    const token = carryToken(loaded.kit.name, loaded.report.baseline.cfg, cfg)
    return token ? { token, kit: loaded.kit.name, names: differingKeys(loaded.report.baseline.cfg, cfg).filter(isShownKnob).map(knobLabel) } : null
  })()
  const foundDone = (bring: boolean, six: boolean) => {
    const cur = loadedRef.current
    const pc = cur?.pendingCarry
    setFoundOpen(false)
    if (cur && pc) {
      cur.pendingCarry = undefined
      if (bring) {
        dispatch({ type: 'REPLACE', cfg: withKeys(cur.report.baseline.cfg, pc.cfg, pc.keys) })
        cur.report.notes.unshift(carryNote(pc.from, pc.keys))
      }
    }
    if (six) { setLocks({ font: bring && !!pc?.keys.some((k) => k === 'fontDisplay' || k === 'fontBody') }); setLooksOpen(true) }
  }
  const schemeHooks = loaded ? [loaded.project.scheme.media ? 'prefers-color-scheme' : null, ...loaded.project.scheme.hooks.map(([a, d]) => (a === 'class' ? `.${d}` : `[${a}="${d}"]`))].filter(Boolean).join(' · ') : ''
  const makeDoor = (standalone = false) => <Door standalone={standalone} onClose={!standalone && loaded ? () => setBringOpen(false) : undefined} carry={standalone ? null : kitCarry} onArchive={onArchive} onUrl={(u) => void loadFromUrl(`/__repo/?u=${encodeURIComponent(u)}`)} onSample={(p) => void loadFromUrl(p)} busy={busy} error={error} />
  return (
    <div className="app">
      <header className="app__topbar">
        <a className="app__brand" href="/" title={loaded && !loaded.kit ? 'Close your app and start over' : 'UISandbox'} onClick={(e) => { if (loaded) { e.preventDefault(); startOver() } }}><span className="app__brand-mark"><Mark size={16} /></span><span className="app__brand-name">UISandbox</span></a>
        {/* Beside the name, where "Design System Generator" stood (it lives in
            the footer): the one link a newcomer looks for first. */}
        <a className="app__how" href="/about" title="How it works" onClick={openAbout}><BookOpen size={14} /> <span>How it works</span></a>
        {/* No step bar (decision 217): the steps are the controls themselves,
            1 | 6 over the screen, the knobs, and these two. */}
        <span className="app__spacer" />
        <div className="app__group">
          {!loaded && <><McpButton /><StarButton /></>}
          {loaded && <>
            {loaded.kit
              ? <button type="button" className="btn btn--secondary btn--sm app__try" onClick={() => { setLooksOpen(false); setBringOpen(true) }} aria-haspopup="dialog"><span className="app__try-long">Try it on your own app</span><span className="app__try-short">Your app</span></button>
              : <button type="button" className="btn btn--ghost btn--sm" onClick={closeProject} title="Close your app and go back to the kit"><ArrowLeft size={14} /> Back to the kits</button>}
            <button type="button" className={`btn ${sendTo ? 'btn--secondary' : 'btn--primary'} btn--sm`} onClick={() => setShowExport(true)}><Download size={14} /> Export</button>
            {sendTo && !loaded.kit && <SendButton to={sendTo} onSend={sendBack} />}
          </>}
        </div>
      </header>
      {/* The intro line is gone (Alexander: if it needs explaining, the app
          does not explain itself); the page's h1 stays, for search and for
          screen readers, and the line itself is in the footer. */}
      <h1 className="vh">UISandbox: play with your app's design, right in the browser</h1>
      <div className="app__body">
        {loaded && (
          <>
            {!panelOpen && (
              <button type="button" className="btn btn--ghost btn--icon app__knobs-open" onClick={() => setPanelOpen(true)} title="Show the knobs"><PanelLeftOpen size={16} /><span className="app__knobs-label">Knobs</span></button>
            )}
            {panelOpen && (
              <SandboxPanel
                cfg={cfg}
                tokens={tokens}
                base={loaded.report.baseline.cfg}
                families={loaded.report.baseline.families}
                codeFonts={codeFonts(loaded.project.table)}
                hasGradients={loaded.project.table.ofKind('angle').length > 0}
                varNow={(id) => vars[varName(id)]}
                dispatch={dispatch}
                onCollapse={() => setPanelOpen(false)}
                onRandomize={() => dispatch({ type: 'REPLACE', cfg: shuffle(cfg, loaded.report.baseline, Math.random, { kit: !!loaded.kit }) })}
                onReset={() => { dispatch({ type: 'REPLACE', cfg: loaded.report.baseline.cfg }); setLookOn(null) }}
                history={{ undo, redo, canUndo, canRedo }}
                radiiOnScreen={coverage ? coverage.radii.total : undefined}
                kitName={loaded.kit?.name}
                head={<>
                  {/* What the knobs turn, and a start for all of them at once:
                      both belong to the knobs, not to the site's top bar. */}
                  <EngineSelect kitId={loaded.kit?.id} ownApp={!loaded.kit} detected={coverage ? coverage.kit : undefined} onPick={pickKit} />
                  <PresetSelect current={lookNow} presets={DIRECTIONS.map((d) => ({ id: d.id, name: d.name, what: d.what }))} onPick={pickPreset} />
                </>}
              />
            )}
            <Stage
              project={loaded.project}
              screen={loaded.screen}
              onScreen={(screen) => setLoaded({ ...loaded, screen })}
              frameRef={frameRef}
              onLoaded={onFrameLoaded}
              onPin={pinCurrent}
              pinnable={unlistedRoute}
              changedCount={changedCount}
              peek={peek}
              onPeek={setPeek}
              tells={tells ?? undefined}
              onLooks={openLooks}
              looks={looksOpen && loaded ? <LookGrid project={loaded.project} screen={loaded.screen} looks={lookCards} current={lookOn} locks={locks} onLocks={setLocks}
                onShuffle={() => setRoll((r) => reroll(r))} onPick={pickDirection} onClose={() => setLooksOpen(false)} onGrow={() => setSheetVersion((v) => v + 1)} /> : null}
              warningTitle={!thin && !missingFiles.length && flutterWeb ? 'A Flutter web build' : undefined}
              warning={thin ?? (missingFiles.length ? `${missingFiles.length === 1 ? 'A file' : `${missingFiles.length} files`} this page asked for ${missingFiles.length === 1 ? 'is' : 'are'} not in the archive: ${missingFiles.slice(0, 3).join(', ')}${missingFiles.length > 3 ? '…' : ''}. ${loaded.captured ? 'The page was taken along as it rendered; these it asks for here, and the capture did not see.' : 'That usually means source, not the built output: parts of the page cannot run here.'}` : flutterWeb ? `Flutter paints this app into a <canvas>: there is almost no CSS for the knobs to move (${loaded.project.table.entries.length} values found). The 1:1 check and the reach meter still tell the truth about it; a design pass on a Flutter app belongs in its ThemeData.` : null)}
              coverage={coverage}
              tab={tab}
              onTab={setTab}
              kitName={loaded.kit?.name}
              barExtra={<>
                <ViewSwitch six={looksOpen} onChange={(six) => (six ? openLooks() : setLooksOpen(false))} />
                {hasScheme && <SchemeSwitch value={cfg.sb.dark ?? 'light'} hooks={schemeHooks} onChange={(v) => dispatch({ type: 'SET', patch: { sb: { ...cfg.sb, dark: v } } })} />}
              </>}
              onToggleNotes={() => setShowNotes((v) => !v)}
              notesOpen={showNotes}
              notesLabel={loaded.kit ? `What UISandbox read from ${loaded.kit.name}: its files, its brand, its fonts, its values` : 'What UISandbox read from your code: the files, the brand, the fonts, the values'}
              notes={showNotes ? (
              <div className="card popcard" role="dialog" aria-label="What was read">
                <button type="button" className="btn btn--ghost btn--icon popcard__x" onClick={() => setShowNotes(false)} aria-label="Close" title="Close"><X size={15} /></button>
                <h3>{loaded.kit ? `What we read from ${loaded.kit.name}` : 'What we read from your code'}</h3>
                <ul className="notes">
                  {loaded.report.notes.map((n, i) => <li key={i}>{n}</li>)}
                  <li>{loaded.project.table.entries.length} distinct values in {Math.round(loaded.project.cssBytes / 1024)} KB of CSS: {(['color', 'radius', 'font-size', 'font-family', 'space', 'shadow', 'angle'] as const).map((k) => `${loaded.project.table.ofKind(k).length} ${k === 'angle' ? 'gradient angle' : k}`).join(' · ')}.</li>
                  {loaded.project.candidates.length > 1 && (
                    <li>Other roots in the archive:{' '}
                      {loaded.project.candidates.filter((c) => c !== loaded.project.root).slice(0, 6).map((c) => (
                        <button key={c} type="button" className="btn btn--secondary btn--sm" style={{ marginRight: 6, marginTop: 4 }} onClick={() => { const a = loaded.archive; disown(loaded.project); setLoaded(null); void onArchive(a, c, loaded.kit, loaded.source) }}>{c || '/'}</button>
                      ))}
                    </li>
                  )}
                </ul>
              </div>
              ) : null}
            />
          </>
        )}
        {/* Nothing on the stage yet: the editor's own skeleton with the load's
            stages (the same shape index.html paints before the script runs,
            so nothing flashes), or, when a load failed, the door with the
            reason and every other way in. */}
        {!loaded && captureMode.current && !busy && !error && <CaptureDoor waiting={captureWaiting || !!window.opener} />}
        {!loaded && !(captureMode.current && !busy && !error) && (error ? makeDoor(true) : (
          <div className="skel">
            <aside className="skel__panel" aria-hidden />
            <section className="skel__stage">{busy ? <div className="skel__load"><LoadStages busy={busy} /></div> : null}</section>
          </div>
        ))}
      </div>
      {(loaded || !error) && <Footer onAbout={(section) => aboutDialog.open(section)} />}
      {bringOpen && loaded && <div className="stage__door">{makeDoor()}</div>}
      {foundOpen && loaded && !loaded.kit && <Found facts={{ name: loaded.project.name, kit: coverage ? coverage.kit : undefined, screens: loaded.project.screens.length, values: loaded.project.table.entries.length, brand: loaded.report.baseline.cfg.cPrimary, font: loaded.report.baseline.cfg.fontBody }}
        carry={loaded.pendingCarry?.ask ? { from: loaded.pendingCarry.from, names: loaded.pendingCarry.keys.filter(isShownKnob).map(knobLabel) } : null} onDone={foundDone} />}
      {aboutDialog.about && <AboutDialog section={aboutDialog.about.section} onClose={aboutDialog.close} />}
      {showExport && loaded && (
        <ExportDialog cfg={cfg} base={loaded.report.baseline.cfg} table={loaded.project.table} vars={vars} projectName={loaded.project.name} kitDoorName={loaded.kit?.name} shareUrl={shareUrl} files={loaded.project.raw} fontCss={fontCss} notes={loaded.report.notes} painted={coverage?.painted} anchors={coverage?.anchors} kit={coverage ? coverage.kit : undefined} kitValues={coverage?.kitValues} readPageVars={readPageVars} send={sendTo ? { to: sendTo, onSend: sendBack } : undefined} tells={tells ?? []} onClose={() => setShowExport(false)} />
      )}
    </div>
  )
}
