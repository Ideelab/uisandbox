/**
 * SKILL.md — the procedural half of the export, held to the export's own bar.
 *
 * The assertions are the doctrine: every kit-specific name the skill cites is
 * published by that kit (the class-shaped ones are additionally looked up in
 * the compiled sheets by fidelity.mjs), the dark sentence is written FROM the
 * DARK table so the two cannot disagree, and the second-library grep never
 * names the engine a chosen kit runs on as a foreign import.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { generate, SKILL_VOCAB, DARK } from './generate.mjs'

const IDS = ['tailwind', 'daisyui', 'shadcn', 'bootstrap', 'material', 'radix', 'mantine', 'antd', 'openprops']
const kits = Object.fromEntries(IDS.map((id) => [id, JSON.parse(readFileSync(`kits/${id}.json`, 'utf8'))]))
const V = { brand: '#6c7f00', onBrand: '#ffffff', page: '#f6faf6', surface: '#fbfefb', ink: '#0a0f09',
  inkMuted: '#60665f', line: '#d8ddd8', radius: '7px', baseText: '16px' }

const skillOf = (ids, opts = {}) => {
  const files = generate(V, ids, kits, { name: 'Aurora Admin', ...opts })
  const key = Object.keys(files).find((k) => k.endsWith('/SKILL.md'))
  return { key, md: files[key], files }
}

test('every kit has a vocabulary entry, and each carries the five voices', () => {
  for (const id of IDS) {
    const v = SKILL_VOCAB[id]
    assert.ok(v, `${id} has no SKILL_VOCAB entry`)
    for (const field of ['ladder', 'group', 'busy', 'icons']) {
      assert.equal(typeof v[field], 'string', `${id}.${field}`)
    }
    /* motion is a string, or null for the one kit whose motion line is read
       from its own companion package at generate time */
    assert.ok(typeof v.motion === 'string' || (v.motion === null && kits[id].animates?.npm),
      `${id}.motion is neither written nor readable from the package`)
  }
})

test('the skill lands under .claude/skills/<slug>/ and the slug is the name', () => {
  const { key } = skillOf(['daisyui'])
  assert.equal(key, '.claude/skills/aurora-admin/SKILL.md')
  /* no name → the same fallback the page's zip uses */
  const files = generate(V, ['daisyui'], kits, {})
  assert.ok(files['.claude/skills/design-system/SKILL.md'])
})

test('frontmatter parses, names the slug, and the description says when to load', () => {
  const { md } = skillOf(['bootstrap'])
  const fm = md.match(/^---\nname: (.+)\ndescription: (.+)\n---\n/)
  assert.ok(fm, 'no frontmatter')
  assert.equal(fm[1], 'aurora-admin')
  assert.match(fm[2], /user interface/i)
  assert.match(fm[2], /Bootstrap 5/)
})

test('every chosen kit speaks in every per-kit section, and no other kit does', () => {
  const { md } = skillOf(['daisyui', 'shadcn'])
  for (const name of ['daisyUI', 'shadcn/ui']) {
    assert.ok(md.split(`**${name}**`).length >= 6, `${name} missing from per-kit sections`)
  }
  for (const other of ['Bootstrap', 'Mantine', 'Ant Design', 'Radix', 'Material']) {
    assert.ok(!md.includes(`**${other}**`), `${other} speaks in a stack it is not part of`)
  }
})

test('the dark sentence is written from the DARK table, never beside it', () => {
  /* a selector kit quotes its own selector */
  assert.match(skillOf(['shadcn']).md, /`\.dark` on the root/)
  assert.match(skillOf(['bootstrap']).md, /\[data-bs-theme="dark"\]/)
  /* the three non-selector shapes each get their own true sentence */
  assert.match(skillOf(['daisyui']).md, /second theme block/)
  assert.match(skillOf(['antd']).md, /darkAlgorithm/)
  assert.match(skillOf(['material']).md, /operating system/)
  assert.match(skillOf(['tailwind']).md, /publishes no dark values/)
  /* and the table really is the source: every chosen kit appears in ## Dark */
  for (const id of IDS) {
    assert.ok(DARK[id] !== undefined, `${id} missing from DARK`)
    const dark = skillOf([id]).md.split('## Dark')[1]
    assert.ok(dark.includes(`**${kits[id].name}**`), `${id} silent in its own dark section`)
  }
})

test('shadcn motion is read from its companion package, version included', () => {
  const a = kits.shadcn.animates
  assert.ok(a?.npm, 'shadcn no longer ships a companion — rewrite the vocabulary entry')
  assert.match(skillOf(['shadcn']).md, new RegExp(`\`${a.npm}\` ${a.version.replace(/\./g, '\\.')}`))
})

test('the foreign-import grep never names an engine a chosen kit runs on', () => {
  const { md } = skillOf(['daisyui', 'shadcn'])
  const grep = md.split('A second UI library')[0].split('```bash').at(-1)
  assert.ok(!grep.includes('tailwindcss'), 'Tailwind flagged as foreign to the kits that run on it')
  assert.ok(grep.includes('bootstrap|') || grep.includes('|bootstrap'), 'real foreign kits still named')
  /* and a kit chosen alone flags the rest */
  const solo = skillOf(['mantine']).md
  assert.ok(solo.includes('antd') && solo.includes('@radix-ui/themes'))
  assert.ok(!solo.includes('|@mantine/core'))
})

test('json-verifiable citations exist where the kit publishes its names', () => {
  for (const c of SKILL_VOCAB.mantine.mantineClasses) {
    assert.ok(c in kits.mantine.classes, `Mantine publishes no "${c}"`)
  }
  for (const c of SKILL_VOCAB.antd.antdClasses) {
    assert.ok(kits.antd.classes.includes(c), `Ant Design publishes no "${c}"`)
  }
  /* the vars the motion lines lean on, read from the fetched themes */
  const twVars = Object.keys(Object.assign({}, ...Object.values(kits.tailwind.modes)))
  for (const v of ['--animate-spin', '--animate-ping', '--animate-pulse', '--ease-in', '--ease-out']) {
    assert.ok(twVars.includes(v), `Tailwind publishes no ${v}`)
  }
  const opVars = Object.keys(Object.assign({}, ...Object.values(kits.openprops.modes)))
  assert.ok(['--ease-1', '--ease-5'].every((v) => opVars.includes(v)), 'Open Props eases moved')
  assert.ok(opVars.some((v) => v.startsWith('--animation-')), 'Open Props animations moved')
})

test('the pointer names the skill path, and the zip set stays complete', () => {
  const { files, key } = skillOf(['radix'])
  for (const p of ['AGENTS.md', 'CLAUDE.md', '.cursor/rules']) {
    assert.ok(files[p].includes(key), `${p} does not point at the skill`)
  }
  for (const p of ['theme.css', 'install.md', 'MANIFEST.md', 'DESIGN.md', 'tokens.json', key]) {
    assert.ok(typeof files[p] === 'string' && files[p].length > 0, `${p} missing`)
  }
})

test('the skill is deterministic: same inputs, same bytes', () => {
  assert.equal(skillOf(['bootstrap', 'openprops']).md, skillOf(['bootstrap', 'openprops']).md)
})
