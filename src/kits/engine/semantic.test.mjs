/**
 * Success, warning and danger: eight kits, six different answers.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ROLES, MAP, route, coverage, seedFrom } from './roles.mjs'
import { generate, scopeOf, SCOPE } from './generate.mjs'
import { contrast } from './color.mjs'

const IDS = ['tailwind', 'daisyui', 'shadcn', 'bootstrap', 'material', 'radix', 'mantine', 'openprops']
const kits = Object.fromEntries(IDS.map((id) => [id, JSON.parse(readFileSync(`kits/${id}.json`, 'utf8'))]))
const V = { success: '#00695c', warning: '#e65100', danger: '#7b1fa2' }

test('the three tones are roles like any other', () => {
  const ids = ROLES.filter((r) => ['success', 'warning', 'danger'].includes(r.id)).map((r) => r.id)
  assert.deepEqual(ids, ['success', 'warning', 'danger'])
})

test('a sibling is written through the kit\'s OWN arithmetic, not a shade of ours', () => {
  /* Feed Bootstrap its own success colour and its own relatives must come back.
     That is the whole claim: we reproduce their relationship, we do not invent
     a lighter green. Within a couple of units per channel, because the trip
     goes through OKLCH and back. */
  const own = kits.bootstrap.modes.light
  const r = route({ success: own['--bs-success'] }, ['bootstrap'], kits)[0]
  for (const name of ['--bs-success-text-emphasis', '--bs-success-bg-subtle', '--bs-success-border-subtle']) {
    const made = r.vars[name], theirs = own[name]
    assert.ok(made, `${name} was not written at all`)
    const d = [1, 3, 5].map((i) => Math.abs(parseInt(made.slice(i, i + 2), 16) - parseInt(theirs.slice(i, i + 2), 16)))
    assert.ok(Math.max(...d) <= 8, `${name}: ours ${made}, theirs ${theirs}`)
  }
})

test('a subtle background stays subtle when the colour changes', () => {
  const r = route(V, ['bootstrap'], kits)[0]
  const bg = r.vars['--bs-success-bg-subtle'], text = r.vars['--bs-success-text-emphasis']
  assert.ok(contrast(bg, text) > 4.5, `emphasis text on its own subtle background reads at ${contrast(bg, text)}:1`)
})

test('a variable that wants "r, g, b" gets r, g, b', () => {
  const r = route(V, ['bootstrap'], kits)[0]
  assert.match(r.vars['--bs-danger-rgb'], /^\d{1,3}, \d{1,3}, \d{1,3}$/,
    'a hex here leaves every rgba(var(--bs-danger-rgb), .5) invalid')
})

test('a kit that ships only one of the three says which', () => {
  assert.deepEqual(coverage('shadcn').missing.filter((r) => ['success', 'warning', 'danger'].includes(r)),
    ['success', 'warning'], 'shadcn ships --destructive and nothing else')
  assert.deepEqual(coverage('material').missing.filter((r) => ['success', 'warning', 'danger'].includes(r)),
    ['success', 'warning'], 'M3 specifies error and no other semantic role')
  assert.deepEqual(coverage('mantine').missing.filter((r) => ['success', 'warning', 'danger'].includes(r)),
    ['warning'], 'Mantine has error and success but no warning')
})

test('Radix takes each tone as a CHOICE, and none of them is typed here', () => {
  const r = route({ ...V, brand: '#0b6e8a', ink: '#16181c' }, ['radix'], kits)[0]
  const tones = r.chosen.filter((c) => c.attr === 'tone')
  assert.equal(tones.length, 3)
  for (const t of tones) assert.ok(kits.radix.choices.brand.of[t.picked], `${t.picked} is not an accent Radix publishes`)
  /* and a per-element tone must NOT land on the theme root, where it would
     replace the brand accent */
  assert.equal(r.attrs['data-accent-color'], 'cyan')
})

test('Bootstrap says its semantic colours are compiled, like its brand', () => {
  const r = route(V, ['bootstrap'], kits)[0]
  for (const s of ['$success', '$warning', '$danger']) {
    assert.ok(r.needsBuild.some((b) => b.sass === s), `${s} is not carried into _custom.scss`)
  }
})

test('a block wins by out-specifying the kit, not by being ours', () => {
  assert.match(SCOPE.mantine, /data-mantine-color-scheme/,
    "Mantine's own block is :root[data-mantine-color-scheme='light']; a plain :root loses the tie")
  const css = generate(V, ['mantine'], kits)['theme.css']
  assert.ok(css.includes(SCOPE.mantine), 'the generated file uses a selector that cannot win')
  assert.equal(scopeOf('tailwind'), ':root')
})

test('the knobs open on a published value, not on a colour we chose', () => {
  for (const role of ['success', 'warning', 'danger']) {
    const seed = seedFrom(role, kits, ['daisyui', 'bootstrap', 'mantine', 'material'])
    assert.ok(seed, `${role} has no published starting value anywhere`)
    assert.match(seed.value, /^#[0-9a-f]{6}$/i)
    assert.ok(Object.values(kits).some((k) => k.name === seed.from))
  }
})

test('overriding a colour a kit derives is declared, not silent', () => {
  const md = generate({ ...V, brand: '#0b6e8a' }, ['material'], kits)['MANIFEST.md']
  assert.match(md, /derives that colour itself/, 'Material derives an error role and nothing says we replaced it')
})

test('spacing is a multiple of the kit\'s own step, never a length of ours', () => {
  /* Tailwind's step is 4px and Mantine's is 16px. One number of ours written
     into both would give Tailwind a padding four times too large. */
  const r = Object.fromEntries(route({ space: '1.25' }, IDS, kits).map((x) => [x.kit, x]))
  assert.equal(r.tailwind.vars['--spacing'], '0.3125rem', 'Tailwind 0.25rem × 1.25')
  assert.equal(r.mantine.vars['--mantine-scale'], '1.25', 'Mantine publishes a bare multiplier for exactly this')
  assert.equal(r.openprops.vars['--size-3'], '1.25rem')
  assert.equal(r.openprops.vars['--size-1'], '0.3125rem', 'every step of their scale moves together')
  assert.ok(r.bootstrap.needsBuild.some((b) => b.sass === '$spacer'), 'Bootstrap compiles its spacer')
  assert.ok(coverage('material').missing.includes('space'), 'M3 publishes no spacing scale at all')
  assert.deepEqual(r.daisyui.vars, {}, 'daisyUI rides on the base step')
})

test('a scale published as calc() is still a scale', () => {
  /* Mantine writes calc(0.5rem * var(--mantine-scale)). A reader that only
     matched a bare length saw nothing there, so every radius and spacing
     sibling was left at its published value and reported as unscalable. */
  const r = route({ radius: '14px' }, ['mantine'], kits)[0]
  assert.equal(r.vars['--mantine-radius-md'], '14px')
  assert.equal(r.vars['--mantine-radius-xs'], '3.5px', 'their own published quarter-step ratio')
  assert.deepEqual(r.unscaled, [])
})
