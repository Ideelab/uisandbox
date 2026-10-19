/**
 * Look: another kit's own start values on what the stage shows (merge phase
 * 3, the brief's "Look dropdown"). shadcn/ui's components in Bootstrap's look
 * are shadcn's markup with Bootstrap's #0d6efd, its system stack and its
 * .375rem corners.
 *
 * Every value is the kit's own, read by the engine's start cards from the
 * kit's package (scripts/kit-looks.mjs → looks.json), never typed. A look
 * moves only what a knob can carry, through the knobs, so it is undone like
 * any knob and exported like any knob: brand, background, the status colours
 * the stage has, the body font when the knobs can load it, and the corners
 * as a radius multiplier. What a look cannot set, it leaves as it was.
 */
import LOOKS from './looks.json'
import type { Config } from '../tokens/types'
import { ALL_FONTS, SYSTEM_FONT } from '../tokens/fonts'
import { toPx } from '../sandbox/mapping'

export interface Look { id: string; name: string; values: Partial<Record<'brand' | 'page' | 'success' | 'warning' | 'danger' | 'fontBody' | 'radius', string>> }
export const looks: Look[] = LOOKS as Look[]

const SYSTEM = /^(system-ui|-apple-system|blinkmacsystemfont|ui-sans-serif|sans-serif)$/i

/** The first family in a stack the knobs can load: the system stack, or one
 *  of the fonts the font picker offers. None: the font is left alone. */
export function lookFont(stack: string): string | null {
  for (const raw of stack.split(',')) {
    const f = raw.trim().replace(/^["']|["']$/g, '')
    if (SYSTEM.test(f)) return SYSTEM_FONT
    const known = ALL_FONTS.find((x) => x.toLowerCase() === f.toLowerCase())
    if (known) return known
  }
  return null
}

/** `cfg` with the look applied. `basePx` is the radius the stage's corners
 *  are measured against (its kit's own, or the build's most-used radius). */
export function applyLook(cfg: Config, look: Look, basePx: number | null): Config {
  const v = look.values
  const sb = { ...cfg.sb }
  const out: Config = { ...cfg, sb }
  if (v.brand) out.cPrimary = v.brand as Config['cPrimary']
  if (v.page) sb.cBackground = v.page
  if (v.success) sb.cSuccess = v.success
  if (v.warning) sb.cWarning = v.warning
  if (v.danger) sb.cDanger = v.danger
  const font = v.fontBody ? lookFont(v.fontBody) : null
  if (font) { out.fontBody = font; out.fontDisplay = font }
  const px = v.radius ? toPx(v.radius)?.px ?? null : null
  if (px != null && basePx) sb.radius = Math.min(2, Math.max(0, Math.round((px / basePx) * 20) / 20))
  return out
}
