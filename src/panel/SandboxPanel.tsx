import { Fragment, useEffect, useLayoutEffect, useRef, useState, type Dispatch } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronRight, PanelLeftClose, Redo2, RotateCcw, Shuffle, Undo2 } from 'lucide-react'
import { BODY_FONTS, DISPLAY_GROUPS } from '../tokens/fonts'
import { nameColor } from '../tokens/color'
import { COLOR_THEMES } from '../tokens/stylesAndThemes'
import type { ColorTheme, Config, Tokens } from '../tokens/types'
import type { ConfigAction } from '../state/configReducer'
import { FontPicker } from './FontPicker'
import { ColorField } from './ColorPicker'
import { DEFAULT_DIALS, DIALS, fmtDial, nearestSnap, type DialSpec, type Dials } from '../sandbox/dials'
import { DIRECTIONS } from '../sandbox/directions'
import type { Families, Family } from '../sandbox/mapping'
import { formatCssColor } from '../sandbox/cssColor'
import type { Scheme } from '../sandbox/scheme'

interface Props {
  cfg: Config
  tokens: Tokens
  /** The stand their code implied — every knob's "as is". */
  base: Config
  families?: Families
  scheme?: Scheme
  /** Families their sheet carries (knob names) — the picker's "In your code". */
  codeFonts?: string[]
  /** The sheet holds a linear/conic gradient — the angle dial has something to turn. */
  hasGradients?: boolean
  /** The CURRENT value of a sheet entry (its var, after mapping) — the dots
   *  move with the knobs, as the page does. */
  varNow?: (id: number) => string | undefined
  dispatch: Dispatch<ConfigAction>
  onCollapse: () => void
  onRandomize: () => void
  onReset: () => void
  /** A build made from a kit through the kit door, not somebody's code: the
   *  centre of every knob is "as the kit ships it", and the dials that only
   *  exist to move somebody's CSS (hue, saturation, contrast) are not shown. */
  kitName?: string
  /** Knob history — undo/redo live with the knobs, not in the top bar. */
  history?: { undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean }
  /** Painted radii on the current screen (the reach meter's count): 0 means the
   *  Radius dial has nothing visible to move — the dial says so. */
  radiiOnScreen?: number
  /** Above the knobs: which kit (or your app) they turn, and the preset. */
  head?: React.ReactNode
}

const THEMES: Array<{ id: ColorTheme; label: string; hex: string }> = (Object.keys(COLOR_THEMES) as ColorTheme[]).map((id) => ({ id, label: id[0]!.toUpperCase() + id.slice(1), hex: COLOR_THEMES[id].cPrimary }))
const FAMILY_ROWS: Array<{ fam: Family; key: keyof Dials; label: string }> = [
  { fam: 'secondary', key: 'cSecondary', label: 'Secondary' }, { fam: 'accent', key: 'cAccent', label: 'Accent' },
  { fam: 'success', key: 'cSuccess', label: 'Success' }, { fam: 'warning', key: 'cWarning', label: 'Warning' },
  { fam: 'danger', key: 'cDanger', label: 'Danger' }, { fam: 'info', key: 'cInfo', label: 'Info' },
]

/**
 * The knobs, rebuilt for someone else's app (notes/knobs-research.md).
 *
 * Every size knob is a DIAL where ×1 is exactly their code, with the old preset
 * names as snap points; colour roles beyond the brand are pickers over the
 * families their own sheet contains (a row appears only when the family
 * exists); fonts pick a family. Nothing here is a kit concept: each row is
 * measured to move something in a real build (mapping.test knobEffect).
 *
 * At rest a row shows a quiet dot — "as in your code"; once turned, "changed".
 */
export function SandboxPanel({ cfg, tokens, base, families, scheme, codeFonts = [], hasGradients = false, varNow, dispatch, onCollapse, onRandomize, onReset, history, radiiOnScreen, kitName, head }: Props) {
  const asIs = kitName ? 'as the kit ships it' : 'as in your code'
  const [openKey, setOpenKey] = useState<string | null>(null)
  // One colour picker open at a time. A flyout that IS one colour (the page
  // background, a secondary or accent family) opens with it; Brand leads with
  // its swatches, Status with its four rows.
  const [picker, setPicker] = useState<string | null>(null)
  const [fineOpen, setFineOpen] = useState(false)
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const set = (patch: Partial<Config>) => dispatch({ type: 'SET', patch })
  const setDial = (key: keyof Dials, v: number | string | undefined) => set({ sb: { ...cfg.sb, [key]: v } })
  const close = () => { setOpenKey(null); setAnchor(null) }
  const pickerProps = (k: string) => ({ open: picker === k, onToggle: () => setPicker((p) => (p === k ? null : k)) })

  const toggle = (key: string, rowEl: HTMLElement | null) => {
    if (openKey === key) { close(); return }
    const r = rowEl?.getBoundingClientRect()
    setAnchor(r ? { top: r.top - 6, left: r.right + 10 } : null)
    setOpenKey(key)
    setPicker(key === 'background' || key === 'cSecondary' || key === 'cAccent' ? key : null)
  }
  useLayoutEffect(() => {
    const el = popRef.current
    if (!el || !anchor) return
    const maxTop = window.innerHeight - el.offsetHeight - 12
    if (anchor.top > maxTop) el.style.top = `${Math.max(12, maxTop)}px`
  }, [anchor, openKey, picker])  // a picker opening makes the flyout taller
  useEffect(() => {
    if (!openKey) return
    const onDown = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.fmrow, .fmrow__pop')) close() }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const onMove = () => close()
    // The panel scrolling under an anchored flyout moves the anchor away, so
    // close; a scroll INSIDE the flyout (a long font list) is browsing, not leaving.
    const onScroll = (e: Event) => { if (!(e.target instanceof Element && e.target.closest('.fmrow__pop'))) close() }
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onMove); document.addEventListener('scroll', onScroll, true)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); window.removeEventListener('resize', onMove); document.removeEventListener('scroll', onScroll, true) }
  }, [openKey])

  const atRest = (Object.keys(base) as (keyof Config)[]).every((k) => k === 'sb' ? JSON.stringify(cfg.sb) === JSON.stringify(base.sb) : cfg[k] === base[k])
  const brandChanged = cfg.cPrimary.toLowerCase() !== base.cPrimary.toLowerCase()
  const themeOf = (hex: string) => THEMES.find((t) => t.hex.toLowerCase() === hex.toLowerCase())

  /* Rows: label · value · state · flyout content */
  interface Row { key: string; sec?: string; label: string; value: React.ReactNode; changed: boolean; dot?: React.ReactNode; body: () => React.ReactNode; wide?: boolean; quick?: React.ReactNode }
  const rows: Row[] = []

  // ── Colour ──
  // A greyscale build has no brand family at all: the row says so instead of
  // wearing our default Cobalt as if it were theirs (slick: 3 colours, all grey).
  const noBrandInCss = !!families && families.centreId?.brand === undefined && !brandChanged
  rows.push({
    key: 'brand', sec: 'Colour', label: 'Brand', changed: brandChanged,
    value: noBrandInCss ? 'None in your CSS' : themeOf(cfg.cPrimary)?.label ?? nameColor(tokens.primaryHex),
    // The Brand dot is the knob's own value: any family member's live var can
    // be a same-hue outlier (a syntax navy) and read darker than the pick.
    dot: <span className={`fmrow__dot ${noBrandInCss ? 'fmrow__dot--none' : ''}`} style={noBrandInCss ? undefined : { background: cfg.cPrimary }} />,
    body: () => (
      <>
        {noBrandInCss && <p className="sbp__hint" style={{ marginTop: 0 }}>Your CSS has no colour near a brand role, so there is nothing for this knob to move. Hue, Saturation and Contrast still reach every colour the page does have.</p>}
        <div className="fmpop__grid">
          {THEMES.map((t) => (
            <button key={t.id} type="button" className={`menu__item fmopt ${themeOf(cfg.cPrimary)?.id === t.id ? 'menu__item--on' : ''}`} onClick={() => { dispatch({ type: 'APPLY_COLOR_THEME', id: t.id }); close() }}>
              <span className="fmopt__viz"><span className="fmrow__dot" style={{ background: t.hex }} /></span>
              <span className="fmopt__label">{t.label}</span>
              {themeOf(cfg.cPrimary)?.id === t.id && <Check size={14} strokeWidth={2.5} className="fmopt__check" />}
            </button>
          ))}
        </div>
        <ColorField label="Brand colour" value={cfg.cPrimary} base={base.cPrimary} onChange={(hex) => set({ cPrimary: hex as Config['cPrimary'] })} {...pickerProps('brand')} />
        {brandChanged && <button type="button" className="btn btn--ghost btn--sm sbp__reset" onClick={() => set({ cPrimary: base.cPrimary })}>Back to your code ({base.cPrimary})</button>}
      </>
    ),
  })
  // Secondary and accent are one row each; the STATUS colours are a set — one
  // row, one dot per family the sheet has, the pickers stacked in the flyout.
  // In any grown design system they are the standard four; a row each was
  // three rows saying "green, amber, red".
  const famState = (f: (typeof FAMILY_ROWS)[number]) => {
    const centre = families?.centre[f.fam]
    if (!centre) return null
    const centreHex = formatCssColor({ ...centre, a: 1 })
    const cur = (cfg.sb[f.key] as string | undefined) ?? centreHex
    const id = families?.centreId?.[f.fam]
    const live = (id !== undefined ? varNow?.(id) : undefined) ?? cur
    return { ...f, centreHex, cur, live, changed: cur.toLowerCase() !== centreHex.toLowerCase() }
  }
  const famPicker = (f: NonNullable<ReturnType<typeof famState>>, hint = true) => (
    <Fragment key={f.key}>
      <ColorField label={`${f.label} colour`} value={f.cur} base={f.centreHex} onChange={(hex) => setDial(f.key, hex)} {...pickerProps(f.key)} />
      {hint && <p className="sbp__hint">Every {f.label.toLowerCase()}-family colour in your CSS moves with this one; its most-used member is {f.centreHex}.</p>}
      {cfg.sb[f.key] && <button type="button" className="btn btn--ghost btn--sm sbp__reset" onClick={() => setDial(f.key, undefined)}>Back to your code{hint ? '' : ` (${f.label.toLowerCase()})`}</button>}
    </Fragment>
  )
  for (const f of FAMILY_ROWS.filter((x) => x.fam === 'secondary' || x.fam === 'accent').map(famState)) {
    if (!f) continue
    rows.push({ key: f.key, label: f.label, changed: f.changed, value: nameColor(f.cur as `#${string}`), dot: <span className="fmrow__dot" style={{ background: f.live }} />, body: () => famPicker(f) })
  }
  const status = FAMILY_ROWS.filter((x) => x.fam !== 'secondary' && x.fam !== 'accent').map(famState).filter((x): x is NonNullable<typeof x> => !!x)
  if (status.length) {
    rows.push({
      key: 'status', label: 'Status', changed: status.some((f) => f.changed),
      value: <span className="fmrow__dots">{status.map((f) => <span key={f.key} className="fmrow__dot" style={{ background: f.live }} title={`${f.label}: ${f.live}`} />)}</span>,
      body: () => (
        <>
          {status.map((f) => famPicker(f, false))}
          <p className="sbp__hint">Every colour of a status family in your CSS moves with its picker; the dots show each family's most-used member.</p>
          {/* The other colour families (card tints, categories, chart series)
              have no picker of their own. They used to get a row that looked
              like a knob and turned nothing; what is true about them is here. */}
          {!!families?.palette?.length && <p className="sbp__hint">{families.palette.length} other colour famil{families.palette.length === 1 ? 'y' : 'ies'} (tints, categories, chart series) {kitName ? 'stay as the kit ships them.' : 'are left alone here; Hue, Saturation and Contrast move them.'}</p>}
        </>
      ),
    })
  }
  // Background: a colour, not a ΔL. The canvas their page declares (html/body)
  // is the centre; a pick moves it and every background neutral in its
  // lightness zone — cards and surfaces keep their step above the page.
  if (families?.canvas) {
    const canvasHex = formatCssColor({ ...families.canvas, a: 1 })
    const cur = cfg.sb.cBackground ?? canvasHex
    const live = (families.canvasId !== undefined ? varNow?.(families.canvasId) : undefined) ?? cur
    rows.push({
      key: 'background', label: 'Background', changed: cur.toLowerCase() !== canvasHex.toLowerCase(),
      value: nameColor(cur as `#${string}`), dot: <span className="fmrow__dot fmrow__dot--ring" style={{ background: live }} />,
      body: () => (
        <>
          <ColorField label="Page background" value={cur} base={canvasHex} ring onChange={(hex) => setDial('cBackground', hex)} {...pickerProps('background')} />
          <p className="sbp__hint">Your page paints {canvasHex} behind everything; surfaces and cards near that lightness move with it, so their step above the page stays.</p>
          {cfg.sb.cBackground && <button type="button" className="btn btn--ghost btn--sm sbp__reset" onClick={() => setDial('cBackground', undefined)}>Back to your code ({canvasHex})</button>}
        </>
      ),
    })
  }
  // The stops a few dials show at rest, one click each, the way shadcn's
  // Create names its radii; the slider in the flyout keeps everything between.
  // The words are the dial's own snap names, so a stop and its snap agree.
  const QUICK: Partial<Record<keyof Dials, number[]>> = { radius: [0, 0.5, 1, 1.5], space: [0.75, 1, 1.25] }
  const dialRow = (spec: DialSpec, sec?: string): Row => {
    const v = (cfg.sb[spec.key] ?? DEFAULT_DIALS[spec.key]) as number
    const bv = (base.sb[spec.key] ?? DEFAULT_DIALS[spec.key]) as number
    const stops = QUICK[spec.key]?.map((at) => spec.snaps.find((x) => x.at === at)).filter((x): x is NonNullable<typeof x> => !!x)
    const quick = stops?.length ? (
      <div className="fmquick" role="group" aria-label={`${spec.label} stops`}>
        {stops.map((x) => {
          const on = Math.abs(v - x.at) <= spec.step * 1.01
          const word = x.label === 'as is' ? 'As is' : x.label
          return <button key={x.at} type="button" className={`fmquick__stop ${on ? 'fmquick__stop--on' : ''}`} aria-pressed={on} title={x.label === 'as is' ? asIs : `${spec.label}: ${x.label} (${fmtDial(spec, x.at)})`} onClick={() => setDial(spec.key, x.at)}>{word}</button>
        })}
      </div>
    ) : undefined
    return {
      key: spec.key, sec, label: spec.label, changed: v !== bv, value: fmtDial(spec, v), quick,
      body: () => (
        <div className="sbp__dial">
          {spec.key === 'radius' && radiiOnScreen !== undefined && radiiOnScreen <= 3 && (
            <p className="sbp__hint" style={{ marginTop: 0, maxWidth: 'none' }}>{radiiOnScreen === 0 ? 'Nothing on this screen paints a rounded corner' : `Only ${radiiOnScreen} element${radiiOnScreen === 1 ? '' : 's'} on this screen paint${radiiOnScreen === 1 ? 's' : ''} a rounded corner`}, so this dial has little visible to move. It scales the radii your CSS has; square corners stay square.</p>
          )}
          <div className="sbp__dial-row">
            <input type="range" min={spec.min} max={spec.max} step={spec.step} value={v} onChange={(e) => setDial(spec.key, parseFloat(e.target.value))} aria-label={spec.label} list={`snaps-${spec.key}`} />
            <datalist id={`snaps-${spec.key}`}>{spec.snaps.map((s) => <option key={s.at} value={s.at} label={s.label} />)}</datalist>
          </div>
          <div className="sbp__snaps">
            {spec.snaps.map((s) => (
              <button key={s.at} type="button" className={`sbp__snap ${nearestSnap(spec, v)?.at === s.at ? 'sbp__snap--on' : ''}`} onClick={() => setDial(spec.key, s.at)}>{s.label === 'as is' ? asIs : s.label}</button>
            ))}
          </div>
          <div className="sbp__dial-foot"><span>{fmtDial(spec, v)}</span>{v !== bv && <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDial(spec.key, bv)}>Reset</button>}</div>
        </div>
      ),
    }
  }
  // On a kit, Hue / Saturation / Contrast have no CSS of somebody's to move
  // (MERGE-INTO-UISANDBOX.md); shown anyway when a shared link turned one.
  const ownBuildOnly = (key: string) => (key === 'hue' || key === 'sat' || key === 'contrast') && !!kitName && (cfg.sb[key] ?? DEFAULT_DIALS[key]) === (base.sb[key] ?? DEFAULT_DIALS[key])
  for (const spec of DIALS.filter((d) => d.section === 'Colour' && (d.key !== 'gradAngle' || hasGradients) && !ownBuildOnly(d.key))) rows.push(dialRow(spec))
  if (scheme && (scheme.media || scheme.hooks.length)) {
    const cur = cfg.sb.dark
    rows.push({
      key: 'dark', label: 'Dark mode', changed: cur !== base.sb.dark, value: cur === 'dark' ? 'Dark' : cur === 'light' ? 'Light' : 'as is',
      body: () => (
        <div className="fmpop__list">
          {([[undefined, 'as is', 'whatever your page does on its own'], ['dark', 'Dark', 'your own dark scheme, switched on'], ['light', 'Light', 'your own light scheme, forced']] as const).map(([id, label, sub]) => (
            <button key={String(id)} type="button" className={`menu__item fmopt ${cur === id ? 'menu__item--on' : ''}`} onClick={() => { setDial('dark', id); close() }} title={sub}>
              <span className="fmopt__label">{label}</span>{cur === id && <Check size={14} strokeWidth={2.5} className="fmopt__check" />}
            </button>
          ))}
          <p className="sbp__hint">Found in your CSS: {[scheme.media ? 'prefers-color-scheme' : null, ...scheme.hooks.map(([a, d]) => (a === 'class' ? `.${d}` : `[${a}="${d}"]`))].filter(Boolean).join(' · ')}.</p>
        </div>
      ),
    })
  }
  rows.push({
    key: 'neutral', label: 'Grey tint', changed: cfg.neutral !== base.neutral, value: cfg.neutral === 'auto' ? 'Follows brand' : 'Neutral',
    body: () => (
      <div className="fmpop__list">
        {([['neutral', 'Neutral', 'greys stay as they are'], ['auto', 'Follows brand', 'greys take a whisper of the brand hue']] as const).map(([id, label, sub]) => (
          <button key={id} type="button" className={`menu__item fmopt ${cfg.neutral === id ? 'menu__item--on' : ''}`} onClick={() => { set({ neutral: id }); close() }} title={sub}>
            <span className="fmopt__label">{label}</span>{cfg.neutral === id && <Check size={14} strokeWidth={2.5} className="fmopt__check" />}
          </button>
        ))}
      </div>
    ),
  })

  // ── Type ──
  const fontRow = (key: 'fontDisplay' | 'fontBody', label: string): Row => ({
    key, sec: key === 'fontDisplay' ? 'Type' : undefined, label, changed: cfg[key] !== base[key],
    value: cfg[key].replace(/^Custom: /, ''),
    body: () => <FontPicker inline value={cfg[key]} inCode={codeFonts} groups={key === 'fontDisplay' ? DISPLAY_GROUPS : BODY_FONTS} onChange={(f) => { set({ [key]: f }); close() }} />,
    wide: true,
  })
  rows.push(fontRow('fontDisplay', 'Heading font'), fontRow('fontBody', 'Text font'))
  // Type as a pair (decision 216): a maker picks a heading and text face that
  // belong together, not two fonts from two lists. The pairs are the looks'
  // own, plus the app's; each font alone stays under More.
  // Inter as well: the looks keep off it (it is the default the tells name),
  // but a maker who wants it should not have to dig for it under More.
  const pairs: Array<[string, string]> = ([[base.fontDisplay, base.fontBody], ['Inter', 'Inter']] as Array<[string, string]>).concat(DIRECTIONS.flatMap((d) => d.fonts))
    .filter((p, i, a) => a.findIndex((q) => q[0] === p[0] && q[1] === p[1]) === i)
  const pairName = (d: string, b: string) => (d === b ? d : `${d} + ${b}`).replace(/Custom: /g, '')
  rows.push({
    key: 'pair', label: 'Type', changed: cfg.fontDisplay !== base.fontDisplay || cfg.fontBody !== base.fontBody,
    value: pairName(cfg.fontDisplay, cfg.fontBody),
    body: () => (
      <div className="fmpop__list">
        {pairs.map(([d, b], i) => {
          const on = cfg.fontDisplay === d && cfg.fontBody === b
          return (
            <button key={`${d}|${b}`} type="button" className={`menu__item fmopt ${on ? 'menu__item--on' : ''}`} onClick={() => { set({ fontDisplay: d, fontBody: b }); close() }}>
              <span className="fmopt__label">{pairName(d, b)}{i === 0 ? ' (yours)' : ''}</span>{on && <Check size={14} strokeWidth={2.5} className="fmopt__check" />}
            </button>
          )
        })}
      </div>
    ),
  })
  for (const spec of DIALS.filter((d) => d.section === 'Type')) rows.push(dialRow(spec))
  // ── Shape ──
  DIALS.filter((d) => d.section === 'Shape').forEach((spec, i) => rows.push(dialRow(spec, i === 0 ? 'Shape' : undefined)))

  // What most people turn first, on top and in this order (the same few
  // shadcn's own Create leads with: theme, base colour, fonts, radius, plus
  // the page and the density). The rest is Fine-tune, folded: nineteen rows
  // of equal weight read as nineteen equal decisions.
  // Four knobs in a maker's words, plus their own dark mode (decision 216):
  // Colour, Type, Shape, Space. The grey tint, the background, each font
  // alone and every dial are under More, still one click away.
  const ESSENTIAL = ['brand', 'pair', 'radius', 'space', 'dark']
  const PLAIN: Record<string, string> = { brand: 'Colour', radius: 'Shape', space: 'Space' }
  const GROUP: Record<string, 'Colour' | 'Type' | 'Shape'> = { fontDisplay: 'Type', fontBody: 'Type', type: 'Type', lineHeight: 'Type', tracking: 'Type', weight: 'Type', borderWidth: 'Shape', shadow: 'Shape', motion: 'Shape' }
  const essential = ESSENTIAL.map((k) => rows.find((r) => r.key === k)).filter((r): r is Row => !!r).map((r) => ({ ...r, sec: undefined, label: PLAIN[r.key] ?? r.label }))
  const rest = rows.filter((r) => !ESSENTIAL.includes(r.key)).map((r) => ({ ...r, grp: GROUP[r.key] ?? 'Colour' }))
  const fine = (['Colour', 'Type', 'Shape'] as const).flatMap((g) => rest.filter((r) => r.grp === g).map((r, i) => ({ ...r, sec: i === 0 ? g : undefined })))
  const fineChanged = fine.filter((r) => r.changed).length
  // A Fine-tune knob that gets turned from elsewhere (Shuffle, a shared link,
  // a preset) opens the fold, so a change is never hidden; closing it again
  // is the user's call.
  const anyFine = fineChanged > 0
  useEffect(() => { if (anyFine) setFineOpen(true) }, [anyFine])
  const renderRow = (r: Row) => (
    <Fragment key={r.key}>
      {r.sec && <div className="menu__label fmsec">{r.sec}</div>}
      <div className={`fmrow ${openKey === r.key ? 'fmrow--open' : ''}`}>
        <button type="button" className="menu__item fmrow__head sbp__head" onClick={(e) => toggle(r.key, (e.currentTarget as HTMLElement).closest('.fmrow'))} aria-expanded={openKey === r.key}>
          <span className={`sbp__state ${r.changed ? 'sbp__state--changed' : ''}`} title={r.changed ? 'changed' : asIs} />
          <span className="fmrow__label">{r.label}</span>
          <span className="menu__value fmrow__val" title={String(r.value)}>
            {r.dot && <span className="fmrow__dot fmrow__dot--viz">{r.dot}</span>}
            <span className="fmrow__val-text">{r.value}</span>
          </span>
          <ChevronRight size={14} strokeWidth={2} className="fmrow__chev" />
        </button>
        {r.quick}
        {openKey === r.key && createPortal(
          <div ref={popRef} className={`menu fmrow__pop ${r.wide ? 'fmrow__pop--font' : ''}`} role="menu" style={anchor ? { position: 'fixed', top: anchor.top, left: anchor.left } : undefined}>
            {r.body()}
          </div>,
          document.body,
        )}
      </div>
    </Fragment>
  )

  return (
    <aside className="panel">
      <div className="card fmenu">
        <div className="fmenu__bar">
          <span className="fmenu__bar-title">{head ? 'Knobs' : kitName ? `${kitName} · knobs` : 'Your app · knobs'}</span>
          <button type="button" className="btn btn--ghost btn--icon fmenu__collapse" onClick={onCollapse} aria-label="Collapse" title="Collapse for a full-width preview"><PanelLeftClose size={15} strokeWidth={1.75} /></button>
        </div>
        <div className="fmenu__rows">
          {head && <div className="fmhead">{head}</div>}
          {essential.map(renderRow)}
          {fine.length > 0 && (
            <button type="button" className="menu__label fmsec fmsec--fold" onClick={() => setFineOpen((v) => !v)} aria-expanded={fineOpen}>
              <ChevronRight size={12} strokeWidth={2.25} className={`fmsec__chev ${fineOpen ? 'fmsec__chev--open' : ''}`} />
              More
              <span className="fmsec__count">{fineChanged ? `${fineChanged} changed` : fine.length}</span>
            </button>
          )}
          {fineOpen && fine.map(renderRow)}
        </div>
      </div>
      <div className="panel__foot">
        {history && (
          <span className="panel__history" role="group" aria-label="History">
            <button type="button" className="panel__hist" onClick={history.undo} disabled={!history.canUndo} title="Undo (⌘Z)" aria-label="Undo"><Undo2 size={15} strokeWidth={1.75} /></button>
            <button type="button" className="panel__hist" onClick={history.redo} disabled={!history.canRedo} title="Redo (⇧⌘Z)" aria-label="Redo"><Redo2 size={15} strokeWidth={1.75} /></button>
          </span>
        )}
        <button type="button" className="btn btn--secondary panel__shuffle" onClick={onRandomize} title="Shuffle: a random stand on every knob"><Shuffle size={15} strokeWidth={1.75} /><span>Shuffle</span></button>
        <button type="button" className="btn btn--ghost panel__reset" onClick={onReset} disabled={atRest} title={atRest ? 'Every knob is on your code' : 'Back to your code, every knob'}><RotateCcw size={15} strokeWidth={1.75} /><span>Reset</span></button>
      </div>
    </aside>
  )
}
