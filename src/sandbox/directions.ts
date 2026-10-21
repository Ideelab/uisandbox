/**
 * LOOKS: six directions a maker picks from, on their own screen (decision 216).
 *
 * The research behind it: makers see that their app looks like every AI app
 * and cannot name the few foundation choices that fix it; parallel options
 * beat serial tweaking for novices (Dow et al. 2010); named styles are the
 * starting point of every well-loved theme tool. So a look is a coherent set
 * of those choices, put through the same knobs everything else uses: undone
 * like any knob, exported like any knob, measured by Check 1:1 like any knob.
 *
 * Each direction holds a few brand colours and type pairs, so Shuffle varies
 * WITHIN a direction instead of rolling every knob at random. Kept away from
 * the tells on purpose: no indigo or violet brand, no Inter, and not the
 * cream-serif-terracotta set the anti-slop advice has itself made common.
 *
 * Six styles the way shadcn sets its own (Vega, Nova, Maia, Lyra, Mira): one
 * restrained SaaS sans each, and the difference in corners, density, depth
 * and colour. The first six were further apart (a serif, mono headings) and
 * read as six products, not six good dashboards (Alexander). They are also
 * the Preset list, so the panel and Pick a look name the same six.
 *
 * Locks: keep my colour leaves the brand and the grey tint where they are;
 * keep my font leaves both fonts.
 */
import type { Config } from '../tokens/types'

export interface Direction {
  id: string
  name: string
  /** what it does, in a line a maker can read */
  what: string
  brands: string[]
  /** [display, body], each one the font picker offers */
  fonts: Array<[string, string]>
  neutral: Config['neutral']
  /** the dials it turns, everything else stays as it is */
  sb: Partial<Record<'radius' | 'space' | 'shadow' | 'weight' | 'tracking' | 'lineHeight' | 'borderWidth' | 'type', number>>
}

export const DIRECTIONS: Direction[] = [
  { id: 'classic', name: 'Classic', what: 'balanced corners and spacing, a light shadow',
    brands: ['#2563eb', '#0f766e', '#c2410c'], fonts: [['Public Sans', 'Public Sans'], ['Hanken Grotesk', 'Hanken Grotesk']],
    neutral: 'neutral', sb: { radius: 1, space: 1, shadow: 0.6 } },
  { id: 'compact', name: 'Compact', what: 'dense, small corners, nearly flat: for a lot of data',
    brands: ['#0f766e', '#1d4ed8', '#be123c'], fonts: [['IBM Plex Sans', 'IBM Plex Sans'], ['Source Sans 3', 'Source Sans 3']],
    neutral: 'neutral', sb: { radius: 0.6, space: 0.85, shadow: 0.2 } },
  { id: 'soft', name: 'Soft', what: 'round corners, roomy, a soft shadow',
    brands: ['#2f72b3', '#15803d', '#db2777'], fonts: [['Figtree', 'Figtree'], ['Nunito Sans', 'Nunito Sans']],
    neutral: 'auto', sb: { radius: 1.8, space: 1.2, shadow: 0.7 } },
  { id: 'sharp', name: 'Sharp', what: 'square corners, borders instead of shadows',
    brands: ['#111827', '#0057b8', '#c2410c'], fonts: [['Albert Sans', 'Albert Sans'], ['Public Sans', 'Public Sans']],
    neutral: 'neutral', sb: { radius: 0, space: 1, shadow: 0 } },
  { id: 'airy', name: 'Airy', what: 'muted colour, generous space, barely a shadow',
    brands: ['#4a6f8a', '#4f7a65', '#7a6a55'], fonts: [['Manrope', 'Manrope'], ['DM Sans', 'DM Sans']],
    neutral: 'auto', sb: { radius: 1.2, space: 1.3, shadow: 0.3, lineHeight: 1.06 } },
  { id: 'bold', name: 'Bold', what: 'saturated colour, firmer headings, real depth',
    brands: ['#e11d48', '#cf4a0a', '#0b8276'], fonts: [['Plus Jakarta Sans', 'Plus Jakarta Sans'], ['Outfit', 'Outfit']],
    neutral: 'neutral', sb: { radius: 1, weight: 1, shadow: 1.3 } },
]

export interface LookLocks { colour: boolean; font: boolean }
/** Which brand and type pair a direction is showing: Shuffle moves these. */
export type LookRoll = Record<string, { brand: number; font: number }>

export const firstRoll = (): LookRoll => Object.fromEntries(DIRECTIONS.map((d) => [d.id, { brand: 0, font: 0 }]))

/** A new brand and type pair for every direction, never the one it showed. */
export function reroll(roll: LookRoll, rnd: () => number = Math.random): LookRoll {
  const other = (n: number, cur: number) => (n < 2 ? cur : (cur + 1 + Math.floor(rnd() * (n - 1))) % n)
  return Object.fromEntries(DIRECTIONS.map((d) => {
    const r = roll[d.id] ?? { brand: 0, font: 0 }
    return [d.id, { brand: other(d.brands.length, r.brand), font: other(d.fonts.length, r.font) }]
  }))
}

/** `cfg` with a direction applied, honouring the locks. */
export function applyDirection(cfg: Config, d: Direction, roll: { brand: number; font: number } = { brand: 0, font: 0 }, locks: LookLocks = { colour: false, font: false }): Config {
  const out: Config = { ...cfg, sb: { ...cfg.sb, ...d.sb } }
  if (!locks.colour) {
    out.cPrimary = d.brands[roll.brand % d.brands.length] as Config['cPrimary']
    out.neutral = d.neutral
  }
  if (!locks.font) {
    const [display, body] = d.fonts[roll.font % d.fonts.length]!
    out.fontDisplay = display
    out.fontBody = body
  }
  return out
}
