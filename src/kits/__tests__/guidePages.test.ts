import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { pages, GUIDES } from '../../../scripts/guide-pages.mjs'
import LINKS from '../../site/links.json'

const pub = (p: string) => new URL(`../../../public/${p}`, import.meta.url)

describe('the guides (rerun scripts/guide-pages.mjs when this fails)', () => {
  for (const [rel, html] of pages()) {
    it(`/${rel} is current and carries no em-dash`, () => {
      expect(readFileSync(pub(rel), 'utf8')).toBe(html)
      expect(html).not.toMatch(/—/)
    })
  }
  it('every guide is in the footer, the sitemap and llms.txt', () => {
    const footer = LINKS.columns.find((c) => c.title === 'Guides')!.links as Array<{ href: string }>
    const sitemap = readFileSync(pub('sitemap.xml'), 'utf8')
    const llms = readFileSync(pub('llms.txt'), 'utf8')
    for (const g of GUIDES) {
      expect(footer.map((l) => l.href)).toContain(`/${g.slug}/`)
      expect(sitemap).toContain(`https://uisandbox.org/${g.slug}/`)
      expect(llms).toContain(`https://uisandbox.org/${g.slug}/`)
    }
  })
})

describe('the IndexNow key (scripts/indexnow.mjs, decision 231)', () => {
  it('is one public/<32 hex>.txt that holds its own name', () => {
    const keys = readdirSync(new URL('../../../public/', import.meta.url)).filter((f) => /^[0-9a-f]{32}\.txt$/.test(f))
    expect(keys).toHaveLength(1)
    const key = keys[0]!
    expect(readFileSync(pub(key), 'utf8').trim()).toBe(key.slice(0, -4))
  })
})
