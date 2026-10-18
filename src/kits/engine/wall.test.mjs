/* node --test wall.test.mjs — the wall's completeness gate.
 * A hole in a wall whose job is confidence is worse than a missing feature. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PARTS, render, gaps } from './parts.mjs'
import { WALL, useMantineClasses, useShadcnParts, useAntdParts } from './wall-bindings.mjs'
import { BOARDS, SCENES } from './scenes.mjs'
import { readFileSync } from 'node:fs'

const mantineKit = JSON.parse(readFileSync('kits/mantine.json', 'utf8'))
useMantineClasses(mantineKit.classes)
useShadcnParts(JSON.parse(readFileSync('kits/shadcn.json', 'utf8')).parts)
useAntdParts(JSON.parse(readFileSync('kits/antd.json', 'utf8')).parts)
const KITS = Object.keys(WALL)

/* How each kit gives a control its height — its OWN mechanism, named. None of
 * these is a number of ours: a size class, a component class, or a custom
 * element that carries the height in its shadow root. */
const HEIGHT = {
  tailwind: /min-h-9|\bh-9\b|\bsize-9\b/, shadcn: /min-h-9|\bh-9\b|\bsize-9\b/,
  daisyui: /\bbtn\b/, bootstrap: /\bbtn\b/,
  material: /^<md-[a-z-]*(button|icon-button)/,
  radix: /\brt-r-size-\d/,
  mantine: new RegExp(`${mantineKit.classes.Button.root}|${mantineKit.classes.ActionIcon.root}`),
  antd: /\bant-btn\b/,
}

/* Cards are looked up by NAME, never by index. The wall is a composition now
 * and cards move between columns; a test that reads SCENES[3] asserts something
 * about the arrangement while pretending to assert something about a kit. */
const card = (id) => {
  const c = SCENES.find((s) => s.id === id)
  assert.ok(c, `no card called "${id}" on the wall`)
  return c.node
}

test('every kit answers every part — no kit gets to be half a wall', () => {
  for (const id of KITS) assert.deepEqual(gaps(WALL[id]), [], `${id} has no answer for these`)
})

test('every scene renders in every kit with nothing missing', () => {
  for (const scene of SCENES) {
    for (const id of KITS) {
      const html = render(scene.node, WALL[id])
      assert.doesNotMatch(html, /data-missing/, `${scene.id} has a hole in ${id}`)
      assert.ok(html.length > 200, `${scene.id} rendered almost nothing in ${id}`)
    }
  }
})

test('a scene never knows which kit it is in', () => {
  const text = JSON.stringify(SCENES)
  for (const word of ['class', 'tailwind', 'daisy', 'bootstrap', 'shadcn', 'material', '#', 'oklch', 'var(--']) {
    assert.ok(!text.toLowerCase().includes(word.toLowerCase()),
      `a scene mentions "${word}" — the moment scenes know about kits, adding a kit stops being a table`)
  }
})

test('a scene only uses parts the vocabulary has', () => {
  const used = new Set()
  const walk = (n) => { if (n && typeof n === 'object') { used.add(n.p); (n.kids ?? []).forEach(walk) } }
  SCENES.forEach((s) => walk(s.node))
  for (const p of used) assert.ok(PARTS.includes(p), `"${p}" is used by a scene but is not in PARTS`)
})

test('each kit renders in its OWN classes, not a shared blob', () => {
  const buttons = card('buttons'), queue = card('queue')
  assert.match(render(buttons, WALL.daisyui), /class="btn btn-primary"/)
  assert.match(render(buttons, WALL.bootstrap), /class="btn btn-primary"/)
  assert.match(render(queue, WALL.bootstrap), /class="table"/)
  assert.match(render(buttons, WALL.tailwind), /bg-brand/)
  assert.match(render(buttons, WALL.shadcn), /bg-primary text-primary-foreground/)
  assert.match(render(buttons, WALL.material), /<md-filled-button>/, 'Material renders its own custom elements')
  /* and the seven are genuinely different output, not one table wearing hats */
  const all = KITS.map((id) => render(buttons, WALL[id]))
  assert.equal(new Set(all).size, KITS.length, 'two kits produced identical markup')
})

test('every control in the wall clears the 24px target floor', () => {
  /* 2.5.8 again. The wall is a promise about what you will ship, so a specimen
     that fails it is a promise we cannot keep. Checked on the markup we emit.
     Material's buttons are custom elements that carry their own 40px height in
     their shadow root, so for that kit the check is that we used THEIR element
     rather than a bare one we would have to size ourselves. */
  for (const id of KITS) {
    const html = render(card('buttons'), WALL[id])
    const buttons = html.match(/<(?:button|md-[a-z-]*button)[^>]*>/g) ?? []
    assert.ok(buttons.length >= 4, `${id} rendered no buttons`)
    for (const b of buttons) {
      assert.ok(HEIGHT[id].test(b), `${id}: a button with no height floor — ${b.slice(0, 70)}`)
    }
  }
})

test('every board has a name, a reason to exist and at least one card', () => {
  assert.ok(BOARDS.length >= 4, 'a wall you pan needs somewhere to pan to')
  for (const b of BOARDS) {
    assert.ok(b.label && b.note, `board ${b.id} has no label or no note`)
    assert.ok(b.cols.length && b.cols.every((c) => c.w > 0 && c.cards.length),
      `board ${b.id} has an empty or unsized column`)
  }
  const ids = SCENES.map((s) => s.id)
  assert.equal(new Set(ids).size, ids.length, 'two cards share an id')
})

test('the wall really uses the vocabulary it carries', () => {
  /* A part every kit has to answer, that no card ever asks for, is a row of
     seven functions nobody looks at. The point of the list is the wall. */
  const used = new Set()
  const walk = (n) => { if (n && typeof n === 'object') { used.add(n.p); (n.kids ?? []).forEach(walk) } }
  SCENES.forEach((s) => walk(s.node))
  const idle = PARTS.filter((p) => !used.has(p))
  assert.deepEqual(idle, [], 'these parts are in the vocabulary and on no card')
})
