/**
 * THE PALETTES YOUR STACK ALREADY PUBLISHES.
 *
 * Ten colour pickers is a fine way to adjust a palette and a terrible way to
 * start one. What people want first is a family — "make it teal" — and the
 * temptation is to ship a handful of nice ones. That would be a palette opinion,
 * which is the one thing this tool may not have.
 *
 * It does not need one. Tailwind publishes seventeen colour families of eleven
 * steps. Radix publishes thirty-one hand-built twelve-step scales AND says what
 * each step is for. Open Props publishes sixteen, Mantine twelve. So a palette
 * here is one of theirs, and switching kits switches which are on offer.
 *
 * Nothing below is a list. Families are FOUND in what a kit publishes, split
 * into accents and neutrals by their own chroma, and the roles are read out of
 * the ramp — the extremes by position, the middle two by contrast against a
 * published standard.
 */
import { hexToOklch, oklchStrToHex, contrast, aaInk } from './color.mjs'
import { seedFrom } from './roles.mjs'

const hex = (v) => {
  const s = String(v ?? '').trim()
  if (/^#[0-9a-f]{6}$/i.test(s)) return s
  if (/^#[0-9a-f]{3}$/i.test(s)) return '#' + s.slice(1).split('').map((c) => c + c).join('')
  if (/^oklch\(/i.test(s)) return oklchStrToHex(s)
  return null
}

/* `--color-teal-600`, `--mantine-color-blue-6`, `--red-7`: one shape, three
 * prefixes, and the prefix is the only part that differs between kits. */
const STEP = /^--(?:color-|mantine-color-)?([a-z]+)-(\d{1,3})$/

/**
 * Every colour family a kit publishes, as ramps.
 * A family needs at least eight steps: fewer and it is a pair of shades, not a
 * scale, and reading roles out of it would be guessing.
 */
export function families(kit) {
  const found = {}
  for (const [name, value] of Object.entries(kit?.modes?.light ?? {})) {
    const m = STEP.exec(name)
    const h = m && hex(value)
    if (!h) continue
    ;(found[m[1]] ??= []).push([Number(m[2]), h])
  }
  /* Radix keeps its scales in one file per colour, so they arrive already
     separated rather than mixed into the theme block. */
  for (const [name, steps] of Object.entries(kit?.ramps ?? {})) {
    found[name] = Object.entries(steps).map(([s, v]) => [Number(s), v])
  }

  return Object.entries(found)
    .filter(([, steps]) => steps.length >= 8)
    .map(([name, steps]) => {
      const sorted = steps.sort((a, b) => a[0] - b[0])
      const ramp = sorted.map(([, v]) => v)
      /* the step NUMBERS travel with the ramp. They are the kit's own names for
         these colours — slate-400, gray-9 — and a menu that offers a swatch
         without one is a menu offering an anonymous colour. */
      const at = sorted.map(([n]) => n)
      const chroma = Math.max(...ramp.map((c) => hexToOklch(c)[1]))
      return { name, ramp, at, chroma, from: kit.name,
        /* their own chroma decides: a scale that never becomes colourful is the
           grey ramp, and every one of these kits ships several. */
        kind: chroma >= 0.05 ? 'accent' : 'neutral' }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** All of them, for the kits currently switched on, kit by kit. */
export const palettesFor = (ids, kits) =>
  ids.flatMap((id) => families(kits[id]).map((f) => ({ ...f, kit: id })))

/** The neutral whose hue sits closest to this accent — Radix's own "auto". */
export function matchNeutral(accent, neutrals, kit = null) {
  if (!neutrals.length) return null
  /* A light page needs a ramp that actually starts light. Mantine publishes a
     `dark` scale alongside its `gray` one — a dark-scheme ramp whose lightest
     step is #c9c9c9 — and hue-matching to it handed back a mid-grey page.
     Not a preference: a ground you cannot read black text on is not a ground. */
  const usable = neutrals.filter((n) => Math.max(...n.ramp.map((c) => hexToOklch(c)[0])) >= 0.93)
  const pool = usable.length ? usable : neutrals
  const [, , aH] = hexToOklch(solidOf(accent, kit))
  let best = null
  for (const n of pool) {
    const [, , nH] = hexToOklch(n.ramp[Math.floor(n.ramp.length / 2)])
    let d = Math.abs(aH - nH) % 360
    if (d > 180) d = 360 - d
    if (!best || d < best.d) best = { n, d }
  }
  return best.n
}

/**
 * Which step of a family is its SOLID — the one a button wears.
 *
 * There is no single derived rule that matches every kit, because their
 * conventions genuinely differ: Tailwind's oklch palette peaks at 400 and its
 * buttons use 600, Radix's peak IS its solid at step 9, Mantine's is 6. So the
 * kit is asked first. Radix publishes the answer — it is the same step its
 * data-accent-color selects, which we already read.
 *
 * Where a kit does not publish the step, the LABEL decides. A solid is the
 * step a filled button wears, and every kit here that does not publish one
 * writes a white label on that button — Bootstrap, Mantine, Ant, Material,
 * daisyUI, all of them. So the solid is the lightest step of the family on
 * which a white label clears 4.5:1: the same bar the rest of this file uses,
 * asked of the one thing that has to sit on top of the colour.
 *
 * The purest step is not that. Tailwind's oklch ramps peak at 400, so taking
 * the purest made the note above come true on the screen: every family came out
 * neon, two steps lighter than anything Tailwind's own buttons use. Matching
 * the kit's own brand lightness instead is worse again, because shadcn's brand
 * is a near-black with no chroma at all and every family came back as mud.
 *
 * Purest stays as the last resort, for a ramp where nothing clears — a family
 * of one colour, which is what your own hex becomes.
 */
const purest = (ramp) => ramp.reduce((a, b) => (hexToOklch(b)[1] > hexToOklch(a)[1] ? b : a))
const takesALabel = (ramp) => byLight(ramp).find((c) => contrast('#ffffff', c) >= 4.5)
const solidOf = (family, kit) => kit?.choices?.brand?.of?.[family.name]
  ?? takesALabel(family.ramp) ?? purest(family.ramp)
const solid = (ramp) => purest(ramp)
const byLight = (ramp) => [...ramp].sort((a, b) => hexToOklch(b)[0] - hexToOklch(a)[0])

/**
 * A family, as our seven colour roles.
 *
 * The extremes come straight out of the ramp. The two in the middle are the
 * ones taste usually decides, so they are decided by a published standard
 * instead: muted ink is the quietest step that still clears WCAG 1.4.3 for body
 * text, and the line is the quietest that still clears 1.4.11 for a non-text
 * boundary. If no step clears the bar, the darkest available is used and the
 * caller is told — never a value invented to fill the gap.
 */
/**
 * The step of a ramp nearest in lightness to a value the kit already publishes.
 * Their convention, in your family's colours.
 */
const nearestLightness = (ramp, target) => {
  const t = hex(target) && hexToOklch(hex(target))[0]
  if (t == null) return null
  return ramp.reduce((a, b) => (Math.abs(hexToOklch(b)[0] - t) < Math.abs(hexToOklch(a)[0] - t) ? b : a))
}

export function paletteRoles(accent, neutral, kit = null, reference = {}) {
  const n = byLight(neutral?.ramp ?? accent.ramp)
  const surface = n[0]
  const page = n[1] ?? n[0]
  const ink = n.at(-1)
  const brand = solidOf(accent, kit)

  const quietestOver = (bar) => {
    const ok = n.filter((c) => contrast(c, page) >= bar)
    return ok.length ? ok[0] : null           // byLight is dark-last, so [0] is the quietest that clears
  }
  /* A published bar is the right decider only where the kit says nothing.
   *
   * Picking the line at the 1.4.11 floor made every border three times darker
   * than any kit in the set actually uses — shadcn's is 1.26:1 and ours came
   * out at 3:1, which reads as a black hairline and looks like no kit at all.
   * So where the kit publishes its own border or muted text, the step nearest
   * THEIR lightness is taken, and the contrast audit reports what that costs.
   * The tool reproduces their convention; the meter says where it falls short. */
  const muted = nearestLightness(n, reference.inkMuted) ?? quietestOver(4.5)
  const line = nearestLightness(n, reference.line) ?? quietestOver(3)
  /* Some solids take neither black nor white at 4.5:1 — a mid olive is the
     classic case. aaInk returns its best attempt; saying so is the difference
     between a palette and a promise we cannot keep. */
  const ink4 = aaInk(brand)
  const onBrandShort = contrast(ink4, brand) < 4.5

  return {
    /* aaInk, not readableInk: the quick one splits on luminance alone and hands
       back white for #228be6, where white is 3.6:1 and black is 5.9:1. The
       careful one checks the bar and swaps. */
    values: { brand, onBrand: ink4, page, surface, ink,
      inkMuted: muted ?? ink, line: line ?? n.at(-2) ?? ink },
    short: [muted ? null : 'inkMuted', line ? null : 'line', onBrandShort ? 'onBrand' : null].filter(Boolean),
    /* which of the two came from the kit rather than from the bar */
    fromKit: [reference.inkMuted ? 'inkMuted' : null, reference.line ? 'line' : null].filter(Boolean),
  }
}

/**
 * TEN ROLES FROM ONE COLOUR.
 *
 * Every generator in this space has a box that takes a brand colour, and every
 * one of them fills the rest of the system with an opinion — a grey ramp
 * somebody liked, a green somebody picked. We are not allowed one, and it turns
 * out we do not need one: the kits in the stack have already published every
 * relationship this needs.
 *
 *   the brand      is yours, exactly. It is the one thing you said.
 *   the greys      are the neutral ramp your stack publishes whose HUE sits
 *                  closest to yours — Radix's own "auto", generalised — and the
 *                  page, surface, ink, muted ink and line are read out of it the
 *                  same way a family is.
 *   the semantics  are the kit's OWN green, amber and red, each moved by the
 *                  step your brand takes from theirs: same hue, your lightness
 *                  difference, your chroma ratio. A quiet brand gets a quiet
 *                  red. That is the rule this project keeps arriving at — read
 *                  their published pair, take the relationship out of it, put
 *                  your value through it — for the fifth time.
 *   the focus ring is your brand, unless a kit in the stack publishes one.
 *
 * Nothing here is invented, and `derived` says which kit answered for what, so
 * the note under the field can say it out loud rather than asking to be trusted.
 */
export function fromOneColour(brand, ids, kits, reference = {}) {
  const b = hex(brand)
  if (!b) return null
  const all = palettesFor(ids, kits)
  const neutrals = all.filter((f) => f.kind === 'neutral')
  /* your colour as a family of one, so the hue-match that pairs an accent with
     a grey ramp works for a colour no kit publishes */
  const mine = { name: 'yours', ramp: [b], chroma: hexToOklch(b)[1], kind: 'accent' }
  const neutral = matchNeutral(mine, neutrals)
  const kit = kits[neutral?.kit ?? ids[0]]
  /* THEIR border, OUR bar for muted text — and the split is the point.
   *
   * paletteRoles takes the kit's own convention for both where it is offered,
   * which is right when you are picking one of their families and want it to
   * look like their kit. This is the other case: you gave one colour and asked
   * for a system, so a starting point that fails body-text contrast is not a
   * starting point. 1.4.3 is not negotiable and it is invisible until someone
   * cannot read the page, so muted ink is decided by the bar. The border is
   * 1.4.11 and every kit here misses it by their own choice — taking theirs
   * keeps the system looking like the kit you are on, and the checks under the
   * wall say what it costs, by name. */
  const { values, short, fromKit } = paletteRoles(mine, neutral, kit, { line: reference.line })
  /* paletteRoles reads the brand out of the ramp, and a ramp of one has one
     answer — but saying it here is the difference between right and lucky. */
  values.brand = b

  /* success, warning and danger are the kit's OWN, unchanged.
   *
   * The first version put each one through the step your brand takes from
   * theirs — their hue, your lightness difference, your chroma ratio — and it
   * produced a coherent system with a bad red in it: a brand at a third of
   * daisyUI's chroma turned its danger into a dusty pink. A warning that
   * whispers has failed at the only job it has, and "coherent" is not worth
   * that. These are values a real design system chose to read as success,
   * warning and danger; the honest move is to leave them alone and say whose
   * they are.
   *
   * The stack you are on answers first, then anyone. Tailwind and shadcn
   * publish no green at all, and a system that arrives without a success colour
   * because of that is a system with a hole in it — the checks under the wall
   * are what say no variable in this stack reads it. */
  const derived = []
  const order = [...ids, ...Object.keys(kits).filter((id) => !ids.includes(id))]
  for (const role of ['success', 'warning', 'danger']) {
    const theirs = order.map((id) => seedFrom(role, kits, [id])).find(Boolean)
    if (!theirs) continue
    values[role] = theirs.value
    derived.push({ role, from: theirs.from })
  }
  /* The focus ring is YOUR colour. A kit whose whole palette is grey publishes a
     grey ring, which is a statement about its palette and not about focus — and
     the one thing you did say is the one thing a ring should be made of. */
  values.focus = b
  derived.push({ role: 'focus', from: null })

  return { values, short, fromKit, derived,
    neutral: neutral ? { name: neutral.name, from: kits[neutral.kit].name } : null }
}
