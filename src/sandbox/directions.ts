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
 * Six styles the way shadcn sets its own (Vega, Nova, Maia, Lyra, Mira): one
 * restrained SaaS sans each, and the difference in corners, density, depth
 * and weight. The first six were further apart (a serif, mono headings) and
 * read as six products, not six good dashboards (Alexander). They are also
 * the Preset list, so the panel and Pick a look name the same six.
 *
 * NO COLOUR. A look never sets the brand or the grey tint: six screens in six
 * colours are compared by colour, and the style under it goes unseen
 * (Alexander). All six wear the colour the knobs hold. Each holds two type
 * pairs, so Shuffle varies the fonts WITHIN a direction; still no Inter.
 *
 * Lock: keep my font leaves both fonts.
 */
import type { Config } from '../tokens/types'

export interface Direction {
  id: string
  name: string
  /** what it does, in a line a maker can read */
  what: string
  /** [display, body], each one the font picker offers */
  fonts: Array<[string, string]>
  /** the dials it turns, everything else stays as it is */
  sb: Partial<Record<'radius' | 'space' | 'shadow' | 'weight' | 'tracking' | 'lineHeight' | 'borderWidth' | 'type', number>>
}

export const DIRECTIONS: Direction[] = [
  { id: 'classic', name: 'Classic', what: 'balanced corners and spacing, a light shadow',
    fonts: [['Public Sans', 'Public Sans'], ['Hanken Grotesk', 'Hanken Grotesk']],
    sb: { radius: 1, space: 1, shadow: 0.6 } },
  { id: 'compact', name: 'Compact', what: 'dense, small corners, nearly flat: for a lot of data',
    fonts: [['IBM Plex Sans', 'IBM Plex Sans'], ['Source Sans 3', 'Source Sans 3']],
    sb: { radius: 0.6, space: 0.85, shadow: 0.2 } },
  { id: 'soft', name: 'Soft', what: 'round corners, roomy, a soft shadow',
    fonts: [['Figtree', 'Figtree'], ['Nunito Sans', 'Nunito Sans']],
    sb: { radius: 1.8, space: 1.2, shadow: 0.7 } },
  { id: 'sharp', name: 'Sharp', what: 'square corners, borders instead of shadows',
    fonts: [['Albert Sans', 'Albert Sans'], ['Public Sans', 'Public Sans']],
    sb: { radius: 0, space: 1, shadow: 0 } },
  { id: 'airy', name: 'Airy', what: 'generous space, open lines, barely a shadow',
    fonts: [['Manrope', 'Manrope'], ['DM Sans', 'DM Sans']],
    sb: { radius: 1.2, space: 1.3, shadow: 0.3, lineHeight: 1.06 } },
  { id: 'bold', name: 'Bold', what: 'firmer headings, tighter type, real depth',
    fonts: [['Plus Jakarta Sans', 'Plus Jakarta Sans'], ['Outfit', 'Outfit']],
    sb: { radius: 1, weight: 1, shadow: 1.3, tracking: -0.01 } },
]

export interface LookLocks { font: boolean }
/** Which type pair a direction is showing: Shuffle moves it. */
export type LookRoll = Record<string, { font: number }>

export const firstRoll = (): LookRoll => Object.fromEntries(DIRECTIONS.map((d) => [d.id, { font: 0 }]))

/** A new type pair for every direction, never the one it showed. */
export function reroll(roll: LookRoll, rnd: () => number = Math.random): LookRoll {
  const other = (n: number, cur: number) => (n < 2 ? cur : (cur + 1 + Math.floor(rnd() * (n - 1))) % n)
  return Object.fromEntries(DIRECTIONS.map((d) => {
    const r = roll[d.id] ?? { font: 0 }
    return [d.id, { font: other(d.fonts.length, r.font) }]
  }))
}

/** `cfg` with a direction applied, honouring the lock. Colour is never touched. */
export function applyDirection(cfg: Config, d: Direction, roll: { font: number } = { font: 0 }, locks: LookLocks = { font: false }): Config {
  const out: Config = { ...cfg, sb: { ...cfg.sb, ...d.sb } }
  if (!locks.font) {
    const [display, body] = d.fonts[roll.font % d.fonts.length]!
    out.fontDisplay = display
    out.fontBody = body
  }
  return out
}
