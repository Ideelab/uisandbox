import DOOR from '../kits/door.json'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Info, PanelLeftOpen, X, BookOpen } from 'lucide-react'
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
import { googleFontsImport, isCustomFont, customFontFamily, SYSTEM_FONT } from '../tokens/fonts'
import { customFontUrl } from '../tokens/customFonts'
import { Door, LoadStages } from './Intake'
import { About } from './About'
import { Stage, type StageTab } from './Stage'
import { ExportDialog } from './ExportDialog'
import { EngineSelect, LookSelect, SchemeSwitch, ShareButton } from './EditorBar'
import { applyLook, looks } from '../kits/looks'
import { toPx } from '../sandbox/mapping'
import { encode, readHash } from '../state/hash'
import { carryOver, differingKeys, knobLabel, withKeys } from '../state/carry'
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
  pendingCarry?: { cfg: Config; keys: string[] }
  /** What `?load=` would need to open this build again (a zip URL, a repo
   *  URL); none for a build dropped from somebody's machine. Share uses it. */
  source?: string
}

/** Where a visitor lands: the editor, on this kit as it ships (merge phase 3).
 *  Nothing to upload before the first knob; their own app is a tab away. */
const DEFAULT_KIT = 'shadcn'
const isAbout = () => /^\/about\/?$/.test(location.pathname)

export function App() {
  if (isAbout()) return <About />
  return <Editor />
}

function Editor() {
  const { cfg, tokens, dispatch, undo, redo, reset, canUndo, canRedo } = useConfig()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [busy, setBusyRaw] = useState<Progress | null>(null)
  const fromUrlRef = useRef(false)
  const setBusy = (p: Progress | null) => setBusyRaw(p ? { ...p, fromUrl: fromUrlRef.current } : null)
  const [error, setError] = useState<string | null>(null)
  // On a phone the stage needs the full width first; the knobs open on demand.
  const [panelOpen, setPanelOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 820)
  const [showExport, setShowExport] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  // The stage's tabs. On a kit: its components sheet, its screens, and the
  // door to your own app. `?tab=app` (from /about) opens on the door.
  const [tab, setTab] = useState<StageTab>(() => new URLSearchParams(location.search).get('tab') === 'app' ? 'app' : 'components')
  // A shared link's knobs: read before the first load resets them, applied
  // once that load is in (onArchive), then forgotten.
  const sharedCfg = useRef<Config | null>(readHash())
  // Only the very first load honours `?tab=app`; a kit loaded later opens on its sheet.
  const doorFirst = useRef(new URLSearchParams(location.search).get('tab') === 'app')
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
  const fontCss = useMemo(() => {
    if (!loaded) return ''
    const base = loaded.report.baseline.cfg
    const chosen = [cfg.fontDisplay, cfg.fontBody].filter((f, i) => f !== (i === 0 ? base.fontDisplay : base.fontBody) && f !== SYSTEM_FONT)
    if (!chosen.length) return ''
    const google = chosen.filter((f) => !isCustomFont(f))
    const custom = chosen.filter(isCustomFont)
    const parts: string[] = []
    if (google.length) parts.push(googleFontsImport(google[0]!, google[1] ?? google[0]!))
    for (const f of custom) {
      const url = customFontUrl(f)
      if (url) parts.push(`@font-face{font-family:'${customFontFamily(f)}';src:url(${url});font-weight:100 900;font-display:swap}`)
    }
    // Display font: most apps set ONE family and let headings inherit it, so
    // there is no heading literal for the sheet to move. The knob therefore
    // speaks by SELECTOR — the one semantic override that is honest, because
    // "which face do headings use" is a real question in every app.
    if (cfg.fontDisplay !== base.fontDisplay) {
      const stack = String(buildTokens(cfg).vars['--k-font-display'])
      parts.push(`h1,h2,h3,h4,h5,h6,[class*="title"],[class*="heading"],[class*="hero"],[class*="display"]{font-family:${stack} !important}`)
    }
    return parts.join('\n')
  }, [cfg.fontDisplay, cfg.fontBody, loaded])
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
  useEffect(() => {
    document.title = loaded && !loaded.kit ? `UISandbox · ${loaded.project.name}` : "UISandbox · Play with your app's design. Right in the browser"
  }, [loaded])
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
    let el = doc.getElementById('us-vars')
    if (!el) {
      el = doc.createElement('style')
      el.id = 'us-vars'
      ;(doc.head ?? doc.documentElement).prepend(el)
    }
    const css = varsStyleTag(varsRef.current)
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
    const fcss = fontCssRef.current
    if (fonts.textContent !== fcss) fonts.textContent = fcss
    // Their dark mode, switched on their own hooks (sandbox/scheme.ts).
    const cur = loadedRef.current
    if (cur) { try { applyScheme(doc, cur.project.scheme, cfgRef.current.sb.dark ?? null) } catch { /* mid-navigation */ } }
    }
  }, [])
  useEffect(() => { applyVars() }, [vars, fontCss, cfg.sb.dark, applyVars])
  // Opened by the local MCP server (`&sync=<id>`): the knobs flow back to it,
  // so an agent can export/verify what the user turned by hand. Same origin,
  // 127.0.0.1, debounced; nothing else ever receives the state.
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('sync')
    if (!id || !loaded || !/^(127\.0\.0\.1|localhost)$/.test(location.hostname)) return
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
    if (!cur || !doc?.body) return
    const found = discoverRoutes(doc, cur.project.screens)
    if (!found.length) return
    cur.project.screens = [...cur.project.screens, ...found]
    setLoaded({ ...cur })
  }, [])
  const pinCurrent = useCallback(() => {
    const cur = loadedRef.current
    const win = frameRef.current?.contentWindow
    if (!cur || !win) return
    let path = win.location.pathname.replace(/^\/__sb\/[^/]+\//, '/').replace(/\/+$/, '') || '/'
    if (cur.project.base && path.startsWith('/' + cur.project.base)) path = path.slice(cur.project.base.length + 1) || '/'
    if (cur.project.screens.some((s) => s.label === path)) return
    cur.project.screens = [...cur.project.screens, { path: path.replace(/^\//, ''), label: path, source: 'pinned' }]
    setLoaded({ ...cur })
  }, [])
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
    if (cur?.pendingCarry) {
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

  const onArchive = async (archive: Archive, root?: string, kit?: Loaded['kit'], source?: string) => {
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
      if (!project.platform.renders || !project.screens.length) throw new Error(refusalFor(project.platform, { files: archive.entries.length }))
      setBusy({ stage: 'derive', total: project.table.entries.length, what: archive.rootName })
      const report = await deriveBaseline(archive, project.table)
      setBusy({ stage: 'open', what: archive.rootName })
      // What was turned on a kit travels to the app brought after it (state/carry.ts).
      const from = loadedRef.current?.kit ? { name: loadedRef.current.kit.name, base: loadedRef.current.report.baseline.cfg, cfg: cfgRef.current } : null
      if (loaded) disown(loaded.project)
      // A previous tenant's leftovers, before the next one renders: the frame
      // is same-origin, so what the last app wrote to localStorage is still
      // there and would make this drop look like a cached one.
      purgeGuestStorage()
      own(project, () => varsRef.current)
      // A fresh project is a fresh start: no history, no hash from the last one.
      reset(report.baseline.cfg)
      // A shared link's knobs, once; else what was turned on the kit before.
      let pendingCarry: Loaded['pendingCarry']
      if (sharedCfg.current) { dispatch({ type: 'REPLACE', cfg: sharedCfg.current }); sharedCfg.current = null }
      else if (from && !kit) {
        const carried = carryOver(from.base, from.cfg, report.baseline.cfg)
        if (carried.keys.length) {
          pendingCarry = { cfg: carried.cfg, keys: carried.keys }
          report.notes.unshift(`Carried over from ${from.name}: ${carried.keys.map(knobLabel).join(', ')}. Every other knob starts where your code puts it; Reset puts it all back.`)
        }
      }
      const wanted = new URLSearchParams(location.search).get('screen')
      const first = (wanted && project.screens.find((s) => s.path === wanted || s.label === wanted)) || project.screens[0]!
      setLoaded({ project, report, screen: first, archive, kit, source, pendingCarry })
      // Their own app is what they came for: show it, and what was read from it.
      // A kit opens on its sheet, quietly, unless the visitor asked for the door.
      if (kit) { setTab(doorFirst.current ? 'app' : 'components'); doorFirst.current = false }
      else { setTab('app'); setShowNotes(true) }
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
      const source = (() => { try { const u = new URL(url, location.href); return u.pathname.startsWith('/__repo/') ? u.searchParams.get('u') ?? undefined : u.origin === location.origin ? u.pathname : u.href } catch { return undefined } })()
      await onArchive(await openZip(new File([blob], name.endsWith('.zip') ? name : `${name}.zip`, { type: 'application/zip' })), undefined, door ? { id: door.id, name: door.name } : undefined, source)
    } catch (err) { setError((err as Error).message); setBusy(null) }
  }
  useEffect(() => {
    if (loadedFromUrl.current) return
    // No `?load`: the default kit, so the first screen is the editor itself.
    const url = new URLSearchParams(location.search).get('load') ?? `/kits/${DEFAULT_KIT}.zip`
    loadedFromUrl.current = true
    // A GitHub or GitLab repository URL works too — `?load=https://github.com/user/repo[/tree/branch]`
    // goes through the repo route — so any agent can say a working link.
    const gh = url.match(/^(?:https?:\/\/)?(?:www\.)?(github|gitlab)\.com\/[\w.-]+\/[\w.-]+/i) && !/\.zip($|\?)/i.test(url) && !/\/archive\//i.test(url)
    void loadFromUrl(gh ? `/__repo/?u=${encodeURIComponent(url.startsWith('http') ? url : `https://${url}`)}` : url)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Register the worker as soon as the page is idle, not on the first drop:
  // it makes the drop instant, and it makes "go offline, it still works" true
  // (offline, sw.js can no longer be fetched). Failure is fine here — the
  // drop path explains it properly.
  useEffect(() => {
    const t = setTimeout(() => { ensureWorker().catch(() => {}) }, 800)
    return () => clearTimeout(t)
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
    if (loaded?.kit?.id === DEFAULT_KIT && !busy) { setTab('components'); dispatch({ type: 'REPLACE', cfg: loaded.report.baseline.cfg }); return }
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
    if (loaded && !loaded.kit && !confirm(`Switch to ${DOOR.find((d) => d.id === id)?.name ?? id}? Your app was only in this tab: switching closes it, and you can bring it again from the Your app tab.`)) return
    void loadFromUrl(`/kits/${id}.zip`)
  }
  // Look: the corners are measured against the stage's own radius, its kit's
  // start card on a kit, the build's most-used radius on yours.
  const [lookApplied, setLookApplied] = useState<{ id: string; cfg: Config } | null>(null)
  const lookBasePx = (() => {
    if (!loaded) return null
    const own = loaded.kit ? looks.find((l) => l.id === loaded.kit!.id)?.values.radius : undefined
    if (own) return toPx(own)?.px ?? null
    const top = [...loaded.project.table.ofKind('radius')].map((e) => ({ px: toPx(e.value)?.px ?? 0, n: e.count })).filter((x) => x.px > 0 && x.px < 100).sort((a, b) => b.n - a.n)[0]
    return top?.px ?? null
  })()
  const pickLook = (id: string) => {
    const look = looks.find((l) => l.id === id)
    if (!look || !loaded) return
    const next = applyLook(cfg, look, lookBasePx)
    dispatch({ type: 'REPLACE', cfg: next })
    setLookApplied({ id, cfg: next })
  }
  useEffect(() => { setLookApplied(null) }, [loaded?.project.id])
  // The look while the knobs stand where it put them; "As it is" at the
  // baseline; "Custom" once something was turned on top of a look.
  const lookNow = !loaded || encode(cfg) === encode(loaded.report.baseline.cfg) ? null : lookApplied && encode(lookApplied.cfg) === encode(cfg) ? lookApplied.id : lookApplied ? '' : null
  const hasScheme = !!loaded && (loaded.project.scheme.media || loaded.project.scheme.hooks.length > 0)
  const turnedOnKit = loaded?.kit ? differingKeys(loaded.report.baseline.cfg, cfg) : []
  const carryNote = turnedOnKit.length ? `What you turned on ${loaded!.kit!.name} comes with it: ${turnedOnKit.map(knobLabel).join(', ')}. Everything else starts as your code has it.` : undefined
  const door = <Door carryNote={carryNote} onArchive={onArchive} onUrl={(u) => void loadFromUrl(`/__repo/?u=${encodeURIComponent(u)}`)} onSample={(p) => void loadFromUrl(p)} busy={busy} error={error} />
  return (
    <div className="app">
      <header className="app__topbar">
        <a className="app__brand" href="/" title={loaded && !loaded.kit ? 'Close your app and start over' : 'UISandbox'} onClick={(e) => { if (loaded) { e.preventDefault(); startOver() } }}><span className="app__brand-mark"><Mark size={16} /></span><span className="app__brand-name">UISandbox</span> <small>{loaded ? (loaded.kit ? loaded.kit.name : loaded.project.name) : 'Interface Design Playground'}</small></a>
        <span className="app__spacer" />
        <div className="app__group">
          <a className="btn btn--ghost btn--sm app__how" href="/about" title="How it works"><BookOpen size={14} /><span className="ebar__txt"> How it works</span></a>
          {!loaded && <><McpButton /><StarButton /></>}
          {loaded && <>
            <LookSelect current={lookNow} onPick={pickLook} />
            <EngineSelect kitId={loaded.kit?.id} ownApp={!loaded.kit} detected={coverage ? coverage.kit : undefined} onPick={pickKit} />
            {hasScheme && <SchemeSwitch value={cfg.sb.dark ?? 'light'} onChange={(v) => dispatch({ type: 'SET', patch: { sb: { ...cfg.sb, dark: v } } })} />}
            <ShareButton url={shareUrl} />
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowNotes((v) => !v)} title={loaded.kit ? 'What we read from the kit' : 'What we read from your code'}><Info size={14} /><span className="ebar__txt"> Read</span></button>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setShowExport(true)}><Download size={14} /> Export</button>
            {!loaded.kit && <button type="button" className="btn btn--ghost btn--sm" onClick={closeProject} title="Close your app and go back to the kit"><X size={14} /> Close</button>}
          </>}
        </div>
      </header>
      {/* One line that says what this is, on the kit everybody lands on. The
          page's h1 lives here: the homepage IS the editor now. */}
      {!loaded && !error && (
        <div className="app__intro">
          <h1>Play with your app's design, right in the browser.</h1>
          <span>Start from a kit or your own app, turn the knobs, export the code.</span>
        </div>
      )}
      {loaded?.kit && (
        <div className="app__intro">
          <h1>Play with your app's design, right in the browser.</h1>
          <span>This is {loaded.kit.name} as it ships. Turn a knob<span className="app__intro-where"> on the left</span>, then <button type="button" className="app__intro-link" onClick={() => setTab('app')}>try it on your own app</button>.</span>
          <a className="app__intro-link app__intro-how" href="/about">How it works</a>
        </div>
      )}
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
                scheme={loaded.project.scheme}
                codeFonts={codeFonts(loaded.project.table)}
                hasGradients={loaded.project.table.ofKind('angle').length > 0}
                varNow={(id) => vars[varName(id)]}
                dispatch={dispatch}
                onCollapse={() => setPanelOpen(false)}
                onRandomize={() => dispatch({ type: 'REPLACE', cfg: shuffle(cfg, loaded.report.baseline) })}
                onReset={() => dispatch({ type: 'REPLACE', cfg: loaded.report.baseline.cfg })}
                history={{ undo, redo, canUndo, canRedo }}
                radiiOnScreen={coverage ? coverage.radii.total : undefined}
                kitName={loaded.kit?.name}
              />
            )}
            <Stage
              project={loaded.project}
              screen={loaded.screen}
              onScreen={(screen) => setLoaded({ ...loaded, screen })}
              frameRef={frameRef}
              onLoaded={onFrameLoaded}
              onPin={pinCurrent}
              changedCount={changedCount}
              warningTitle={!thin && !missingFiles.length && flutterWeb ? 'A Flutter web build' : undefined}
              warning={thin ?? (missingFiles.length ? `${missingFiles.length === 1 ? 'A file' : `${missingFiles.length} files`} this page asked for ${missingFiles.length === 1 ? 'is' : 'are'} not in the archive: ${missingFiles.slice(0, 3).join(', ')}${missingFiles.length > 3 ? '…' : ''}. That usually means source, not the built output: parts of the page cannot run here.` : flutterWeb ? `Flutter paints this app into a <canvas>: there is almost no CSS for the knobs to move (${loaded.project.table.entries.length} values found). The 1:1 check and the reach meter still tell the truth about it; a design pass on a Flutter app belongs in its ThemeData.` : null)}
              coverage={coverage}
              tab={tab}
              onTab={setTab}
              kitName={loaded.kit?.name}
              door={door}
              notes={showNotes ? (
              <div className="card popcard" role="dialog" aria-label="What was read">
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
                <div style={{ marginTop: 14 }}><button type="button" className="btn btn--secondary btn--sm" onClick={() => setShowNotes(false)}>Close</button></div>
              </div>
              ) : null}
            />
          </>
        )}
        {/* Nothing on the stage yet: the editor's own skeleton with the load's
            stages (the same shape index.html paints before the script runs,
            so nothing flashes), or, when a load failed, the door with the
            reason and every other way in. */}
        {!loaded && (error ? door : (
          <div className="skel">
            <aside className="skel__panel" aria-hidden />
            <section className="skel__stage">{busy ? <div className="skel__load"><LoadStages busy={busy} /></div> : null}</section>
          </div>
        ))}
      </div>
      {(loaded || !error) && <Footer />}
      {showExport && loaded && (
        <ExportDialog cfg={cfg} base={loaded.report.baseline.cfg} table={loaded.project.table} vars={vars} projectName={loaded.project.name} kitDoorName={loaded.kit?.name} files={loaded.project.raw} fontCss={fontCss} notes={loaded.report.notes} painted={coverage?.painted} anchors={coverage?.anchors} kit={coverage ? coverage.kit : undefined} kitValues={coverage?.kitValues} readPageVars={readPageVars} onClose={() => setShowExport(false)} />
      )}
    </div>
  )
}
