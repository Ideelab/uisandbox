/* node --test roles.test.mjs
 *
 * The meter for the thing that will actually break this product: a kit renames
 * a variable in a minor release and every export we generate points at a name
 * that no longer exists. Nothing would warn — the CSS just does nothing. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { ROLES, MAP, route, coverage } from './roles.mjs'

const kit = (id) => JSON.parse(readFileSync(`kits/${id}.json`, 'utf8'))
const KITS = Object.fromEntries(Object.keys(MAP).map((id) => [id, kit(id)]))

test('every kit we map has values checked in', () => {
  for (const id of Object.keys(MAP)) {
    assert.ok(existsSync(`kits/${id}.json`), `${id} is mapped but has no fetched values — run fetch-kits.mjs`)
  }
})

test('every variable we write into exists in the kit that publishes it', () => {
  for (const [id, m] of Object.entries(MAP)) {
    const known = new Set(Object.values(kit(id).modes).flatMap((vars) => Object.keys(vars)))
    for (const role of ROLES) {
      const t = m[role.id]
      if (!t || t.new) continue           // `new` is one we add on purpose
      if (t.derives) continue             // computed by the kit; there is no variable of ours to check
      if (!t.var) continue                // build-time only; nothing runtime to verify
      for (const name of [t.var, ...(t.also ?? [])]) {
        assert.ok(known.has(name), `${id}.${role.id} writes ${name}, which ${id} no longer publishes — the map is stale`)
      }
    }
  }
})

test('a role a kit cannot take is named, never silently dropped', () => {
  const daisy = coverage('daisyui')
  assert.deepEqual(daisy.missing.sort(),
    ['baseText', 'elevation', 'focus', 'fontWeight', 'inkMuted', 'letterSpacing', 'line'],
    'daisyUI has no muted ink, no border COLOUR (--border there is a width), no focus token, no letter spacing, no heading weight, and a 0/1 depth flag rather than a shadow scale')
  /* shadcn ships ONE semantic colour — --destructive — and no success or
     warning at all. Material ships only error, because M3 has no other. Both
     say so rather than growing a name their components do not read. */
  assert.deepEqual(coverage('shadcn').missing.sort(), ['baseText', 'success', 'warning'])
  /* four of the eight publish no focus token at all — the finding this role
     exists to make, and the reason it is worth a knob that reaches three kits */
  const noFocus = ['daisyui', 'material', 'mantine', 'openprops'].filter((k) => coverage(k).missing.includes('focus'))
  assert.deepEqual(noFocus, ['daisyui', 'material', 'mantine', 'openprops'])
  assert.ok(coverage('material').missing.includes('success'))
  assert.ok(coverage('mantine').missing.includes('warning'), 'Mantine has error and success but no warning')
  assert.ok(coverage('tailwind').added.includes('brand'), 'Tailwind has no semantic brand; we add one')

  const [tw, sh, da] = route({ brand: '#0B6E8A', line: '#DFE2E7' }, ['tailwind', 'shadcn', 'daisyui'], KITS)
  assert.equal(tw.vars['--color-brand'], '#0B6E8A')
  assert.equal(sh.vars['--primary'], '#0B6E8A')
  assert.equal(da.vars['--color-primary'], '#0B6E8A')
  assert.ok(da.unroutable.includes('line'), 'daisyUI cannot take a line colour and the caller is told')
  assert.equal(sh.vars['--input'], '#DFE2E7', 'one knob keeps the kit\'s own siblings in step')
})

test('the width/colour trap stays caught', () => {
  /* Both kits publish `--border`. If the map ever pointed daisyUI's line role at
     it, this is the test that would notice — a colour written into a width. */
  assert.equal(MAP.daisyui.line, null)
  assert.equal(MAP.shadcn.line.var, '--border')
  const daisyBorder = Object.values(kit('daisyui').modes)[0]['--border']
  assert.match(daisyBorder ?? '', /rem|px|^\d/, 'daisyUI --border is a length; if this ever reads as a colour, re-check the map')
})

test('a kit nobody mapped is refused rather than half-written', () => {
  assert.throws(() => route({ brand: '#000' }, ['flowbite']), /no role map for kit "flowbite"/)
})

test('a length knob scales the kit\'s own ramp instead of flattening it', () => {
  const [tw, , da] = route({ radius: '1rem' }, ['tailwind', 'shadcn', 'daisyui'], KITS)

  /* Tailwind ships sm .25 / md .375 / lg .5 — a ramp. Setting lg to 1rem must
     keep the other two proportional, not make all three the same. */
  assert.equal(tw.vars['--radius-lg'], '1rem')
  assert.equal(tw.vars['--radius-md'], '0.75rem')
  assert.equal(tw.vars['--radius-sm'], '0.5rem')
  assert.notEqual(tw.vars['--radius-sm'], tw.vars['--radius-lg'], 'a ramp is not one value three times')

  /* daisyUI's own three differ deliberately too — and the ratio is asserted
     from what they PUBLISH, not from what we remember. The first version of
     this test hard-coded box=1rem; daisyUI ships 0.5rem, so the test was wrong
     and the code was right. Reading the source is the whole point. */
  const own = Object.assign({}, ...Object.values(KITS.daisyui.modes))
  const num = (v) => Number(/^(-?[\d.]+)/.exec(v)[1])
  for (const sib of ['--radius-field', '--radius-selector']) {
    const published = num(own[sib]) / num(own['--radius-box'])
    const routed = num(da.vars[sib]) / num(da.vars['--radius-box'])
    assert.ok(Math.abs(published - routed) < 1e-6, `${sib}: their ratio ${published} became ${routed}`)
  }
})

test('a ratio we cannot read is left alone and reported', () => {
  const [tw] = route({ radius: '12' }, ['tailwind'], KITS)   // no unit
  assert.deepEqual(tw.unscaled, ['--radius-md', '--radius-sm'])
  assert.equal(tw.vars['--radius-md'], undefined, 'better their value than our guess')
})

test('a kit that derives its colours takes the seed and nothing else', () => {
  const [mat] = route({ brand: '#0B6E8A', page: '#fff', ink: '#111', line: '#ddd', radius: '1rem' }, ['material'], KITS)

  assert.equal(mat.vars['--md-sys-color-primary'], '#0B6E8A', 'the seed is ours to set')
  for (const v of ['--md-sys-color-surface', '--md-sys-color-on-surface', '--md-sys-color-outline']) {
    assert.equal(mat.vars[v], undefined, `${v} is computed by M3 from the seed — writing it half-themes the kit`)
  }
  /* and each one says what it is derived FROM — Material from the brand seed,
     Radix from the size setting. One sentence for both was wrong for one. */
  assert.deepEqual(mat.derived.map((d) => d.role).sort(), ['ink', 'inkMuted', 'line', 'onBrand', 'page', 'surface'])
  assert.ok(mat.derived.every((d) => d.from === 'brand'))
  const [rx] = route({ space: '1.25' }, ['radix'], KITS)
  assert.ok(rx.derived.some((d) => d.role === 'space' && d.from === 'baseText'),
    'Radix ties space to its scaling setting, which is the size knob')
  assert.deepEqual(mat.seeds, [{ role: 'brand', by: '@material/material-color-utilities' }])
})

test("Material's corner ramp keeps M3's own steps", () => {
  const [mat] = route({ radius: '24px' }, ['material'], KITS)
  const own = Object.assign({}, ...Object.values(KITS.material.modes))
  const num = (v) => Number(/^(-?[\d.]+)/.exec(v)[1])
  /* M3 ships xs 4 · sm 8 · md 12 · lg 16 · xl 28 · xxl 48 — doubling md must
     double the rest, not flatten six deliberate steps into one. */
  for (const sib of ['--md-sys-shape-corner-xs', '--md-sys-shape-corner-lg', '--md-sys-shape-corner-xxl']) {
    const published = num(own[sib]) / num(own['--md-sys-shape-corner-md'])
    const routed = num(mat.vars[sib]) / num(mat.vars['--md-sys-shape-corner-md'])
    assert.ok(Math.abs(published - routed) < 1e-6, `${sib}: ${published} became ${routed}`)
  }
  assert.equal(mat.vars['--md-sys-shape-corner-md'], '24px')
})

test('Bootstrap is honest about what a running page can and cannot change', () => {
  const [bs] = route({ brand: '#0B6E8A', page: '#F7F9FA', ink: '#16181C', line: '#DFE2E7', radius: '0.5rem' }, ['bootstrap'], KITS)

  /* the runtime half really is runtime — these are read 24, 25, 31 and 105
     times in Bootstrap's own stylesheet */
  assert.equal(bs.vars['--bs-body-bg'], '#F7F9FA')
  assert.equal(bs.vars['--bs-body-color'], '#16181C')
  assert.equal(bs.vars['--bs-border-color'], '#DFE2E7')
  assert.equal(bs.vars['--bs-border-radius'], '0.5rem')

  /* and the brand half is not: it is carried as a build-time line, by name */
  const build = bs.needsBuild.map((b) => b.role)
  assert.ok(build.includes('brand') && build.includes('onBrand'))
  assert.equal(bs.needsBuild.find((b) => b.role === 'brand').sass, '$primary')
  assert.match(bs.needsBuild.find((b) => b.role === 'brand').why, /compiled/)
})

test("Bootstrap's radius ramp is scaled, not flattened", () => {
  const [bs] = route({ radius: '0.75rem' }, ['bootstrap'], KITS)
  const own = Object.assign({}, ...Object.values(KITS.bootstrap.modes))
  const num = (v) => Number(/^(-?[\d.]+)/.exec(v)[1])
  for (const sib of ['--bs-border-radius-sm', '--bs-border-radius-lg', '--bs-border-radius-xl']) {
    const published = num(own[sib]) / num(own['--bs-border-radius'])
    const routed = num(bs.vars[sib]) / num(bs.vars['--bs-border-radius'])
    assert.ok(Math.abs(published - routed) < 1e-6, `${sib}: ${published} became ${routed}`)
  }
})

test('every kit says which of the four answers applies to each role', () => {
  const seen = new Set()
  for (const id of Object.keys(MAP)) {
    const c = coverage(id)
    for (const k of ['missing', 'added', 'derived', 'needsBuild']) if (c[k].length) seen.add(k)
    assert.ok(c.note, `${id} has no note explaining its theming contract`)
  }
  assert.deepEqual([...seen].sort(), ['added', 'derived', 'missing', 'needsBuild'],
    'all four kinds of honest answer are in use across the five kits')
})

test('every variable we write is one the kit publishes, or one we say we added', () => {
  /* The other half of the orphan question, and the cheap half: a name that is
     neither theirs nor declared as ours is a typo in the routing table, and a
     typo there writes a variable that can never be read by anything. */
  for (const [id, table] of Object.entries(MAP)) {
    const kit = JSON.parse(readFileSync(`kits/${id}.json`, 'utf8'))
    const published = new Set(Object.keys(Object.assign({}, ...Object.values(kit.modes ?? {}))))
    if (!published.size) continue
    for (const [role, e] of Object.entries(table)) {
      if (role.startsWith('_') || !e || typeof e !== 'object' || e.new) continue
      const names = [e.var, ...(e.also ?? []), ...(e.tint ?? []), ...(e.rgb ?? []), ...(e.shadows ?? [])].filter(Boolean)
      for (const n of names) {
        assert.ok(published.has(n), `${id}.${role} writes ${n}, which ${kit.name} does not publish and we do not declare as added`)
      }
    }
  }
})
