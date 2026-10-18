/**
 * DESIGN.md against Google Labs' published spec.
 *
 * The format is not ours, so the assertions are about THEIRS: the section
 * order, the front matter schema, the one required token, and the fields that
 * carry a documented meaning. If they revise the spec these fail, which is the
 * point — the same reason a kit's values are read rather than typed.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { generate } from './generate.mjs'

const IDS = ['tailwind', 'daisyui', 'shadcn', 'bootstrap', 'material', 'radix', 'mantine', 'openprops']
const kits = Object.fromEntries(IDS.map((id) => [id, JSON.parse(readFileSync(`kits/${id}.json`, 'utf8'))]))
const V = { brand: '#6c7f00', onBrand: '#ffffff', page: '#f6faf6', surface: '#fbfefb', ink: '#0a0f09',
  inkMuted: '#60665f', line: '#d8ddd8', success: '#00d390', warning: '#fcb700', danger: '#ff627d',
  radius: '7px', baseText: '16px', space: '1.15', lineHeight: '1.5', letterSpacing: '0em',
  fontWeight: '600', fontHeading: 'Fraunces, serif', fontBody: 'Inter, sans-serif' }

const ORDER = ['Overview', 'Colors', 'Typography', 'Layout', 'Elevation & Depth', 'Shapes', 'Components', "Do's and Don'ts"]
const md = (ids = ['tailwind', 'shadcn'], v = V, o = {}) => generate(v, ids, kits, { name: 'Test', ...o })['DESIGN.md']

test('the sections appear in the order the spec fixes, and never twice', () => {
  const heads = [...md().matchAll(/^## (.+)$/gm)].map((m) => m[1])
  assert.deepEqual(heads, ORDER)
  /* the spec says a consumer must REJECT a file with a duplicate heading */
  assert.equal(new Set(heads).size, heads.length)
})

test('the front matter carries the schema, and at least a primary colour', () => {
  const front = md().split('---')[1]
  assert.match(front, /^version: alpha$/m, 'the spec version is not declared')
  assert.match(front, /^name: "/m)
  assert.match(front, /^\s+primary: "#6c7f00"$/m, 'the one colour the spec requires')
  for (const block of ['colors:', 'typography:', 'rounded:', 'components:']) {
    assert.ok(front.includes(block), `${block} is missing from the front matter`)
  }
})

test('a component is described in token references, not in literals', () => {
  const front = md().split('---')[1]
  const comp = front.slice(front.indexOf('components:'))
  assert.match(comp, /backgroundColor: "\{colors\.primary\}"/)
  assert.match(comp, /rounded: "\{rounded\.md\}"/)
  /* the block everyone else fills by hand: no hex may appear in it */
  assert.doesNotMatch(comp, /#[0-9a-f]{3,8}/i, 'a component pointed at a literal instead of a token')
})

test('a section left out on purpose uses the spec\'s own omitted field, with a reason', () => {
  /* Material publishes no spacing scale, so the spacing section cannot exist */
  const front = generate({ brand: '#6c7f00' }, ['material'], kits, { name: 'T' })['DESIGN.md'].split('---')[1]
  assert.match(front, /^omitted:$/m)
  assert.match(front, /- section: spacing/)
  assert.match(front, /reason: ".*Material 3 publishes no spacing scale.*"/)
})

test('nothing in the typography block was invented', () => {
  /* fontSize appears only where the user set one; a heading size we made up
     would be the single thing this project refuses to do */
  const front = md(['tailwind', 'shadcn'], { ...V, baseText: undefined }).split('---')[1]
  const type = front.slice(front.indexOf('typography:'), front.indexOf('rounded:'))
  assert.doesNotMatch(type, /fontSize/, 'a font size appeared that nobody set')
})

test('the prose is measurements, not mood', () => {
  const doc = md()
  /* a failing pair from the real audit, said as an instruction */
  assert.match(doc, /under the 3:1 it needs/, 'the contrast audit did not reach the rules')
  /* the gap this stack really has */
  assert.match(doc, /Do not install a dependency for a footer/)
  /* and the tidy-up instruction, which is the whole second job */
  assert.match(doc, /Replace them with the nearest role here/)
})

test('depth is derived from whether the stack publishes shadows at all', () => {
  assert.match(md(['tailwind', 'shadcn'], { ...V, elevation: '1' }), /own shadow scale at 100%/)
  assert.match(md(['tailwind', 'shadcn'], { ...V, elevation: '0' }), /Shadows are turned off/)
  assert.match(md(['material'], { ...V, elevation: '1' }), /Nothing in this stack publishes a shadow scale/)
})

test('the overview is the user\'s words or an honest absence — never ours', () => {
  assert.match(md(['tailwind'], V, { overview: 'Municipal, plain, unhurried.' }), /Municipal, plain, unhurried\./)
  assert.match(md(), /No brand description was written/)
})
