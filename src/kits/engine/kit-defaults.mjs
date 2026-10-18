/**
 * WHERE EACH SYSTEM ITSELF BEGINS.
 *
 * The start screen used to offer four moods we composed. This reads, for every
 * kit that renders, the kit's OWN out-of-the-box values: the colour its
 * primary button ships in, the typeface its body copy ships in, the corner its
 * controls ship with. Nothing typed from memory: every value below is pulled
 * from the fetched copy of the kit's package, through the same var maps the
 * rest of the tool routes into. Pick "Bootstrap" on the start screen and you
 * begin where Bootstrap begins: #0d6efd, its system stack, .375rem corners.
 *
 * A kit that publishes no value for a role simply has a gap, and the card's
 * record lines carry only what exists. A REQUIRED var that has gone missing
 * from a fetched package is a build error, so a kit renaming its tokens
 * cannot silently turn into a card of stale hexes.
 */
import { oklchStrToHex } from './color.mjs'

/* the vars each kit's defaults live in. `need` throws when absent, the rest
 * skip: absence of an optional var is a fact about the kit, not a failure. */
const TABLE = {
  /* Tailwind the framework names no house colour, but Tailwind Plus — their
     own component kit — dresses every primary in indigo-600: the buttons are
     bg-indigo-600, the badges indigo, the logo is requested at
     ?color=indigo&shade=600. The FAMILY choice is theirs; the values are
     still read from the fetched theme.css, never typed. Greys likewise:
     their components set text in gray-900/500 on white with gray-200 rules. */
  tailwind: { stack: ['tailwind'],
    vars: { brand: '--color-indigo-600', page: '--color-white', ink: '--color-gray-900',
      inkMuted: '--color-gray-500', line: '--color-gray-200',
      fontBody: '--font-sans', radius: '--radius-md' },
    need: ['brand', 'ink', 'fontBody'] },
  daisyui: { stack: ['tailwind', 'daisyui'],
    vars: { brand: '--color-primary', page: '--color-base-100', ink: '--color-base-content',
      line: '--color-base-300', success: '--color-success', warning: '--color-warning',
      danger: '--color-error', radius: '--radius-field' },
    need: ['brand', 'page', 'ink'] },
  bootstrap: { stack: ['bootstrap'],
    vars: { brand: '--bs-primary', page: '--bs-body-bg', ink: '--bs-body-color',
      inkMuted: '--bs-secondary-color', line: '--bs-border-color', success: '--bs-success',
      warning: '--bs-warning', danger: '--bs-danger', fontBody: '--bs-body-font-family',
      radius: '--bs-border-radius' },
    need: ['brand', 'page', 'ink', 'fontBody'] },
  shadcn: { stack: ['tailwind', 'shadcn'],
    vars: { brand: '--primary', page: '--background', ink: '--foreground',
      inkMuted: '--muted-foreground', line: '--border', danger: '--destructive',
      radius: '--radius' },
    need: ['brand', 'page', 'ink'] },
  material: { stack: ['material'],
    vars: { brand: '--md-sys-color-primary', page: '--md-sys-color-surface',
      ink: '--md-sys-color-on-surface', inkMuted: '--md-sys-color-on-surface-variant',
      line: '--md-sys-color-outline-variant', danger: '--md-sys-color-error',
      fontBody: '--md-ref-typeface-plain', radius: '--md-sys-shape-corner-medium' },
    need: ['brand', 'page', 'ink', 'fontBody'] },
  radix: { stack: ['radix'],
    /* its accent lives per-family in the fetched ramps, not in one var; indigo
       is the accent its Theme component defaults to, so indigo step 9 is what
       an untouched Radix app paints its buttons */
    vars: { page: '--color-background', fontBody: '--default-font-family' },
    ramps: { brand: ['indigo', '9'], ink: ['gray', '12'], inkMuted: ['gray', '11'], line: ['gray', '6'] },
    need: ['page', 'fontBody'] },
  mantine: { stack: ['mantine'],
    vars: { brand: '--mantine-primary-color-filled', page: '--mantine-color-body',
      ink: '--mantine-color-text', inkMuted: '--mantine-color-dimmed',
      line: '--mantine-color-default-border', danger: '--mantine-color-error',
      fontBody: '--mantine-font-family', radius: '--mantine-radius-default' },
    need: ['brand', 'page', 'ink', 'fontBody'] },
  antd: { stack: ['antd'],
    vars: { brand: '--ant-color-primary', page: '--ant-color-bg-container',
      ink: '--ant-color-text', inkMuted: '--ant-color-text-tertiary',
      line: '--ant-color-border', success: '--ant-color-success', warning: '--ant-color-warning',
      danger: '--ant-color-error', fontBody: '--ant-font-family', radius: '--ant-border-radius' },
    need: ['brand', 'page', 'ink', 'fontBody'] },
}

const COLOUR_ROLES = new Set(['brand', 'page', 'ink', 'inkMuted', 'line', 'success', 'warning', 'danger'])

/** follow var(--x) and var(--x, fallback) pointers inside one var map */
function resolve(vars, value, hops = 0) {
  if (hops > 8 || typeof value !== 'string') return value
  const m = /^var\((--[a-z0-9-]+)\s*(?:,\s*([^)]+))?\)$/i.exec(value.trim())
  if (!m) return value
  const next = vars[m[1]] ?? m[2]
  return next == null ? value : resolve(vars, String(next), hops + 1)
}

/** any colour a kit publishes, to hex; alpha composites over the page */
function toHex(value, page = '#ffffff') {
  let v = String(value).trim().toLowerCase()
  if (v === 'white') return '#ffffff'
  if (v === 'black') return '#000000'
  if (v.startsWith('oklch(')) return oklchStrToHex(v)
  let m = /^#([0-9a-f]{3})$/.exec(v)
  if (m) return '#' + [...m[1]].map((c) => c + c).join('')
  m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/.exec(v)
  if (m) return '#' + m[1]
  m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\)$/.exec(v)
  if (m) {
    const a = m[4] == null ? 1 : parseFloat(m[4])
    const back = [1, 3, 5].map((i) => parseInt(toHex(page).slice(i, i + 2), 16))
    const mix = [m[1], m[2], m[3]].map((c, i) => Math.round(parseFloat(c) * a + back[i] * (1 - a)))
    return '#' + mix.map((c) => c.toString(16).padStart(2, '0')).join('')
  }
  return null
}

/** a published length to px: 6px, 0.375rem, calc(0.5rem * var(--mantine-scale)) */
function toPx(vars, value) {
  let v = resolve(vars, String(value).trim())
  const c = /^calc\(\s*([\d.]+)(px|rem)\s*\*\s*(.+?)\s*\)$/.exec(v)
  if (c) {
    const factor = parseFloat(resolve(vars, c[3])) || 1
    return Math.round(parseFloat(c[1]) * (c[2] === 'rem' ? 16 : 1) * factor)
  }
  const m = /^([\d.]+)(px|rem)?$/.exec(v)
  if (!m) return null
  return Math.round(parseFloat(m[1]) * (m[2] === 'rem' ? 16 : 1))
}

/**
 * The defaults for every kit in `ids`, from the fetched kit data.
 * -> { id: { id, name, stack, values, gap } }, values in the page's role
 * vocabulary, colours as hex, radius as px, fonts as the kit's stack string.
 */
export function kitDefaults(kits, ids) {
  const out = {}
  for (const id of ids) {
    const spec = TABLE[id]
    if (!spec) continue
    const kit = kits[id]
    const vars = kit?.modes?.light ?? {}
    const values = {}
    for (const [role, name] of Object.entries(spec.vars)) {
      let raw = vars[name]
      if (raw == null) {
        if (spec.need.includes(role)) throw new Error(`${id} no longer publishes ${name} — its start card would be stale; update kit-defaults.mjs`)
        continue
      }
      raw = resolve(vars, String(raw))
      if (COLOUR_ROLES.has(role)) {
        const hex = toHex(raw, resolve(vars, String(vars[spec.vars.page] ?? '#ffffff')))
        if (hex) values[role] = hex
        else if (spec.need.includes(role)) throw new Error(`${id}: could not read ${name} ("${raw}") as a colour`)
      } else if (role === 'radius') {
        const px = toPx(vars, raw)
        if (px != null) values.radius = `${px}px`
      } else if (role === 'fontBody') {
        values.fontBody = raw
        values.fontHeading = raw
      }
    }
    for (const [role, [family, step]] of Object.entries(spec.ramps ?? {})) {
      const hex = kit?.ramps?.[family]?.[step]
      if (!hex) throw new Error(`${id}: ramp ${family}/${step} missing — its start card would be stale`)
      values[role] = hex
    }
    out[id] = { id, name: kit?.name ?? id, stack: spec.stack, values }
  }
  return out
}
