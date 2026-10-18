import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

// absolutise() lives in the service worker, which is plain JS served as is.
// Lifted out of the file itself, so this tests the code that ships.
const sw = readFileSync(new URL('../../../public/sw.js', import.meta.url), 'utf8')
const start = sw.indexOf('function absolutise(')
const end = sw.indexOf('\n}\n', start) + 2
const absolutise = runInNewContext(`(${sw.slice(start, end)})`, { URL }) as (css: string, base: string) => string

const BASE = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css'

describe('absolutise (sw.js)', () => {
  it('resolves a relative url() against the sheet, not against /__ext/', () => {
    expect(absolutise('src:url("fonts/bootstrap-icons.woff2?x") format("woff2")', BASE))
      .toBe('src:url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/fonts/bootstrap-icons.woff2?x") format("woff2")')
  })
  it('handles single quotes, no quotes, ../ and root-relative paths', () => {
    expect(absolutise("a{background:url('../img/a.png')}", BASE)).toBe("a{background:url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/img/a.png')}")
    expect(absolutise('a{background:url( b.svg )}', BASE)).toBe('a{background:url(https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/b.svg)}')
    expect(absolutise('a{background:url(/c.png)}', BASE)).toBe('a{background:url(https://cdn.jsdelivr.net/c.png)}')
  })
  it('resolves @import in both forms', () => {
    expect(absolutise('@import "x.css";', BASE)).toBe('@import "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/x.css";')
    expect(absolutise('@import url(y.css);', BASE)).toBe('@import url(https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/y.css);')
  })
  it('leaves data:, #fragment and already-absolute references as they are', () => {
    const css = 'a{b:url("data:image/svg+xml,%3Csvg%3E");c:url(#g);d:url(https://x.test/e.woff2);f:url(HTTP://y.test/z)}'
    expect(absolutise(css, BASE)).toBe(css)
  })
})
