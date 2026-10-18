/**
 * Typography: the families come from published sources, and reach every kit
 * that has somewhere to put them.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { ROLES, route, MAP } from './roles.mjs'
import { generate, webfonts, fontLink, section } from './generate.mjs'
import { kitFonts } from './fonts.mjs'

const IDS = ['tailwind', 'daisyui', 'shadcn', 'bootstrap', 'material', 'radix', 'mantine', 'openprops']
const kits = Object.fromEntries(IDS.map((id) => [id, JSON.parse(readFileSync(`kits/${id}.json`, 'utf8'))]))
const V = { fontHeading: "'Fraunces', serif", fontBody: "'Inter', sans-serif" }

test('typography is two roles, not one', () => {
  const fonts = ROLES.filter((r) => r.kind === 'font').map((r) => r.id)
  assert.deepEqual(fonts, ['fontHeading', 'fontBody'])
})

test('every kit either takes the family, inherits it, or compiles it — none is silent', () => {
  for (const id of IDS) {
    for (const role of ['fontHeading', 'fontBody']) {
      const t = MAP[id][role]
      assert.ok(t, `${id} has no answer at all for ${role}`)
      assert.ok(t.var || t.inherits || t.needsBuild, `${id}.${role} answers with nothing usable`)
    }
  }
})

test('the body family reaches every kit that has a variable for it', () => {
  for (const r of route(V, IDS, kits)) {
    const target = MAP[r.kit].fontBody
    if (!target.var) continue
    assert.equal(r.vars[target.var], V.fontBody, `${r.kit} did not receive the body family`)
  }
})

test('a kit riding on the base does not write the family twice', () => {
  for (const id of ['daisyui', 'shadcn']) {
    const r = route(V, [id], kits).find((x) => x.kit === id)
    assert.deepEqual(Object.keys(r.vars), [], `${id} wrote a font variable of its own`)
    assert.ok(!r.unroutable.includes('fontBody'), `${id} reports the family as a gap when the base carries it`)
  }
})

test('Bootstrap says its heading family is compiled, rather than writing a variable nothing reads', () => {
  const r = route(V, ['bootstrap'], kits)[0]
  assert.ok(r.needsBuild.some((b) => b.sass === '$headings-font-family'))
})

test('a face that must be fetched is named, with the line that fetches it', () => {
  const w = webfonts(V)
  assert.deepEqual(w.map((f) => f.family), ['Fraunces', 'Inter'])
  /* in DESIGN.md, since that is the file the tokens live in */
  const md = generate({ ...V, brand: '#0b6e8a', radius: '10px' }, ['tailwind'], kits)['DESIGN.md']
  assert.match(md, /fonts\.googleapis\.com/, 'the system names a webfont and never says where it comes from')
  assert.match(md, /Fraunces/)
  const f = generate({ ...V, brand: '#0b6e8a' }, ['tailwind'], kits)
  assert.equal(f['CLAUDE.md'], f['AGENTS.md'], 'the pointer must be identical under every name, or one goes stale')
  assert.equal(f['.cursor/rules'], f['AGENTS.md'])
  assert.match(f['AGENTS.md'], /DESIGN\.md/, 'the pointer must point at the system')
  assert.match(f['tokens.json'], /"\$type": "color"/, 'tokens.json is not in the published token format')
})

test('a system stack is NOT reported as a download', () => {
  const stack = kitFonts(kits)[0]
  assert.ok(stack, 'no system stacks read from the kits at all')
  assert.deepEqual(webfonts({ fontBody: stack.family }), [], `${stack.name} was treated as a webfont`)
})

test('the families offered are read, never typed here', () => {
  const stacks = kitFonts(kits)
  assert.ok(stacks.length >= 8, `only ${stacks.length} stacks read from eight kits`)
  for (const s of stacks) {
    assert.ok(s.from.length && s.from.every((n) => Object.values(kits).some((k) => k.name === n)),
      `${s.name} claims to come from a kit that is not in the set`)
  }
  if (existsSync('kits/fonts.json')) {
    const g = JSON.parse(readFileSync('kits/fonts.json', 'utf8'))
    assert.match(g.source, /^https:\/\/fonts\.google\.com\//, 'the font list has no published source')
    assert.ok(g.families.length > 1000)
  }
})
