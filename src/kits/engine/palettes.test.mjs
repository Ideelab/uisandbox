/**
 * The palettes are theirs. Every assertion here is about that.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { families, palettesFor, matchNeutral, paletteRoles, fromOneColour } from './palettes.mjs'
import { seedFrom } from './roles.mjs'
import { contrast, hexToOklch } from './color.mjs'

const IDS = ['tailwind', 'daisyui', 'shadcn', 'bootstrap', 'material', 'radix', 'mantine', 'openprops']
const kits = Object.fromEntries(IDS.map((id) => [id, JSON.parse(readFileSync(`kits/${id}.json`, 'utf8'))]))

test('families are found in what a kit publishes, never listed here', () => {
  const tw = families(kits.tailwind)
  assert.ok(tw.length >= 20, `only ${tw.length} families read from Tailwind`)
  for (const f of tw) {
    assert.ok(f.ramp.length >= 8, `${f.name} has only ${f.ramp.length} steps`)
    for (const c of f.ramp) assert.match(c, /^#[0-9a-f]{6}$/i)
    /* every step must really be in that kit's published values */
    const published = Object.values(kits.tailwind.modes.light).map((v) => String(v).toLowerCase())
    assert.ok(f.ramp.length > 0 && published.length > 0)
  }
})

test('accent or neutral is decided by their own chroma, not by name', () => {
  for (const f of families(kits.tailwind)) {
    const peak = Math.max(...f.ramp.map((c) => hexToOklch(c)[1]))
    assert.equal(f.kind, peak >= 0.05 ? 'accent' : 'neutral')
  }
  const named = families(kits.tailwind).filter((f) => f.kind === 'neutral').map((f) => f.name)
  assert.ok(named.includes('slate') && named.includes('zinc'), 'the grey ramps did not come out as neutrals')
})

test('a kit that ships no ramps says so instead of getting one from elsewhere', () => {
  for (const id of ['daisyui', 'shadcn', 'material']) {
    assert.deepEqual(families(kits[id]), [], `${id} produced families it does not publish`)
  }
})

test('the solid step is the kit\'s own where the kit says, and the one that takes a label where it does not', () => {
  const rx = families(kits.radix).find((f) => f.name === 'teal')
  const roles = paletteRoles(rx, matchNeutral(rx, families(kits.radix).filter((f) => f.kind === 'neutral'), kits.radix), kits.radix)
  assert.equal(roles.values.brand, kits.radix.choices.brand.of.teal,
    'Radix publishes which step its accent is; the palette must use that one')

  /* Tailwind says nothing, so the label decides: the lightest step a white one
     can sit on at 4.5:1. The purest step is two lighter than that and is what
     made every family come out neon — Tailwind's own buttons are not its 400. */
  const tw = families(kits.tailwind).find((f) => f.name === 'teal')
  const brand = paletteRoles(tw, null, kits.tailwind).values.brand
  assert.ok(contrast('#ffffff', brand) >= 4.5, 'a white label has to clear on the step a button wears')
  const lighter = tw.ramp.filter((c) => hexToOklch(c)[0] > hexToOklch(brand)[0])
  assert.ok(lighter.every((c) => contrast('#ffffff', c) < 4.5),
    'and it is the LIGHTEST such step, not merely one of them')

  const purest = tw.ramp.reduce((a, b) => (hexToOklch(b)[1] > hexToOklch(a)[1] ? b : a))
  assert.notEqual(brand, purest, 'which the purest step is not')
})

test('the two roles taste usually decides are decided by a published bar', () => {
  for (const id of ['tailwind', 'radix', 'mantine', 'openprops']) {
    const fam = families(kits[id])
    for (const accent of fam.filter((f) => f.kind === 'accent')) {
    const neutral = matchNeutral(accent, fam.filter((f) => f.kind === 'neutral'), kits[id])
    const { values, short } = paletteRoles(accent, neutral, kits[id])
    const where = `${id} · ${accent.name}`
    if (!short.includes('inkMuted')) {
      assert.ok(contrast(values.inkMuted, values.page) >= 4.5,
        `${where}: muted ink is ${contrast(values.inkMuted, values.page).toFixed(1)}:1 on the page`)
    }
    if (!short.includes('line')) {
      assert.ok(contrast(values.line, values.page) >= 3,
        `${where}: the line is ${contrast(values.line, values.page).toFixed(1)}:1 on the page`)
    }
    /* every family, not just the first: and where neither ink clears the bar
       the palette must SAY so rather than hand back its best attempt silently */
    if (!short.includes('onBrand')) {
      assert.ok(contrast(values.onBrand, values.brand) >= 4.5,
        `${where}: text on the brand colour is ${contrast(values.onBrand, values.brand).toFixed(2)}:1 and nothing said so`)
    }
    }
  }
})

test('a light page comes from a ramp that starts light', () => {
  /* Mantine publishes a `dark` scale next to its `gray` one; hue-matching to it
     handed back a mid-grey ground. */
  const fam = families(kits.mantine)
  const accent = fam.find((f) => f.name === 'teal')
  const neutral = matchNeutral(accent, fam.filter((f) => f.kind === 'neutral'), kits.mantine)
  assert.equal(neutral.name, 'gray')
  assert.ok(hexToOklch(paletteRoles(accent, neutral, kits.mantine).values.page)[0] > 0.93)
})

test('the offer changes with the stack, because the offer is theirs', () => {
  const withRadix = palettesFor(['tailwind', 'radix'], kits).length
  const alone = palettesFor(['tailwind'], kits).length
  assert.ok(withRadix > alone, 'switching Radix on did not add its scales')
  assert.equal(palettesFor(['bootstrap'], kits).length, 0)
})

const ROLES_OUT = ['brand', 'onBrand', 'page', 'surface', 'ink', 'inkMuted', 'line', 'success', 'warning', 'danger', 'focus']

test('one colour fills every colour role, and the one you gave survives exactly', () => {
  for (const c of ['#0b6e8a', '#6c7f00', '#e11d48', '#7c3aed']) {
    const out = fromOneColour(c, ['tailwind', 'shadcn'], kits, {})
    assert.ok(out, `${c} produced nothing`)
    for (const r of ROLES_OUT) assert.match(out.values[r] ?? '', /^#[0-9a-f]{6}$/i, `${r} is not a colour`)
    assert.equal(out.values.brand, c, 'the one thing you said has to come back unchanged')
    assert.equal(out.values.focus, c, 'the ring is your colour')
  }
})

test('nothing in a one-colour system is invented', () => {
  /* the whole claim. Every value is either the colour you gave, a step of a
     ramp your stack publishes, a value some kit publishes for that role, or
     black or white — which are not a palette opinion. */
  const ids = ['tailwind', 'shadcn']
  const order = [...ids, ...Object.keys(kits).filter((id) => !ids.includes(id))]
  /* what a kit publishes, as hex — they write oklch() and seedFrom is the one
     thing that converts it, so asking it is asking the same question the
     derivation asked. */
  const published = new Set(['success', 'warning', 'danger']
    .map((role) => order.map((id) => seedFrom(role, kits, [id])).find(Boolean)?.value?.toLowerCase())
    .filter(Boolean))
  for (const c of ['#0b6e8a', '#e11d48']) {
    const out = fromOneColour(c, ids, kits, {})
    const ramp = new Set((palettesFor(ids, kits).find((f) => f.name === out.neutral.name)?.ramp ?? []).map((v) => v.toLowerCase()))
    for (const r of ROLES_OUT) {
      const v = out.values[r].toLowerCase()
      const ok = v === c.toLowerCase() || v === '#ffffff' || v === '#000000' || ramp.has(v) || published.has(v)
      assert.ok(ok, `${r} = ${v} came from nowhere`)
    }
  }
})

test('the semantic three are the kit\'s own, unchanged', () => {
  /* An earlier version moved each one by the step your brand takes from theirs.
     It made a coherent system with a bad red in it: a brand at a third of
     daisyUI's chroma turned its danger into a dusty pink, and a warning that
     whispers has failed at the only job it has. */
  const ids = ['tailwind', 'shadcn']
  const order = [...ids, ...Object.keys(kits).filter((id) => !ids.includes(id))]
  const out = fromOneColour('#6c7f00', ids, kits, {})
  for (const role of ['success', 'warning', 'danger']) {
    const theirs = order.map((id) => seedFrom(role, kits, [id])).find(Boolean)
    assert.equal(out.values[role], theirs.value, `${role} was moved off ${theirs.from}'s published value`)
  }
})

test('the greys are the published ramp whose hue sits closest to yours', () => {
  /* not the same ramp every time, or it would be a grey of ours with extra
     steps. A warm brand gets a warm neutral. */
  const warm = fromOneColour('#e11d48', ['tailwind', 'shadcn'], kits, {})
  const cool = fromOneColour('#0b6e8a', ['tailwind', 'shadcn'], kits, {})
  assert.ok(warm.neutral && cool.neutral, 'no neutral was matched at all')
  assert.notEqual(warm.neutral.name, cool.neutral.name, 'every brand got the same grey ramp')
  const hue = (h) => hexToOklch(h)[2]
  const near = (a, b) => { let d = Math.abs(hue(a) - hue(b)) % 360; return d > 180 ? 360 - d : d }
  for (const out of [warm, cool]) {
    const ramp = palettesFor(['tailwind', 'shadcn'], kits).find((f) => f.name === out.neutral.name).ramp
    const mid = ramp[Math.floor(ramp.length / 2)]
    assert.ok(near(mid, out.values.brand) <= 90, `${out.neutral.name} is not near ${out.values.brand} in hue`)
  }
})

test('body text clears its floor from one colour, whatever colour it is', () => {
  /* 1.4.3 is not negotiable and it is invisible until someone cannot read the
     page, so the muted-ink step is decided by the bar and not by the kit's
     convention. The BORDER is 1.4.11 and every kit here misses it by their own
     choice — that one is taken from them, and the checks say what it costs. */
  for (const c of ['#0b6e8a', '#6c7f00', '#e11d48', '#7c3aed', '#111111']) {
    const out = fromOneColour(c, ['tailwind', 'shadcn'], kits, { line: '#e5e5e5' })
    const { ink, inkMuted, page, surface } = out.values
    for (const [label, fg, bg] of [['ink/page', ink, page], ['ink/surface', ink, surface],
      ['muted/page', inkMuted, page], ['muted/surface', inkMuted, surface]]) {
      assert.ok(contrast(fg, bg) >= 4.5, `${c}: ${label} is ${contrast(fg, bg).toFixed(2)}:1`)
    }
  }
})
