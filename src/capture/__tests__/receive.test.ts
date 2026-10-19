// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { Script } from 'node:vm'
import { bookmarklet, captureArchive, readCapture, sanitizeHtml, screenPath } from '../receive'
import { grab } from '../grab'
import { buildProject } from '../../sandbox/project'

const msg = (over: Record<string, unknown> = {}) => ({
  type: 'uisandbox:capture', v: 1, href: 'https://app.example/ideelab/dash', title: 'Dash',
  viewport: { w: 1280, h: 900, dpr: 2 }, html: '<!DOCTYPE html><html><head></head><body>hi</body></html>',
  files: [{ path: '_c/abc12.css', blob: new Blob(['a{color:#123456}'], { type: 'text/css' }) }],
  refused: [], stats: { sheets: 1 }, captureMs: 12, sentAt: Date.now(), ...over,
})

describe('readCapture', () => {
  it('takes a well-formed screen from the origin it says it was taken at', () => {
    const s = readCapture(msg(), 'https://app.example')
    expect(typeof s).toBe('object')
    if (typeof s === 'string') return
    expect(s.files).toHaveLength(1)
    expect(s.stats.sheets).toBe(1)
    expect(s.stats.assets).toBe(0)
  })
  it('refuses a sender whose origin is not the page it describes', () => {
    expect(readCapture(msg(), 'https://evil.example')).toMatch(/came from https:\/\/evil\.example/)
  })
  it('refuses a file name that is not a captured file', () => {
    for (const path of ['../index.html', '_c/../../x.css', 'index.html', '_c/a/b.css']) {
      expect(readCapture(msg({ files: [{ path, blob: new Blob(['x']) }] }), 'https://app.example')).toMatch(/not a captured file/)
    }
    expect(readCapture(msg({ files: [{ path: '_c/abc12.css', blob: 'text' }] }), 'https://app.example')).toMatch(/not a captured file/)
  })
  it('ignores what is not a capture', () => {
    expect(readCapture({ type: 'uisandbox:ping' }, 'https://app.example')).toBe('not a capture message')
    expect(readCapture(null, 'https://app.example')).toBe('not a capture message')
  })
})

describe('sanitizeHtml', () => {
  it('removes everything that runs, in shadow templates too', () => {
    const out = sanitizeHtml(`<!DOCTYPE html><html><head><base href="https://x/"><meta http-equiv="refresh" content="0;url=https://x"><meta charset="utf-8"><style>a{color:red}</style><script>alert(1)</script></head>
      <body onload="x()"><a href="javascript:alert(1)" onclick="y()">a</a><iframe src="https://x" srcdoc="<script>1</script>"></iframe>
      <my-card><template shadowrootmode="open"><script>z()</script><b onmouseover="w()">in</b><style>b{color:#111}</style></template></my-card></body></html>`)
    expect(out.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(out).not.toMatch(/<script|onload|onclick|onmouseover|javascript:|<base|refresh|srcdoc|src="https/)
    expect(out).toMatch(/<meta charset="utf-8">/)
    expect(out).toMatch(/<style>a\{color:red\}<\/style>/)
    expect(out).toMatch(/<template shadowrootmode="open"><b>in<\/b><style>b\{color:#111\}<\/style><\/template>/)
  })
  it('keeps a quirks-mode page in quirks mode', () => {
    expect(sanitizeHtml('<html><body>q</body></html>').startsWith('<!DOCTYPE')).toBe(false)
  })
})

describe('screenPath', () => {
  it('files a screen under the path it was taken at, a second take beside it', () => {
    const taken = new Set<string>()
    const a = screenPath('https://app.example/', taken); taken.add(a)
    const b = screenPath('https://app.example/ideelab/dashboard?tab=2#x', taken); taken.add(b)
    const c = screenPath('https://app.example/ideelab/dashboard', taken); taken.add(c)
    expect([a, b, c]).toEqual(['index.html', 'ideelab/dashboard/index.html', 'ideelab/dashboard/take-2/index.html'])
    expect(screenPath('https://app.example/', taken)).toBe('take-2/index.html')
    expect(screenPath('https://app.example/%2e%2e/a b/x.html', new Set())).toBe('a-b/x/index.html')
  })
})

describe('a capture as a project', () => {
  it('builds through buildProject like a dropped build: every screen, the shared sheet tokenised', async () => {
    const pages = new Map([
      ['index.html', '<!DOCTYPE html><html><head><link rel="stylesheet" href="/_c/abc12.css"></head><body><p style="color:#ff0000">x</p></body></html>'],
      ['ideelab/dashboard/index.html', '<!DOCTYPE html><html><head><link rel="stylesheet" href="/_c/abc12.css"></head><body>y</body></html>'],
    ])
    const files = new Map([['_c/abc12.css', new Blob(['a{color:#123456;border-radius:6px}'], { type: 'text/css' })]])
    const project = await buildProject(captureArchive('app.example', pages, files), { root: '' })
    expect(project.platform.renders).toBe(true)
    expect(project.base).toBe('')
    expect(project.screens.map((s) => s.label)).toEqual(['/', '/ideelab/dashboard'])
    expect(await project.rewritten.get('_c/abc12.css')!.blob.text()).toMatch(/var\(--us-v/)
  })
})

describe('the bookmarklet', () => {
  it('is the capture function, whole, called with this origin', () => {
    const href = bookmarklet(grab.toString(), 'https://uisandbox.org')
    expect(href.startsWith('javascript:')).toBe(true)
    const code = decodeURIComponent(href.slice('javascript:'.length))
    expect(code).toMatch(/\("https:\/\/uisandbox\.org"\)$/)
    // It compiles on its own (compiled, never run): nothing from this module comes with it.
    expect(() => new Script(code)).not.toThrow()
    expect(code).not.toMatch(/\.innerHTML\s*=|\bimport\s*\(|^\s*import\s/m)
  })
})
