/**
 * What you turned on a kit, carried to your own app when you bring it.
 *
 * The knobs were built for it: a colour or a font is an absolute pick, and a
 * dial is a multiplier on whatever the build has, centred on ×1 = as it is. So
 * Brand → #e11d48 means the same on any build, and Radius ×2 doubles THEIR
 * corners. Only what was turned travels; every knob left alone starts where
 * the new build's own code puts it.
 */
import { DIALS } from '../sandbox/dials'
import type { Config } from '../tokens/types'

const EXTRA: Array<[string, string]> = [
  ['bgTone', 'Background tone'], ['dark', 'Dark mode'], ['cBackground', 'Background'],
  ['cPrimary', 'Brand'], ['cSecondary', 'Secondary'], ['cAccent', 'Accent'], ['cSuccess', 'Success'],
  ['cWarning', 'Warning'], ['cDanger', 'Danger'], ['cInfo', 'Info'],
  ['fontDisplay', 'Display font'], ['fontBody', 'Body font'], ['radius', 'Radius'],
  ['typeScale', 'Text size'], ['neutral', 'Grey tint'], ['colorTheme', 'Colour theme'],
]
/** The name the panel gives a knob, for every place that lists knobs. */
export const KNOB_LABEL: Record<string, string> = Object.fromEntries([...DIALS.map((d) => [d.key, d.label] as [string, string]), ...EXTRA])
/** A knob a person turned, as opposed to bookkeeping that moves with one:
 *  `colorTheme` is the preset name a Brand pick sets beside the colour. */
export const isShownKnob = (key: string) => key !== 'colorTheme'
export const knobLabel = (key: string) => { const k = key.replace(/^sb\./, ''); return KNOB_LABEL[k] ?? k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()) }

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** The knobs where two configs differ: a top-level key as itself, a dial as
 *  `sb.<key>`. Namespaced on purpose: `radius` is both a top-level key (the
 *  radius style) and a dial (the multiplier), and the first version of this
 *  carried the wrong one. */
export function differingKeys(a: Config, b: Config): string[] {
  const keys: string[] = []
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof Config>) {
    if (k !== 'sb' && !same(a[k], b[k])) keys.push(k)
  }
  const sa = a.sb as unknown as Record<string, unknown>, sb = b.sb as unknown as Record<string, unknown>
  for (const k of new Set([...Object.keys(sa), ...Object.keys(sb)])) if (!same(sa[k], sb[k])) keys.push(`sb.${k}`)
  return keys
}

/** `target` with `keys` taken from `source` — a top-level knob or a dial. */
export function withKeys(target: Config, source: Config, keys: Iterable<string>): Config {
  const out = { ...target, sb: { ...target.sb } } as unknown as Record<string, unknown> & { sb: Record<string, unknown> }
  const src = source as unknown as Record<string, unknown>, ssb = source.sb as unknown as Record<string, unknown>
  for (const k of keys) { if (k.startsWith('sb.')) out.sb[k.slice(3)] = ssb[k.slice(3)]; else out[k] = src[k] }
  return out as unknown as Config
}

export function carryOver(fromBase: Config, fromCfg: Config, toBase: Config): { cfg: Config; keys: string[] } {
  const keys = differingKeys(fromBase, fromCfg)
  return { cfg: withKeys(toBase, fromCfg, keys), keys }
}
