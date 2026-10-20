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
  { id: 'editorial', name: 'Editorial', what: 'serif headings, ink colour, sharp and flat',
    brands: ['#1f3a5f', '#2b4a3f', '#5b2333'], fonts: [['Newsreader', 'Source Sans 3'], ['Source Serif 4', 'Public Sans']],
    neutral: 'auto', sb: { radius: 0.25, space: 1.1, shadow: 0, lineHeight: 1.06 } },
  { id: 'swiss', name: 'Swiss', what: 'one strong colour, tight, square, heavier type',
    brands: ['#d62828', '#0057b8', '#111111'], fonts: [['IBM Plex Sans', 'IBM Plex Sans'], ['Public Sans', 'Public Sans']],
    neutral: 'neutral', sb: { radius: 0, space: 0.9, shadow: 0, weight: 1, tracking: -0.01 } },
  { id: 'calm', name: 'Calm', what: 'muted colour, airy, soft corners',
    brands: ['#4f7a65', '#4a6f8a', '#7a6a55'], fonts: [['Figtree', 'Figtree'], ['Albert Sans', 'Albert Sans']],
    neutral: 'auto', sb: { radius: 1.5, space: 1.2, shadow: 0.5, lineHeight: 1.1 } },
  { id: 'bold', name: 'Bold', what: 'saturated brand, heavy type, real depth',
    brands: ['#e11d48', '#ea580c', '#0d9488'], fonts: [['Plus Jakarta Sans', 'Plus Jakarta Sans'], ['Outfit', 'DM Sans']],
    neutral: 'neutral', sb: { radius: 1, weight: 1, shadow: 1.4, type: 1.04 } },
  { id: 'technical', name: 'Technical', what: 'mono headings, dense, small corners',
    brands: ['#0f766e', '#2563eb', '#16a34a'], fonts: [['JetBrains Mono', 'IBM Plex Sans'], ['Geist Mono', 'Hanken Grotesk']],
    neutral: 'neutral', sb: { radius: 0.4, space: 0.8, shadow: 0, borderWidth: 1 } },
  { id: 'soft', name: 'Soft', what: 'round, light, friendly',
    brands: ['#e8618c', '#3b82c4', '#d97706'], fonts: [['Nunito Sans', 'Nunito Sans'], ['Manrope', 'Manrope']],
    neutral: 'auto', sb: { radius: 2, space: 1.15, shadow: 0.6 } },
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
