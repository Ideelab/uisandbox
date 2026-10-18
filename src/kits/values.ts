/**
 * What the sandbox measured → the role values the kit engine takes.
 *
 * The engine's doctrine is that every value traces to an input or to the
 * kit's own published default, so this passes ONLY what was read off the
 * build. A role it has nothing for is left out, the engine falls back to what
 * the kit itself publishes, and MANIFEST.md says so. Inventing a plausible
 * focus ring here would be exactly the thing the engine refuses to do.
 *
 * Lengths go across in px, always. Most kits take a role as a CSS variable and
 * write it verbatim, where `8px` and `0.5rem` are equally fine. But Ant Design
 * takes seeds as NUMBERS and Radix takes choices, and the engine reads those
 * with `parseFloat`: `0.5rem` would reach Ant as a radius of half a pixel.
 */
import { pxOf, type Measured, type NamedRow } from '../export/measured'
import type { RoleValues } from './engine/generate.mjs'
import { parseCssColor, formatCssColor } from '../sandbox/cssColor'

/** Opaque hex, or nothing. A role colour that is translucent is not that role. */
function hex(v: string | undefined): string | undefined {
  if (!v) return undefined
  const c = parseCssColor(v)
  if (!c || c.a < 0.999) return undefined
  return formatCssColor(c)
}

/** A COMPUTED length in px, or nothing (`normal`, `auto` …). Only for what
 *  getComputedStyle returned, which is always px; a value out of their
 *  stylesheet can be rem and goes through `pxOf` instead. */
function px(v: string | undefined): number | undefined {
  if (!v) return undefined
  const m = v.trim().match(/^(-?\d*\.?\d+)px$/)
  return m ? parseFloat(m[1]!) : undefined
}

const named = (rows: NamedRow[], name: string) => rows.find((r) => r.name === name)?.value

export interface StatusColours { success?: string; warning?: string; danger?: string }

export function roleValues(m: Measured, status: StatusColours = {}): RoleValues {
  const v: RoleValues = {}
  const set = <K extends keyof RoleValues>(k: K, x: RoleValues[K] | undefined) => { if (x !== undefined && x !== '') v[k] = x }

  // Colour. `surface` in the measured palette is the GROUND the page sits on,
  // which the engine calls `page`; the engine's `surface` is a card lifted off
  // it, which the measured palette calls `surface-alt` (or `fill` when tinted).
  set('brand', hex(named(m.palette, 'primary') ?? m.brand))
  set('ink', hex(named(m.palette, 'text')))
  set('page', hex(named(m.palette, 'surface')))
  set('surface', hex(named(m.palette, 'surface-alt') ?? named(m.palette, 'fill')))
  set('inkMuted', hex(named(m.palette, 'text-muted')))
  set('line', hex(named(m.palette, 'border')))
  set('success', hex(status.success))
  set('warning', hex(status.warning))
  set('danger', hex(status.danger))

  // Type, from what the page actually PAINTS (the anchors), not from a
  // stylesheet census: a font declared in their CSS and never used is not
  // their body font.
  const body = m.anchors.type?.body
  const head = m.anchors.type?.display ?? m.anchors.type?.heading
  set('fontBody', body?.fontFamily)
  set('fontHeading', head?.fontFamily)
  const size = px(body?.fontSize)
  if (size) set('baseText', `${size}px`)
  // The engine's line height is a RATIO; the browser computes it in px.
  const lh = px(body?.lineHeight)
  if (lh && size) set('lineHeight', Math.round((lh / size) * 1000) / 1000)
  const w = head ? parseInt(head.fontWeight, 10) : NaN
  if (Number.isFinite(w)) set('fontWeight', w)

  // Shape. The radius a kit means is the one its controls and cards wear, so
  // the most-PAINTED step that is neither square nor a pill — not the smallest.
  const radius = m.radii
    .filter((r) => r.name !== 'none' && r.name !== 'full')
    .sort((a, b) => (b.painted ?? 0) - (a.painted ?? 0) || b.count - a.count)[0]
  // Out of their stylesheet, so it can be rem: Bootstrap's is `.375rem`.
  const rpx = radius ? pxOf(radius.value) ?? undefined : undefined
  if (rpx !== undefined) set('radius', `${rpx}px`)

  return v
}
