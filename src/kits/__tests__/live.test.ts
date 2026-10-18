import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
// @ts-expect-error — a plain .mjs build script, no types
import { buildLive } from '../../../scripts/live-build.mjs'

const root = join(import.meta.dirname, '..', '..', '..')
const src = readFileSync(join(root, 'public/live.js'), 'utf8')

/* The invariants of UIcockpit's live.test.mjs, carried to UISandbox's bridge.
 * That test read live.js and UIcockpit's page; this one reads the bridge the
 * sandbox serves and the page half that talks to it. */
describe('the bridge', () => {
  it('parses, and is inert outside a frame', () => {
    expect(() => new Function(src)).not.toThrow()
    expect(src).toMatch(/window\.parent === window\) return/)
  })

  it("lets only UISandbox's own origins drive it", () => {
    const m = src.match(/var ALLOW = (\/.+\/)\n/)
    expect(m, 'ALLOW regex not found').toBeTruthy()
    const allow = new Function('return ' + m![1])() as RegExp
    for (const ok of ['https://uisandbox.org', 'https://www.uisandbox.org', 'http://localhost:5190', 'http://127.0.0.1:8765', 'https://localhost']) expect(allow.test(ok), ok).toBe(true)
    // plain http of the real domain, a look-alike suffix, a look-alike host
    for (const no of ['https://evil.example', 'http://uisandbox.org', 'https://uisandbox.org.evil.example', 'https://notlocalhost:3000', 'https://uicockpit.com']) expect(allow.test(no), no).toBe(false)
  })

  it('answers the app\'s values only to the origin that asked, never to *', () => {
    const read = src.slice(src.indexOf("'uicockpit:read'"), src.indexOf("'uicockpit:read'") + 200)
    expect(read).toMatch(/values: read\(e\.data\.names\) \}, e\.origin\)/)
    expect(read).not.toMatch(/'\*'/)
  })

  it('reads only custom properties, and only by name', () => {
    expect(src).toMatch(/if \(!\/\^--\[\\w-\]\+\$\/\.test\(n\)\) continue/)
  })

  it('names the messages the page half sends and expects', () => {
    const page = readFileSync(join(root, 'src/kits/bridge.ts'), 'utf8')
    for (const name of ['uicockpit:ready', 'uicockpit:read', 'uicockpit:values']) {
      expect(src.includes(name) && page.includes(name), `${name} missing on one side`).toBe(true)
    }
  })

  it('can name only kits the engine knows', () => {
    const ids = [...src.matchAll(/return '([a-z]+)'/g)].map((m) => m[1])
    const known = ['tailwind', 'daisyui', 'shadcn', 'bootstrap', 'material', 'radix', 'mantine', 'antd', 'openprops']
    expect([...new Set(ids)].sort()).toEqual(known.sort())
  })

  it('is exactly what its template and detect.mjs build today', () => {
    // One set of kit rules, not two: if detect.mjs changes and public/live.js
    // is not rebuilt, a dropped build and a running app disagree.
    expect(src).toBe(buildLive())
  })
})
