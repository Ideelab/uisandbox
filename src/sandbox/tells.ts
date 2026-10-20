/**
 * WHY IT LOOKS GENERIC: the tells of the "AI look", measured on the screen
 * (decision 216).
 *
 * Only what computed style can show, the way Adrian Krebs measured 1,590 Show
 * HN pages (adriankrebs.ch/blog/design-slop: DOM and computed-style checks,
 * no model judging screenshots). Each tell says whether the knobs fix it.
 * Layout tells (a centred hero with a badge, three identical icon cards,
 * numbered steps) are NOT claimed here: they are not reliably measured on an
 * app screen, where a row of figures is the point of a dashboard. They go to
 * the agent as don'ts instead (LAYOUT_DONTS), said as advice, not as a finding.
 */
import { parseCssColor } from './cssColor'

export interface Tell { id: string; what: string; knobs: boolean }

/** The fonts Krebs counts as the AI default. */
/* (and their variable builds: "Geist Variable", "InterVariable", "Inter var") */
const DEFAULT_FONTS = /^(inter|geist|space grotesk|instrument serif) ?(variable|var)?$/i
const EMOJI = /\p{Extended_Pictographic}/u

const first = (stack: string) => stack.split(',')[0]!.trim().replace(/^["']|["']$/g, '')

export function measureTells(doc: Document, brand: string, opts: { hasScheme?: boolean } = {}): Tell[] {
  const out: Tell[] = []
  const win = doc.defaultView
  if (!win || !doc.body) return out
  const cs = (el: Element) => win.getComputedStyle(el)
  const body = cs(doc.body)
  const font = first(body.fontFamily)
  const heading = doc.querySelector('h1,h2')
  const headFont = heading ? first(cs(heading).fontFamily) : font
  if (DEFAULT_FONTS.test(font) || DEFAULT_FONTS.test(headFont)) out.push({ id: 'font', what: `${DEFAULT_FONTS.test(headFont) ? headFont : font}, the font every AI app reaches for`, knobs: true })
  const b = parseCssColor(brand)
  if (b && b.C > 0.08 && b.H >= 255 && b.H <= 310) out.push({ id: 'accent', what: 'An indigo or violet brand, the default accent', knobs: true })
  if (b && b.C < 0.02 && b.L < 0.3 && /^geist ?(variable)?$/i.test(font)) out.push({ id: 'defaults', what: "shadcn's own defaults: near-black brand and Geist", knobs: true })
  // one pass over what is on screen
  let gradients = 0, glass = 0, leftBorders = 0, emoji = 0
  const els = doc.body.querySelectorAll('*')
  for (let i = 0; i < els.length && i < 4000; i++) {
    const el = els[i]!
    const r = el.getBoundingClientRect()
    if (r.width < 8 || r.height < 8) continue
    const s = cs(el)
    if (/gradient\(/.test(s.backgroundImage)) gradients++
    if (s.backdropFilter && s.backdropFilter !== 'none') glass++
    const lw = parseFloat(s.borderLeftWidth)
    if (lw >= 3 && parseFloat(s.borderTopWidth) === 0 && parseFloat(s.borderRightWidth) === 0) {
      const c = parseCssColor(s.borderLeftColor)
      if (c && c.C > 0.05) leftBorders++
    }
  }
  for (const el of doc.body.querySelectorAll('h1,h2,h3,h4,li,button,a,[class*="card"] *')) {
    const t = el.childNodes.length === 1 && el.firstChild?.nodeType === 3 ? el.textContent ?? '' : ''
    if (EMOJI.test(t) && !/^[©®™]+$/.test(t.trim())) emoji++
  }
  if (gradients >= 2) out.push({ id: 'gradients', what: `Gradients on ${gradients} elements`, knobs: false })
  if (glass) out.push({ id: 'glass', what: `Frosted glass on ${glass} element${glass === 1 ? '' : 's'}`, knobs: false })
  if (leftBorders >= 2) out.push({ id: 'left-border', what: `Coloured left borders on ${leftBorders} blocks`, knobs: false })
  if (emoji >= 2) out.push({ id: 'emoji', what: `Emoji used as icons (${emoji})`, knobs: false })
  const bg = parseCssColor(body.backgroundColor)
  if (bg && bg.a > 0.5 && bg.L < 0.25 && !opts.hasScheme) out.push({ id: 'dark-only', what: 'Dark mode only, with no light one', knobs: false })
  return out
}

/** For the agent, as advice: the layout tells no knob can change. */
export const LAYOUT_DONTS = [
  'a centred hero with a small badge above the headline',
  'three or four identical cards, each with an icon in a tinted square on top',
  'numbered 1-2-3 steps on a landing page (a row of figures is fine where the figures are the point)',
  'coloured left borders, glows and frosted glass as decoration',
  'emoji as icons',
]
