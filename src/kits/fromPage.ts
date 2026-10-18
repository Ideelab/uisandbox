/**
 * A recognised kit's role values, read off the PAGE in that kit's own names.
 *
 * For a build on one of the nine, this is the authoritative source, ahead of
 * anything measured. The variable a role maps to (roles.mjs MAP) is by
 * definition what that kit's components read, and the sandbox has already
 * tokenised it — `--bs-success: #198754` is `var(--us-v42)` — so the computed
 * value follows any knob that was turned.
 *
 * What it replaces, measured on AdminLTE: the success family's centre was
 * #6a9955, 172 inline `color`s from the syntax highlighting in its docs pages,
 * against a --bs-success of #198754; and the most-painted border was #90a4ae
 * against a --bs-border-color of #dee2e6. A census of what is painted most is
 * the right question for a knob and the wrong one for "what is this kit's
 * success colour here".
 *
 * Ratios (elevation, space) are left out: they are multiples of the kit's own
 * step, and a computed variable is a length, not a multiple.
 */
import { ROLES, MAP, KIND, type RoleId } from './engine/roles.mjs'
import type { RoleValues } from './engine/generate.mjs'
import type { KitId } from './engine/detect.mjs'
import { parseCssColor, formatCssColor } from '../sandbox/cssColor'
import { pxOf } from '../export/measured'

export function readKitValues(doc: Document, kit: KitId): RoleValues {
  const cs = (doc.defaultView ?? globalThis).getComputedStyle(doc.documentElement)
  const map = MAP[kit] ?? {}
  const out: RoleValues = {}
  for (const role of ROLES) {
    const name = map[role.id]?.var
    if (!name) continue
    // A custom property's computed value substitutes var() but resolves no
    // units: `1rem` comes back as `1rem`, so lengths still go through pxOf.
    const raw = cs.getPropertyValue(name).trim()
    if (!raw) continue
    const v = asRole(role.id, raw)
    if (v !== undefined) out[role.id] = v
  }
  return out
}

function asRole(id: RoleId, raw: string): string | number | undefined {
  switch (KIND[id]) {
    case 'colour': {
      const c = parseCssColor(raw)
      return c && c.a >= 0.999 ? formatCssColor(c) : undefined
    }
    case 'length': {
      const n = pxOf(raw)
      return n === null ? undefined : `${n}px`
    }
    case 'number': {
      const n = parseFloat(raw)
      return Number.isFinite(n) ? n : undefined
    }
    case 'font': return raw
    default: return undefined   // ratios: a computed length is not a multiple
  }
}
