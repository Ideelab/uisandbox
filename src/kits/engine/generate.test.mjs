/* node --test generate.test.mjs — the fast checks on the package's SHAPE.
 * Whether it actually builds is build-proof.mjs; that one needs the network. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { hexToOklch } from './color.mjs'
import { generate, collisions, section, auditContrast } from './generate.mjs'
import { MAP } from './roles.mjs'

const ALL = Object.keys(MAP)
const KITS = Object.fromEntries(ALL.map((id) => [id, JSON.parse(readFileSync(`kits/${id}.json`, 'utf8'))]))
const VALUES = { brand: '#0B6E8A', onBrand: '#ffffff', page: '#F7F9FA', surface: '#FFFFFF',
  ink: '#16181C', inkMuted: '#5C6B72', line: '#DFE2E7', radius: '12px', baseText: '1rem' }

test('every kit gets a block, in the form that kit reads', () => {
  const f = generate(VALUES, ALL, KITS)
  const css = f['theme.css']
  assert.match(css, /@theme \{/, 'Tailwind takes @theme')
  assert.match(css, /@plugin "daisyui\/theme" \{/, 'daisyUI takes a named @plugin theme')
  assert.match(css, /--bs-body-bg: #F7F9FA/, 'Bootstrap takes its own --bs-* names')
  assert.match(css, /--md-sys-color-primary: #0B6E8A/, 'Material takes the seed')
  assert.match(css, /--primary: #0B6E8A/, 'shadcn takes its unprefixed semantics')
})

test('a kit with no emitter is refused, never shipped as an empty theme', () => {
  const fake = { ...KITS, ghost: { id: 'ghost', name: 'Ghost', modes: { light: {} } } }
  const withMap = { ...MAP }
  assert.throws(() => generate(VALUES, ['tailwind', 'ghost'], fake), /no role map for kit "ghost"/)
})

test('the kits that need more than CSS get their extra file', () => {
  const f = generate(VALUES, ['bootstrap', 'shadcn'], KITS)
  assert.ok(f['_custom.scss'], 'Bootstrap needs a Sass entry point for its brand')
  assert.match(f['_custom.scss'], /\$primary: #0B6E8A;/)
  assert.match(f['_custom.scss'], /@import "bootstrap\/scss\/bootstrap"/)
  assert.ok(f['components.json'], 'shadcn is driven by components.json')
  assert.equal(JSON.parse(f['components.json']).tailwind.cssVariables, true)
})

test('the manifest states every kind of thing that could not be done', () => {
  const m = generate(VALUES, ALL, KITS)['MANIFEST.md']
  assert.match(m, /Bootstrap · brand\*\*: not settable at runtime/, 'needsBuild is named')
  assert.match(m, /Material 3 · .*: computed by the kit/, 'derived is named')
  assert.match(m, /daisyUI · inkMuted, line/, 'unroutable is named')
  assert.match(m, /Tailwind CSS · .*were ADDED/, 'added is named')
  /* and the licences come from the packages, not from anyone's memory */
  assert.match(m, /\| Material 3 \| 2\.5\.0 \| Apache-2\.0 \|/)
  assert.match(m, /\| Tailwind CSS \| [\d.]+ \| MIT \|/)
})

test('a clean run says so rather than printing an empty section', () => {
  const m = generate({ radius: '12px' }, ['shadcn'], KITS)['MANIFEST.md']
  assert.match(m, /Nothing\. Every value reached every kit you enabled\./)
})

test('nothing in the package is a value we invented', () => {
  const f = generate(VALUES, ALL, KITS)
  const set = new Set(Object.values(VALUES).map((v) => v.toLowerCase()))
  /* In the LIGHT blocks every colour literal is one the user set. In the dark
     blocks they are derived, so the check there is that each one still carries
     the hue of the value it came from — a derived colour, never an invented
     one. A dark block that quietly introduced a new hue would be us picking a
     colour, which is the one thing this tool may not do. */
  const light = f['theme.css'].split(/^[.:@[][^\n]*\bdark\b[^\n]*\{$/m)[0]
  for (const m of light.matchAll(/#[0-9a-f]{3,8}\b/gi)) {
    assert.ok(set.has(m[0].toLowerCase()), `${m[0]} is in the light half but nobody set it`)
  }
  const hues = [...set].map((v) => hexToOklch(v)[2])
  for (const m of f['theme.css'].matchAll(/#[0-9a-f]{6}\b/gi)) {
    if (set.has(m[0].toLowerCase())) continue
    const [, c, h] = hexToOklch(m[0])
    if (c < 0.02) continue                       // a grey has no hue to match
    assert.ok(hues.some((x) => Math.min(Math.abs(x - h), 360 - Math.abs(x - h)) < 12),
      `${m[0]} is in the package with a hue nobody chose`)
  }
})

test('a theme block that REPLACES carries the kit\'s own defaults underneath', () => {
  const css = generate(VALUES, ['daisyui'], KITS)['theme.css']
  /* --border is daisyUI's border WIDTH, and their checkbox is
     `border: var(--border) solid …`. Emitting only our routed values dropped it,
     the width fell to zero, and every checkbox on the wall vanished. */
  assert.match(css, /--border:/, 'a replacing theme must carry what it does not override')
  assert.match(css, /--depth:/)
  assert.match(css, /--color-primary: #0B6E8A/, 'and our value still wins')
  const theirs = Object.keys(KITS.daisyui.modes.light)
  for (const v of theirs) assert.ok(css.includes(v + ':'), `${v} went missing from a theme that replaces the theme`)
  /* And not only custom properties. Without color-scheme the browser falls back
     to its own preference: the hero shot came out dark, wearing daisyUI's
     factory purple, on a page whose whole claim is that your values won. */
  assert.match(css, /color-scheme: light;/)
})

test('a name two kits both use is reported, not left to load order', () => {
  const f = generate(VALUES, ['shadcn', 'daisyui'], KITS)
  const clash = f._collisions.find((c) => c.variable === '--border')
  assert.ok(clash, 'shadcn writes --border as a colour; daisyUI reads it as a width')
  assert.equal(clash.written, 'shadcn')
  assert.equal(clash.read, 'daisyui')
  assert.match(clash.theirValue, /px|rem/, "daisyUI's --border is a length")
  assert.match(f['MANIFEST.md'], /Names two kits both use/)
  assert.match(f['MANIFEST.md'], /Load their stylesheets in separate scopes/)
})

test('one kit alone has nothing to collide with', () => {
  assert.deepEqual(generate(VALUES, ['daisyui'], KITS)._collisions, [])
  assert.doesNotMatch(generate(VALUES, ['daisyui'], KITS)['MANIFEST.md'], /Names two kits/)
})

test('each kit can be taken on its own, without the others leaking in', () => {
  const f = generate(VALUES, ['shadcn', 'daisyui'], KITS)
  assert.doesNotMatch(f._blocks.daisyui, /--primary:/, "shadcn's variables must not be in daisyUI's block")
  assert.doesNotMatch(f._blocks.shadcn, /@plugin/, "daisyUI's plugin block must not be in shadcn's")
})

test('install.md says the one thing that makes daisyUI apply at all', () => {
  const md = generate(VALUES, ['daisyui'], KITS)['install.md']
  assert.match(md, /data-theme="yourkit"/, 'without it daisyUI\'s dark theme wins on a dark OS')
  assert.match(md, /prefersdark/, 'and the reason has to be in the file, not in our heads')
  assert.match(generate(VALUES, ['daisyui'], KITS)['theme.css'], /SET data-theme/)
})

test("shadcn's variables are bridged into Tailwind's namespace, or nothing reads them", () => {
  const css = generate(VALUES, ['shadcn'], KITS)._blocks.shadcn
  assert.match(css, /@theme inline \{/, 'shadcn needs the bridge its own globals.css ships')
  assert.match(css, /--color-primary: var\(--primary\)/)
  assert.match(css, /--color-border: var\(--border\)/)
  assert.match(css, /--radius-lg: var\(--radius\)/)
  /* the semantic block is still there too — the bridge is in ADDITION */
  assert.match(css, /:root \{[\s\S]*--primary: #0B6E8A/)
  /* and we must not bridge --radius as if it were a colour */
  assert.doesNotMatch(css, /--color-radius/)
})

test('the Sass file is valid Sass, or it takes the whole build down with it', () => {
  /* A placeholder here is not a comment, it is a syntax error. One unset
     semantic colour wrote `$success: /* set me *\/;`, the Sass build failed,
     buildCss fell back to Bootstrap's shipped stylesheet, and the entire
     preview showed its factory blue while the note claimed we had compiled it. */
  for (const values of [{ brand: '#0b6e8a' }, { brand: '#0b6e8a', danger: '#7b1fa2' }, { radius: '10px' }]) {
    const scss = generate(values, ['bootstrap'], KITS)['_custom.scss']
    assert.doesNotMatch(scss, /set me/, 'a placeholder in Sass is a syntax error, not a note')
    for (const line of scss.split('\n').filter((l) => l.startsWith('$'))) {
      assert.match(line, /^\$[a-z-]+:\s*\S+;/, `not valid Sass: ${line}`)
    }
  }
})

test('a kit whose variables live only in our file gets its dark defaults too', () => {
  /* shadcn's components read --muted, --secondary and --accent, and nothing but
     the file we generate defines them. A dark block with only the seven names
     we route leaves the rest at their LIGHT value inside .dark — which showed up
     as a near-white avatar with near-white initials in it. */
  const ids = ['tailwind', 'shadcn']
  const kits = Object.fromEntries(ids.map((id) => [id, JSON.parse(readFileSync(`kits/${id}.json`, 'utf8'))]))
  const block = generate(VALUES, ids, kits)._blocks.shadcn
  const dark = block.slice(block.indexOf('.dark'))
  for (const name of ['--muted', '--secondary', '--accent', '--destructive']) {
    assert.match(dark, new RegExp(`\\${name}:`), `${name} keeps its light value in the dark`)
  }
})

test('the download says which of its own variables nothing reads', () => {
  const ids = ['tailwind', 'mantine']
  const kits = Object.fromEntries(ids.map((id) => [id, JSON.parse(readFileSync(`kits/${id}.json`, 'utf8'))]))
  const measured = [{ kit: 'mantine', name: 'Mantine', role: 'Corner radius',
    names: ['--mantine-radius-md'], instead: ['--mantine-radius-default'], tokensOnly: false }]

  const withIt = generate(VALUES, ids, kits, { unread: measured })['MANIFEST.md']
  assert.match(withIt, /## Variables in here that nothing reads/)
  assert.match(withIt, /Mantine · Corner radius/)
  assert.match(withIt, /--mantine-radius-default/, 'it has to say what the kit reads instead')

  /* and a stack none of it applies to says so, rather than carrying an empty
     heading that reads like a hole */
  const other = generate(VALUES, ['tailwind'], kits, { unread: measured })['MANIFEST.md']
  assert.match(section(other, '## Variables in here that nothing reads').length ? 'x' : 'Nothing', /Nothing/)
  assert.match(other, /Every variable this theme writes is read/)
})

test('the contrast audit names the line for the job that makes it a requirement', () => {
  /* Almost every kit's own default border fails 3:1 against its own surface,
     and a failure nobody can read is a failure nobody acts on. A card's border
     identifies nothing — the card has a background. The line round a text field
     is the only thing that says where the field is, which is what 1.4.11 puts
     at 3:1, so the pair is named for that. */
  const audit = auditContrast({ ...VALUES, line: '#dfe2e7', surface: '#ffffff' })
  const pair = audit.find((p) => p.fg === 'line' && p.bg === 'surface')
  assert.ok(pair, 'the line is not audited against the surface at all')
  assert.equal(pair.min, 3)
  assert.match(pair.label, /field/, 'the label has to say what the line is for')
  assert.equal(pair.passes, false, 'a 1.3:1 border has to read as a failure, not be rounded away')
})

test('the manifest says what the stack is really made of, in four bands', () => {
  /* "shadcn on Tailwind" hid the two things that make a stack a stack: shadcn
     BRINGS the Radix behaviour package and its own tokens, and leans on
     Tailwind for the engine. Read from what the packages declare, not typed. */
  const ids = ['tailwind', 'shadcn']
  const kits = Object.fromEntries([...ids, 'openprops', 'daisyui'].map((id) => [id, JSON.parse(readFileSync(`kits/${id}.json`, 'utf8'))]))
  const md = generate(VALUES, ids, kits)['MANIFEST.md']
  const bands = section(md, '## What this stack is made of')
  assert.equal(bands.length, 4, 'a stack has four bands')
  assert.match(bands[0], /radix-ui/, 'the behaviour shadcn brings is not named')
  assert.match(bands[0], /shadcn\/ui brings/, 'it has to say who brings it')
  assert.match(bands[1], /Tailwind CSS/)
  assert.match(bands[3], /shadcn\/ui/)

  /* and bottom-first, whatever order the ids arrive in */
  const three = generate(VALUES, ['openprops', 'daisyui', 'tailwind'], kits)['MANIFEST.md']
  const tokens = section(three, '## What this stack is made of')[2]
  assert.match(tokens, /daisyUI, over Open Props and Tailwind CSS/, `read as: ${tokens}`)

  /* a stack that brings none says so, because that is the thing you have to
     write yourself and nobody else prints it */
  const plain = section(generate(VALUES, ['tailwind', 'daisyui'], kits)['MANIFEST.md'], '## What this stack is made of')
  assert.match(plain[0], /nothing here brings any/)
})
