/**
 * The rule that keeps Material honest: every element the binding emits must be
 * one Google's package declares AND one our bundle actually registers.
 *
 * A tag that is theirs by name but missing from the bundle renders as an
 * unknown inline element — it would look like a hole in Material's kit, and the
 * hole would be ours. That is exactly the failure this kit spent months being.
 *
 * First run reads the package (an npm install); after that it is cached.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { WALL } from './wall-bindings.mjs'
import { SCENES } from './scenes.mjs'
import { render } from './parts.mjs'
import { elementsOf } from './fidelity.mjs'
import { materialElements } from './material-elements.mjs'
import { COMPONENT_GAPS } from './generate.mjs'
import { MAP } from './roles.mjs'

const mdw = materialElements()
const html = SCENES.map((s) => render(s.node, WALL.material)).join('')

test('every custom element on the Material wall is one their package declares', () => {
  for (const tag of elementsOf(html)) {
    assert.ok(mdw.declares.includes(tag), `<${tag}> is not an element @material/web declares`)
  }
})

test('and one this bundle really registers, or it renders as an unknown tag', () => {
  for (const tag of elementsOf(html)) {
    assert.ok(mdw.bundled.includes(tag),
      `<${tag}> is declared by Material but not in the bundle — add its module to material-elements.mjs`)
  }
})

test('the Material wall is not drawn with our own components', () => {
  const tags = elementsOf(html)
  assert.ok(tags.length >= 10, `only ${tags.length} of their elements on the whole wall`)
  assert.ok(tags.includes('md-filled-button') && tags.includes('md-outlined-text-field'))
})

test('what Material has no component for is declared, not substituted', () => {
  const parts = (COMPONENT_GAPS.material ?? []).map(([p]) => p)
  for (const p of ['layout', 'table', 'avatar', 'alert']) {
    assert.ok(parts.includes(p), `${p} is drawn by us and nothing says so`)
  }
})

test('nothing inline carries a number of ours where Material publishes a token', () => {
  /* Colours and corner radii must come from their tokens. Spacing may not --
     Material publishes no spacing scale -- and that is the declared gap. */
  for (const m of html.matchAll(/style="([^"]*)"/g)) {
    for (const d of m[1].split(';').filter(Boolean)) {
      const [prop, val] = d.split(':')
      if (!/color|background|border-radius/.test(prop)) continue
      /* inherit and currentColor name no colour at all — they defer to whatever
         Material already set, which is the opposite of a value of ours. */
      if (/^\s*(inherit|currentColor|transparent|none)\s*$/i.test(val ?? '')) continue
      assert.match(val ?? '', /var\(--md-/, `${d} — a value of ours where Material publishes a token`)
    }
  }
})

test('the corner-radius knob writes a token their own components really read', () => {
  /* @material/web ships two shape vocabularies. labs/gb publishes corner-xs …
     corner-xxl; every element in the package reads corner-extra-small …
     corner-extra-large. We routed to the labs names for months, so the knob
     wrote six variables Google publishes and Google's own components ignore.
     Counted in their bundle, which is where a custom element keeps its rules. */
  const name = MAP.material.radius.var
  assert.ok(mdw.js.includes(`var(${name}`),
    `${name} is published by Material and read by none of its components — route to one they read`)
})
