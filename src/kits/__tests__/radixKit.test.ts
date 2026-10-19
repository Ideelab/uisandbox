import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..', '..', '..')
const dir = mkdtempSync(join(tmpdir(), 'radix-kit-'))
execFileSync('unzip', ['-q', '-o', join(root, 'public/kits/radix.zip'), '-d', dir])
const first = readFileSync(join(dir, 'radix/index.html'), 'utf8')

/* The Radix kit as it ships. Its accent is on <html>, so an element that sets
 * no data-accent-color of its own wears the accent: a danger piece that
 * forgets it is drawn in indigo, not red. */
describe('the Radix kit build', () => {
  const tags = (tone: string) => [...first.matchAll(new RegExp(`<[a-z]+\\b[^>]*data-tone="${tone}"[^>]*>`, 'g'))].map((m) => m[0])

  it('draws every danger piece in red, as Radix does a destructive action', () => {
    const danger = tags('danger')
    expect(danger.length).toBeGreaterThanOrEqual(3)
    for (const t of danger) expect(t, t).toContain('data-accent-color="red"')
  })

  it('leaves the brand pieces on the theme accent, so the Brand knob still moves them', () => {
    expect(first).toMatch(/<html[^>]*data-accent-color="indigo"/)
    const brand = tags('brand')
    expect(brand.length).toBeGreaterThan(0)
    for (const t of brand) expect(t, t).not.toContain('data-accent-color=')
  })
})
