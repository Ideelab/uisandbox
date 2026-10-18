import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stack, options, toggle, showing, foundationOf, describe } from './stack.mjs'

const IDS = ['tailwind', 'daisyui', 'shadcn', 'bootstrap', 'material', 'radix', 'mantine', 'openprops']
const kits = Object.fromEntries(IDS.map((id) => [id, JSON.parse(readFileSync(`kits/${id}.json`, 'utf8'))]))

test('the base is read from the kits, not typed here', () => {
  assert.equal(foundationOf(kits), 'tailwind')
})

test('a layer always carries its base with it', () => {
  const st = stack(['shadcn'], kits)
  assert.deepEqual(st.order, ['tailwind', 'shadcn'])
  assert.equal(showing(st), 'shadcn', 'you see the components, not the utilities')
})

test('a standalone kit IS the stack — nothing rides along', () => {
  const st = stack(['tailwind', 'shadcn', 'bootstrap'], kits)
  assert.equal(st.base, 'bootstrap')
  assert.deepEqual(st.layers, [])
  assert.ok(st.dropped.includes('shadcn'), 'and it says what it pushed off')
})

test('two layers on one base is allowed, and the top one is what you see', () => {
  const st = stack(['tailwind', 'daisyui', 'shadcn'], kits)
  assert.deepEqual(st.order, ['tailwind', 'daisyui', 'shadcn'])
  assert.equal(showing(st), 'shadcn')
})

test('the base cannot be pulled out from under its layers', () => {
  const after = toggle(new Set(['tailwind', 'shadcn']), 'tailwind', kits)
  assert.ok(after.has('tailwind'), 'shadcn would have nothing to sit on')
  assert.ok(after.has('shadcn'))
})

test('clicking a standalone kit replaces everything, and clicking it again returns to the base', () => {
  const a = toggle(new Set(['tailwind', 'shadcn']), 'material', kits)
  assert.deepEqual([...a], ['material'])
  assert.deepEqual([...toggle(a, 'material', kits)], ['tailwind'])
})

test('adding a layer while on a standalone kit moves you back to the base it needs', () => {
  const after = toggle(new Set(['bootstrap']), 'shadcn', kits)
  assert.deepEqual([...after].sort(), ['shadcn', 'tailwind'])
})

test('every option explains itself in a sentence a reader can act on', () => {
  for (const o of options(new Set(['tailwind', 'shadcn']), kits)) {
    assert.ok(o.why.length > 10 && !/cannot|not allowed/i.test(o.why), `${o.id}: ${o.why}`)
  }
})

test('the stack has a name', () => {
  assert.equal(describe(stack(['shadcn'], kits), kits), 'Tailwind CSS + shadcn/ui')
})

test('a tokens layer sits under everything and is never what you look at', () => {
  const st = stack(['openprops', 'tailwind', 'shadcn'], kits)
  assert.deepEqual(st.order, ['openprops', 'tailwind', 'shadcn'])
  assert.equal(showing(st), 'shadcn', 'Open Props renders nothing — you see the kit above it')
})

test('and it survives a standalone kit replacing the stack', () => {
  const after = toggle(new Set(['openprops', 'tailwind', 'shadcn']), 'bootstrap', kits)
  assert.deepEqual([...after].sort(), ['bootstrap', 'openprops'])
  assert.deepEqual(stack(after, kits).order, ['openprops', 'bootstrap'])
})

test('Radix and Mantine bring their own base, so they replace the stack', () => {
  for (const id of ['radix', 'mantine']) {
    const st = stack(['tailwind', 'shadcn', id], kits)
    assert.equal(st.base, id)
    assert.deepEqual(st.layers, [])
    assert.ok(st.dropped.includes('shadcn'))
  }
})

test('toggling a tokens layer disturbs nothing above it', () => {
  const before = new Set(['tailwind', 'daisyui'])
  const withProps = toggle(before, 'openprops', kits)
  assert.deepEqual([...withProps].sort(), ['daisyui', 'openprops', 'tailwind'])
  assert.deepEqual([...toggle(withProps, 'openprops', kits)].sort(), ['daisyui', 'tailwind'])
})
